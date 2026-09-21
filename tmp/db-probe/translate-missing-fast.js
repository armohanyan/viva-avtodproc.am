/**
 * Fast batch translation of remaining AM-only fields to EN/RU.
 * Dedupes strings, translates in chunks, applies back preserving correctIndex.
 */
const fs = require("fs");
const path = require("path");
const translate = require("google-translate-api-x");

const VIVA_ROOT = path.resolve(__dirname, "../..");
const STORE_PATH = path.join(VIVA_ROOT, "backend/data/exam-questions.store.json");
const CACHE_PATH = path.join(__dirname, "translation-cache.json");

const store = JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
let cache = {};
if (fs.existsSync(CACHE_PATH)) {
  try {
    cache = JSON.parse(fs.readFileSync(CACHE_PATH, "utf8"));
  } catch {
    cache = {};
  }
}

function key(text, to) {
  return `${to}::${text}`;
}

function needsLang(q, lang) {
  return (q.text?.[lang] || "") === (q.text?.am || "") ||
    JSON.stringify(q.options?.[lang] || []) === JSON.stringify(q.options?.am || []);
}

const targets = store.questions.filter((q) => needsLang(q, "en") || needsLang(q, "ru"));
console.log("questions needing work", targets.length);

const pending = { en: new Set(), ru: new Set() };
for (const q of targets) {
  if ((q.text.en || "") === (q.text.am || "")) pending.en.add(q.text.am);
  if ((q.text.ru || "") === (q.text.am || "")) pending.ru.add(q.text.am);
  if (JSON.stringify(q.options.en) === JSON.stringify(q.options.am)) {
    for (const o of q.options.am) pending.en.add(o);
  }
  if (JSON.stringify(q.options.ru) === JSON.stringify(q.options.am)) {
    for (const o of q.options.am) pending.ru.add(o);
  }
}

function uncached(set, to) {
  return [...set].filter((t) => t && t.trim() && !Object.prototype.hasOwnProperty.call(cache, key(t, to)));
}

async function translateChunk(texts, to) {
  if (!texts.length) return;
  const CHUNK = 25;
  for (let i = 0; i < texts.length; i += CHUNK) {
    const slice = texts.slice(i, i + CHUNK);
    let attempt = 0;
    while (attempt < 6) {
      try {
        const res = await translate(slice, { from: "hy", to, forceBatch: true });
        const arr = Array.isArray(res) ? res : [res];
        arr.forEach((r, idx) => {
          cache[key(slice[idx], to)] = r.text;
        });
        console.log(`translated ${to} ${Math.min(i + CHUNK, texts.length)}/${texts.length}`);
        fs.writeFileSync(CACHE_PATH, JSON.stringify(cache));
        await new Promise((r) => setTimeout(r, 120));
        break;
      } catch (e) {
        attempt += 1;
        console.error(`retry ${to} chunk@${i} attempt ${attempt}`, e.message || e);
        await new Promise((r) => setTimeout(r, 800 * attempt));
        if (attempt >= 6) throw e;
      }
    }
  }
}

function get(text, to) {
  const k = key(text, to);
  if (Object.prototype.hasOwnProperty.call(cache, k)) return cache[k];
  return text; // fallback keep original if missing
}

async function main() {
  const enList = uncached(pending.en, "en");
  const ruList = uncached(pending.ru, "ru");
  console.log({ uniqueEn: pending.en.size, uniqueRu: pending.ru.size, toFetchEn: enList.length, toFetchRu: ruList.length });

  await translateChunk(enList, "en");
  await translateChunk(ruList, "ru");

  let updated = 0;
  for (const q of targets) {
    let touched = false;
    if ((q.text.en || "") === (q.text.am || "")) {
      q.text.en = get(q.text.am, "en");
      touched = true;
    }
    if ((q.text.ru || "") === (q.text.am || "")) {
      q.text.ru = get(q.text.am, "ru");
      touched = true;
    }
    if (JSON.stringify(q.options.en) === JSON.stringify(q.options.am)) {
      q.options.en = q.options.am.map((o) => get(o, "en"));
      touched = true;
    }
    if (JSON.stringify(q.options.ru) === JSON.stringify(q.options.am)) {
      q.options.ru = q.options.am.map((o) => get(o, "ru"));
      touched = true;
    }
    if (touched) updated += 1;
  }

  const tmp = `${STORE_PATH}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(store, null, 2)}\n`);
  try {
    fs.renameSync(tmp, STORE_PATH);
  } catch {
    fs.copyFileSync(tmp, STORE_PATH);
    fs.unlinkSync(tmp);
  }

  let enSame = 0;
  let enDiff = 0;
  for (const q of store.questions) {
    if ((q.text.en || "") === (q.text.am || "")) enSame += 1;
    else enDiff += 1;
  }
  const report = { updated, enDiff, enSame, cacheSize: Object.keys(cache).length };
  fs.writeFileSync(path.join(__dirname, "translation-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
