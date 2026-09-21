/**
 * Safe merge of VIU portal hy/en/ru into exam-questions.store.json.
 *
 * Strategy:
 * 1. Match store question → portal HY row by soft Armenian text.
 * 2. Take EN/RU only when same group+order has matching option count AND
 *    matching correctIndex across locales (rejects desynced portal pairs).
 * 3. Remap EN/RU options into the store's AM option order.
 * 4. Copy missing images from ../viu.am/public when needed.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const VIVA_ROOT = path.resolve(__dirname, "../..");
const VIU_PUBLIC = path.resolve(VIVA_ROOT, "../viu.am/public");
const STORE_PATH = path.join(VIVA_ROOT, "backend/data/exam-questions.store.json");
const BACKUP_PATH = path.join(
  VIVA_ROOT,
  "backend/data/exam-questions.store.backup-before-i18n-merge.json",
);
const EXPORT_PATH = path.join(__dirname, "viu-questions-export.json");
const OUT_DIR = path.join(VIVA_ROOT, "backend/upload/questions");

function soft(s) {
  return String(s || "")
    .replace(/\u00a0/g, " ")
    .normalize("NFC")
    .replace(/եւ/g, "և")
    .replace(/[«»""„“”']/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/[։׃:`]/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const exportPayload = JSON.parse(fs.readFileSync(EXPORT_PATH, "utf8"));
const sourceStorePath = fs.existsSync(BACKUP_PATH) ? BACKUP_PATH : STORE_PATH;
const store = JSON.parse(fs.readFileSync(sourceStorePath, "utf8"));

/** group:order → { hy, en, ru } */
const byKey = new Map();
for (const q of exportPayload.questions) {
  const key = `${q.group}:${q.order}`;
  if (!byKey.has(key)) byKey.set(key, {});
  const opts = [...(q.options || [])].sort((a, b) => a.order - b.order).map((o) => o.text);
  byKey.get(key)[q.locale] = {
    text: q.text,
    options: opts,
    explanation: q.explanation || null,
    correctIndex: q.correctIndex,
    imagePath: q.imagePath || null,
    group: q.group,
    order: q.order,
  };
}

function isAlignedBundle(locs) {
  if (!locs?.hy) return false;
  const hy = locs.hy;
  const langs = ["en", "ru"].filter((l) => locs[l]);
  if (!langs.length) return { hyOnly: true, locs };
  for (const l of langs) {
    const row = locs[l];
    if (!row) continue;
    if (row.options.length !== hy.options.length) return false;
    if (row.correctIndex !== hy.correctIndex) return false;
  }
  return { hyOnly: false, locs };
}

/** Index aligned (or hy-only) bundles by soft HY text */
const byAmSoft = new Map();
let alignedCount = 0;
let hyOnlyCount = 0;
let rejectedMisaligned = 0;

for (const locs of byKey.values()) {
  const aligned = isAlignedBundle(locs);
  if (!aligned) {
    rejectedMisaligned += 1;
    // Still index HY for image + keep AM; skip en/ru
    if (locs.hy) {
      const k = soft(locs.hy.text);
      if (k) {
        if (!byAmSoft.has(k)) byAmSoft.set(k, []);
        byAmSoft.get(k).push({ hyOnly: true, locs: { hy: locs.hy } });
        hyOnlyCount += 1;
      }
    }
    continue;
  }
  const k = soft(locs.hy.text);
  if (!k) continue;
  if (!byAmSoft.has(k)) byAmSoft.set(k, []);
  byAmSoft.get(k).push(aligned);
  if (aligned.hyOnly) hyOnlyCount += 1;
  else alignedCount += 1;
}

