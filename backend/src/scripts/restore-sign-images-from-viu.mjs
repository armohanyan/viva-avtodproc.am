/**
 * Restores road-sign exam images from a sibling `viu.am` checkout into
 * `backend/upload/signs/` and rewrites `imageUrl` in the exam-questions store.
 *
 * Expects:
 *   ../viu.am/public/signs/...
 *   ../viu.am/src/lib/road-signs-data.ts
 *
 * Run from repo root or backend/:
 *   node backend/src/scripts/restore-sign-images-from-viu.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VIVA_ROOT = path.resolve(__dirname, "../../..");
const VIU_ROOT = path.resolve(VIVA_ROOT, "../viu.am");
const STORE_PATH = path.join(VIVA_ROOT, "backend/data/exam-questions.store.json");
const OUT_DIR = path.join(VIVA_ROOT, "backend/upload/signs");
const DATA_TS = path.join(VIU_ROOT, "src/lib/road-signs-data.ts");
const PUBLIC_ROOT = path.join(VIU_ROOT, "public");

const SIGN_CATEGORY_SLUGS = [
  "nakhazgushacvog-nshanner",
  "arravelutyan-nshanner",
  "argelogh-nshanner",
  "teladrogh-nshanner",
  "hatuk-teladranqi-nshanner",
  "teghekatvutyan-nshanner",
  "spasarkman-nshanner",
  "lracucich-teghekatvutyan",
  "transportayin-mijotsner-chanachman-nshanner",
  "hushumnner",
];

if (!fs.existsSync(DATA_TS)) {
  console.error(`Missing viu road-signs data at ${DATA_TS}`);
  process.exit(1);
}

const store = JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
const src = fs.readFileSync(DATA_TS, "utf8");

const bySlug = new Map();
let curSlug = null;
let curTitle = null;
for (const line of src.split(/\n/)) {
  const slug = line.match(/slug:\s*"([^"]+)"/);
  if (slug) curSlug = slug[1];
  const title = line.match(/title:\s*"([^"]+)"/);
  if (title) curTitle = title[1];
  const img = line.match(/imagePath:\s*("(?:\\.|[^"])*"|null)/);
  if (img && curSlug && curTitle) {
    const code = (curTitle.match(/^(\d+(?:\.\d+)*)/) || [])[1];
    const imagePath = img[1] === "null" ? null : JSON.parse(img[1]);
    if (!bySlug.has(curSlug)) bySlug.set(curSlug, []);
    bySlug.get(curSlug).push({
      code,
      title: curTitle,
      normTitle: curTitle.replace(/\s+/g, " ").trim(),
      imagePath,
    });
    curTitle = null;
  }
}

fs.mkdirSync(OUT_DIR, { recursive: true });

function parseSignId(id) {
  const raw = String(id);
  if (!raw.startsWith("sign-")) return null;
  for (const slug of SIGN_CATEGORY_SLUGS) {
    const prefix = `sign-${slug}-`;
    if (raw.startsWith(prefix)) {
      return { slug, code: raw.slice(prefix.length) };
    }
  }
  return null;
}

function resolveSource(q) {
  const parsed = parseSignId(q.id);
  const slug = parsed?.slug || q.topicId;
  if (!slug) return null;
  const list = bySlug.get(slug) || [];
  if (!list.length) return null;

  if (parsed?.code && !parsed.code.startsWith("item-")) {
    const byCode = list.find((s) => s.code === parsed.code && s.imagePath);
    if (byCode) return byCode;
  }

  const answer = q.options?.am?.[q.correctIndex];
  if (typeof answer === "string" && answer.trim()) {
    const norm = answer.replace(/\s+/g, " ").trim();
    const byTitle = list.find(
      (s) => s.imagePath && (s.normTitle === norm || s.normTitle.includes(norm) || norm.includes(s.normTitle)),
    );
    if (byTitle) return byTitle;
  }

  const cardIds = (store.meta?.signsCardQuestionIds || []).find(
    (row) => Array.isArray(row) && row.some((id) => String(id).startsWith(`sign-${slug}-`)),
  );
  if (Array.isArray(cardIds)) {
    const idx = cardIds.indexOf(q.id);
    if (idx >= 0 && list[idx]?.imagePath) return list[idx];
  }

  if (parsed?.code?.startsWith("item-")) {
    const n = Number.parseInt(parsed.code.slice("item-".length), 10);
    if (Number.isInteger(n) && n >= 1 && list[n - 1]?.imagePath) return list[n - 1];
  }

  return null;
}

let copied = 0;
let rewritten = 0;
let skipped = 0;
const failures = [];

for (const q of store.questions) {
  if (q.category !== "signs") continue;
  const srcRow = resolveSource(q);
  if (!srcRow?.imagePath) {
    if (typeof q.imageUrl === "string" && q.imageUrl.includes("/upload/questions/")) {
      q.imageUrl = null;
      rewritten += 1;
    }
    skipped += 1;
    failures.push(q.id);
    continue;
  }

  const abs = path.join(PUBLIC_ROOT, srcRow.imagePath.replace(/^\//, ""));
  if (!fs.existsSync(abs)) {
    failures.push(`${q.id}:missing:${srcRow.imagePath}`);
    skipped += 1;
    continue;
  }

  const filename = path.basename(abs);
  const dest = path.join(OUT_DIR, filename);
  if (!fs.existsSync(dest)) {
    fs.copyFileSync(abs, dest);
    copied += 1;
  }

  const nextUrl = `/upload/signs/${filename}`;
  if (q.imageUrl !== nextUrl) {
    q.imageUrl = nextUrl;
    rewritten += 1;
  }
}

fs.writeFileSync(STORE_PATH, `${JSON.stringify(store, null, 2)}\n`, "utf8");

console.log({
  copied,
  rewritten,
  skipped,
  failureCount: failures.length,
  failures,
  outDirFiles: fs.readdirSync(OUT_DIR).length,
});
