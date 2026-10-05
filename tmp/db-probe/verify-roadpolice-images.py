"""
Independent check: for every PDF question, render what the PDF actually shows
between the question stem and its answer, and compare it with the image the
store links to that question.
"""
from __future__ import annotations

import io
import json
import re
import sys
from pathlib import Path

import numpy as np
import pymupdf
from PIL import Image

sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parents[2]
PDF_DIR = ROOT / "tmp" / "roadpolice-pdfs"
STORE = ROOT / "backend" / "data" / "exam-questions.store.json"
UPLOAD = ROOT / "backend" / "upload"
PDF_TOPIC = {1: "3", 2: "2", 3: "6", 4: "8", 5: "7", 6: "10", 7: "11", 8: "4", 9: "9", 10: "1"}
Q_RE = re.compile(r"^(\d+)\.")


def thumb(img: Image.Image) -> np.ndarray:
    return np.asarray(img.convert("L").resize((96, 48), Image.BILINEAR), dtype=np.float32)


def pdf_figures(pdf_no: int) -> dict[int, list[np.ndarray]]:
    """Question number -> rendered figure regions (as drawn on the page)."""
    doc = pymupdf.open(PDF_DIR / f"{pdf_no}.pdf")
    out: dict[int, list[np.ndarray]] = {}
    current = None
    for page in doc:
        blocks = sorted(page.get_text("dict")["blocks"], key=lambda b: (b["bbox"][1], b["bbox"][0]))
        for b in blocks:
            if b["type"] == 1:
                pix = page.get_pixmap(clip=pymupdf.Rect(b["bbox"]), matrix=pymupdf.Matrix(1.5, 1.5), alpha=False)
                img = Image.open(io.BytesIO(pix.tobytes("png")))
                out.setdefault(current, []).append(thumb(img))
                continue
            text = "".join(s["text"] for l in b["lines"] for s in l["spans"]).strip()
            if b["bbox"][0] < 58 and b["bbox"][1] < 800:
                m = Q_RE.match(text)
                if m:
                    current = int(m.group(1))
    doc.close()
    return out


def main() -> None:
    store = json.loads(STORE.read_text(encoding="utf-8"))
    by_topic: dict[str, list[dict]] = {}
    for q in store["questions"]:
        if q.get("category") != "signs" and q.get("topicId") in PDF_TOPIC.values() and int(q["id"]) >= 2371:
            by_topic.setdefault(q["topicId"], []).append(q)
    for rows in by_topic.values():
        rows.sort(key=lambda q: int(q["id"]))

    report = []
    totals = {"checked": 0, "ok": 0, "mismatch": 0, "missing_in_store": 0, "extra_in_store": 0}
    for pdf_no, tid in PDF_TOPIC.items():
        figs = pdf_figures(pdf_no)
        rows = by_topic[tid]
        stored_thumbs = {}
        for idx, q in enumerate(rows, start=1):
            url = q.get("imageUrl")
            if url:
                stored_thumbs[idx] = thumb(Image.open(UPLOAD / url.removeprefix("/upload/")))
        for idx in range(1, len(rows) + 1):
            pdf_imgs = figs.get(idx, [])
            stored = stored_thumbs.get(idx)
            if pdf_imgs and stored is None:
                totals["missing_in_store"] += 1
                report.append(f"pdf {pdf_no} q{idx}: PDF has figure, store has none")
                continue
            if stored is not None and not pdf_imgs:
                totals["extra_in_store"] += 1
                report.append(f"pdf {pdf_no} q{idx}: store has figure, PDF has none")
                continue
            if stored is None:
                continue
            totals["checked"] += 1
            diff = min(float(np.abs(stored - p).mean()) for p in pdf_imgs)
            if diff > 12:
                # Which PDF question does the stored image actually look like?
                best = min(
                    ((float(np.abs(stored - p).mean()), n) for n, ps in figs.items() if n for p in ps),
                    default=(None, None),
                )
                totals["mismatch"] += 1
                report.append(
                    f"pdf {pdf_no} q{idx} (id {rows[idx-1]['id']}): diff {diff:.1f}; "
                    f"stored image best matches PDF q{best[1]} (diff {best[0]:.1f})"
                )
            else:
                totals["ok"] += 1
    (PDF_DIR / "image-verify-report.txt").write_text("\n".join(report) + "\n", encoding="utf-8")
    print(json.dumps(totals))
    print("\n".join(report[:40]))


if __name__ == "__main__":
    main()