function pickCandidate(cands, storeQ) {
  if (!cands?.length) return null;
  if (cands.length === 1) return cands[0];
  const amOpts = storeQ.options?.am || [];
  const correctAm = soft(amOpts[storeQ.correctIndex]);
  const scored = cands.map((c) => {
    const hyOpts = c.locs.hy.options || [];
    let score = 0;
    if (hyOpts.length === amOpts.length) score += 3;
    if (correctAm && soft(hyOpts[c.locs.hy.correctIndex]) === correctAm) score += 8;
    if (!c.hyOnly) score += 2;
    return { c, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].c;
}

function remapOptionsToStoreOrder(storeAmOpts, hyOpts, langOpts) {
  if (!Array.isArray(langOpts) || langOpts.length !== hyOpts.length) return null;
  if (storeAmOpts.length !== hyOpts.length) return null;
  const byHy = new Map();
  hyOpts.forEach((t, i) => byHy.set(soft(t), langOpts[i]));
  const out = storeAmOpts.map((t) => byHy.get(soft(t)));
  if (out.some((x) => typeof x !== "string")) return null;
  return out;
}

function ensureLocalImage(imagePath) {
  if (!imagePath) return null;
  const rel = String(imagePath).replace(/^\//, "");
  const abs = path.join(VIU_PUBLIC, rel);
  if (!fs.existsSync(abs)) return null;
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const ext = path.extname(abs).toLowerCase() || ".jpg";
  const hash = crypto.createHash("sha256").update(`viu:${rel}`).digest("hex").slice(0, 32);
  const filename = `exam-viu-${hash}${ext === ".jpeg" ? ".jpg" : ext}`;
  const dest = path.join(OUT_DIR, filename);
  if (!fs.existsSync(dest)) fs.copyFileSync(abs, dest);
  return `/upload/questions/${filename}`;
}

function imageExists(imageUrl) {
  if (!imageUrl) return false;
  const m = String(imageUrl).match(/^\/upload\/(.+)$/);
  if (!m) return false;
  return fs.existsSync(path.join(VIVA_ROOT, "backend/upload", m[1]));
}

let matched = 0;
let withEnRu = 0;
let hyOnlyMatched = 0;
let unmatched = 0;
let textUpdated = 0;
let optionsUpdated = 0;
let imagesAdded = 0;

for (const q of store.questions) {
  if (q.category === "signs") continue;

  const cand = pickCandidate(byAmSoft.get(soft(q.text?.am)) || [], q);
  if (!cand) {
    unmatched += 1;
    continue;
  }
  matched += 1;
  const hy = cand.locs.hy;

  if (!cand.hyOnly && cand.locs.en && cand.locs.ru) {
    withEnRu += 1;
    const enRemap = remapOptionsToStoreOrder(q.options.am, hy.options, cand.locs.en.options);
    const ruRemap = remapOptionsToStoreOrder(q.options.am, hy.options, cand.locs.ru.options);

    if (q.text.en !== cand.locs.en.text) {
      q.text.en = cand.locs.en.text;
      textUpdated += 1;
    }
    if (q.text.ru !== cand.locs.ru.text) {
      q.text.ru = cand.locs.ru.text;
    }

    if (enRemap && ruRemap) {
      if (JSON.stringify(q.options.en) !== JSON.stringify(enRemap)) {
        q.options.en = enRemap;
        optionsUpdated += 1;
      }
      if (JSON.stringify(q.options.ru) !== JSON.stringify(ruRemap)) {
        q.options.ru = ruRemap;
      }
    } else if (
      hy.options.length === q.options.am.length &&
      soft(hy.options[hy.correctIndex]) === soft(q.options.am[q.correctIndex])
    ) {
      // Fall back to portal option order for all langs
      q.options.am = [...hy.options];
      q.options.en = [...cand.locs.en.options];
      q.options.ru = [...cand.locs.ru.options];
      q.correctIndex = hy.correctIndex;
      optionsUpdated += 1;
    }

    if (!q.explanation) {
      q.explanation =
        hy.explanation || cand.locs.en.explanation || cand.locs.ru.explanation || q.explanation;
    }
  } else {
    hyOnlyMatched += 1;
  }

  if (!imageExists(q.imageUrl) && hy.imagePath) {
    const local = ensureLocalImage(hy.imagePath);
    if (local) {
      q.imageUrl = local;
      imagesAdded += 1;
    }
  }
}

const tmpStore = `${STORE_PATH}.tmp`;
fs.writeFileSync(tmpStore, `${JSON.stringify(store, null, 2)}\n`, "utf8");
try {
  fs.renameSync(tmpStore, STORE_PATH);
} catch {
  fs.copyFileSync(tmpStore, STORE_PATH);
  fs.unlinkSync(tmpStore);
}

let enDiff = 0;
let enSame = 0;
let ruDiff = 0;
let ruSame = 0;
let theory = 0;
let theoryWithImg = 0;
let theoryImgOk = 0;
for (const q of store.questions) {
  if (q.category === "signs") continue;
  theory += 1;
  if ((q.text?.en || "") === (q.text?.am || "")) enSame += 1;
  else enDiff += 1;
  if ((q.text?.ru || "") === (q.text?.am || "")) ruSame += 1;
  else ruDiff += 1;
  if (q.imageUrl) {
    theoryWithImg += 1;
    if (imageExists(q.imageUrl)) theoryImgOk += 1;
  }
}

const report = {
  sourceStorePath,
  portalKeys: byKey.size,
  alignedCount,
  hyOnlyCount,
  rejectedMisaligned,
  matched,
  withEnRu,
  hyOnlyMatched,
  unmatched,
  textUpdated,
  optionsUpdated,
  imagesAdded,
  theoryAfter: { theory, enDiff, enSame, ruDiff, ruSame, theoryWithImg, theoryImgOk },
};
fs.writeFileSync(path.join(__dirname, "i18n-merge-report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
