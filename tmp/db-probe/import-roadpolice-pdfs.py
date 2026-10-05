"""
Sync the official Road Police ABC theory PDFs into exam-questions.store.json.

Questions already imported from these PDFs keep their ids (bookmarks, comments);
text, options, answer and figure are refreshed from the current PDFs by position.

Run: python tmp/db-probe/import-roadpolice-pdfs.py [--dry-run]
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path

import pymupdf

sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parents[2]
PDF_DIR = ROOT / "tmp" / "roadpolice-pdfs"
STORE_PATH = ROOT / "backend" / "data" / "exam-questions.store.json"
IMAGE_DIR = ROOT / "backend" / "upload" / "questions"
FIRST_IMPORTED_ID = 2371

# PDF number -> stored topic id (thematic cards 1..10).
PDF_TOPIC = {1: "3", 2: "2", 3: "6", 4: "8", 5: "7", 6: "10", 7: "11", 8: "4", 9: "9", 10: "1"}
SAFETY_TOPICS = {"1", "5"}

Q_NUM_RE = re.compile(r"^(\d+)\.\s*(.*)$", re.S)
ANSWER_RE = re.compile(r"^Պատ\.\s*՝\s*(\d+)\s*$")
HEADER_RE = re.compile(r"^(ԽՈՒՄԲ\s+\d+|ABC\s+կարգեր|(\d+)\s+հարց|էջ\s+\d+)")


def clean(text: str) -> str:
    text = text.replace("\u00a0", " ").replace("եւ", "և")
    text = re.sub(r"[ \t]*\n[ \t]*", " ", text)
    return re.sub(r"[ \t]{2,}", " ", text).strip()


def block_text(block: dict) -> str:
    return "\n".join("".join(s["text"] for s in l["spans"]) for l in block.get("lines", [])).strip()


def match_xref(bbox, infos) -> int | None:
    bb = pymupdf.Rect(bbox)
    best, best_area = None, 0.0
    for info in infos:
        inter = bb & pymupdf.Rect(info["bbox"])
        if inter.is_empty:
            continue
        if inter.get_area() > best_area:
            best_area, best = inter.get_area(), info.get("xref")
    return best


def parse_pdf(pdf_no: int) -> list[dict]:
    doc = pymupdf.open(PDF_DIR / f"{pdf_no}.pdf")
    questions: list[dict] = []
    current: dict | None = None
    pending: list[dict] = []
    problems: list[str] = []

    for page_index, page in enumerate(doc):
        infos = page.get_image_info(xrefs=True)
        blocks = sorted(page.get_text("dict")["blocks"], key=lambda b: (b["bbox"][1], b["bbox"][0]))
        for block in blocks:
            if block["type"] == 1:
                fig = {"page": page, "bbox": block["bbox"], "xref": match_xref(block["bbox"], infos)}
                (current["images"] if current is not None and current["answer"] is None else pending).append(fig)
                continue
            text = block_text(block)
            flat = text.replace("\n", " ")
            if not text or block["bbox"][1] > 800 or HEADER_RE.match(flat):
                continue
            if block["bbox"][0] < 58:
                m = Q_NUM_RE.match(text)
                if not m:
                    problems.append(f"p{page_index+1} stray block {flat[:60]!r}")
                    continue
                current = {"num": int(m.group(1)), "text": clean(m.group(2)), "options": [], "answer": None,
                           "images": list(pending)}
                pending.clear()
                questions.append(current)
                continue
            am = ANSWER_RE.match(flat)
            if am and current is not None:
                current["answer"] = int(am.group(1))
                continue
            m = Q_NUM_RE.match(text)
            if m and current is not None and current["answer"] is None:
                current["options"].append(clean(m.group(2)))
                continue
            problems.append(f"p{page_index+1} unclassified {flat[:60]!r}")

    if pending:
        problems.append(f"{len(pending)} figures after the last question")
    if [q["num"] for q in questions] != list(range(1, len(questions) + 1)):
        problems.append("question numbers are not 1..N")
    for q in questions:
        if not q["text"] or len(q["options"]) < 2 or q["answer"] is None or not 1 <= q["answer"] <= len(q["options"]):
            problems.append(f"q{q['num']} malformed")
        if len(q["images"]) > 1:
            problems.append(f"q{q['num']} has {len(q['images'])} figures")
    if problems:
        raise SystemExit(f"PDF {pdf_no}: " + "; ".join(problems[:10]))

    for q in questions:
        q["image_bytes"], q["image_ext"] = None, None
        if q["images"]:
            fig = q["images"][0]
            if fig["xref"]:
                ex = doc.extract_image(fig["xref"])
                q["image_bytes"] = ex["image"]
                q["image_ext"] = "." + ex["ext"].lower().replace("jpeg", "jpg")
            else:
                pix = fig["page"].get_pixmap(matrix=pymupdf.Matrix(2, 2), clip=pymupdf.Rect(fig["bbox"]), alpha=False)
                q["image_bytes"], q["image_ext"] = pix.tobytes("png"), ".png"
        del q["images"]
    doc.close()
    return questions


def save_image(pdf_no: int, num: int, data: bytes, ext: str, dry_run: bool) -> str:
    name = f"rp-{pdf_no}-{num:03d}-{hashlib.sha256(data).hexdigest()[:16]}{ext}"
    path = IMAGE_DIR / name
    if not dry_run and not path.exists():
        IMAGE_DIR.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
    return f"/upload/questions/{name}"


def main() -> None:
    dry_run = "--dry-run" in sys.argv
    store = json.loads(STORE_PATH.read_text(encoding="utf-8"))
    questions = store["questions"]

    imported: dict[str, list[dict]] = {}
    for q in questions:
        if q.get("category") != "signs" and q.get("topicId") in PDF_TOPIC.values() and str(q["id"]).isdigit() \
                and int(q["id"]) >= FIRST_IMPORTED_ID:
            imported.setdefault(q["topicId"], []).append(q)
    for rows in imported.values():
        rows.sort(key=lambda q: int(q["id"]))

    numeric = [int(q["id"]) for q in questions if str(q["id"]).isdigit()]
    next_id = max(numeric + [FIRST_IMPORTED_ID - 1]) + 1
    changes: list[str] = []
    old_images: set[str] = set()
    new_images: set[str] = set()

    for pdf_no, tid in PDF_TOPIC.items():
        parsed = parse_pdf(pdf_no)
        rows = imported.get(tid, [])
        if len(parsed) < len(rows):
            raise SystemExit(f"PDF {pdf_no} now has fewer questions ({len(parsed)} < {len(rows)}); review manually")
        category = "safety" if tid in SAFETY_TOPICS else "rules"
        for index, p in enumerate(parsed):
            image_url = save_image(pdf_no, p["num"], p["image_bytes"], p["image_ext"], dry_run) if p["image_bytes"] else None
            fields = {
                "text": {"am": p["text"], "en": p["text"], "ru": p["text"]},
                "options": {"am": p["options"], "en": list(p["options"]), "ru": list(p["options"])},
                "correctIndex": p["answer"] - 1,
                "category": category,
                "topicId": tid,
            }
            if index < len(rows):
                q = rows[index]
                what = [k for k in ("text", "options", "correctIndex") if q.get(k) != fields[k]]
                if q.get("imageUrl") != image_url:
                    what.append("image")
                    if q.get("imageUrl"):
                        old_images.add(q["imageUrl"])
                if not what:
                    continue
                changes.append(f"pdf {pdf_no} q{p['num']} (id {q['id']}): {', '.join(what)}")
                q.update(fields)
                if image_url:
                    q["imageUrl"] = image_url
                    new_images.add(image_url)
                else:
                    q.pop("imageUrl", None)
            else:
                q = {"id": str(next_id), **fields, **({"imageUrl": image_url} if image_url else {})}
                next_id += 1
                questions.append(q)
                store["meta"]["thematicCardQuestionIds"][list(PDF_TOPIC.values()).index(tid)].append(q["id"])
                changes.append(f"pdf {pdf_no} q{p['num']}: added as id {q['id']}")

    print(f"{len(changes)} changes{' (dry run)' if dry_run else ''}")
    print("\n".join(changes))
    if dry_run or not changes:
        return

    tmp = STORE_PATH.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(store, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tmp.replace(STORE_PATH)

    still_used = {q.get("imageUrl") for q in questions}
    for url in old_images - new_images - still_used:
        (IMAGE_DIR / Path(url).name).unlink(missing_ok=True)


if __name__ == "__main__":
    main()
