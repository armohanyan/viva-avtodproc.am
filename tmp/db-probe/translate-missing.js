/**
 * Translate remaining AM-only exam questions to EN/RU via Google Translate,
 * preserving option index alignment (correctIndex unchanged).
 *
 * Run: node translate-missing.js
 */
const fs = require("fs");
const path = require("path");
const translate = require("google-translate-api-x");

const VIVA_ROOT = path.resolve(__dirname, "../..");
const STORE_PATH = path.join(VIVA_ROOT, "backend/data/exam-questions.store.json");
const NEED_PATH = path.join(__dirname, "needs-translation.json");
const CACHE_PATH = path.join(__dirname, "translation-cache.json");
const PROGRESS_PATH = path.join(__dirname, "translation-progress.json");

const need = JSON.parse(fs.readFileSync(NEED_PATH, "utf8"));
const store = JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
const byId = new Map(store.questions.map((q) => [q.id, q]));

let cache = {};
if (fs.existsSync(CACHE_PATH)) {
  try {
    cache = JSON.parse(fs.readFileSync(CACHE_PATH, "utf8"));
  } catch {
    cache = {};
  }
}

function cacheKey(text, to) {
  return `${to}::${text}`;
}

async function tr(text, to) {
  const raw = String(text ?? "");
  if (!raw.trim()) return raw;
  const key = cacheKey(raw, to);
  if (Object.prototype.hasOwnProperty.call(cache, key)) return cache[key];

  let lastErr;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await translate(raw, { from: "hy", to, forceBatch: false });
      const out = res.text;
      cache[key] = out;
      if (Object.keys(cache).length % 25 === 0) {
        fs.writeFileSync(CACHE_PATH, JSON.stringify(cache));
      }
      await new Promise((r) => setTimeout(r, 80));
      return out;
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  throw lastErr;
}

async function translateList(arr, to) {
  const out = [];
  for (const item of arr) out.push(await tr(item, to));
  return out;
}

async function main() {
  let done = 0;
  let failed = 0;
  const failures = [];

  const startFrom = fs.existsSync(PROGRESS_PATH)
    ? JSON.parse(fs.readFileSync(PROGRESS_PATH, "utf8")).doneIds || []
    : [];
  const doneSet = new Set(startFrom);

  for (const item of need) {
    if (doneSet.has(item.id)) {
      done += 1;
      continue;
    }
    const q = byId.get(item.id);
    if (!q) continue;

    try {
      if (item.needTextEn || (q.text.en === q.text.am)) {
        q.text.en = await tr(q.text.am, "en");
      }
      if (item.needTextRu || (q.text.ru === q.text.am)) {
        q.text.ru = await tr(q.text.am, "ru");
      }

      if (JSON.stringify(q.options.en) === JSON.stringify(q.options.am)) {
        q.options.en = await translateList(q.options.am, "en");
      }
      if (JSON.stringify(q.options.ru) === JSON.stringify(q.options.am)) {
        q.options.ru = await translateList(q.options.am, "ru");
      }

      // Keep correctIndex as-is (options translated in place).
      if (
        q.explanation &&
        typeof q.explanation === "string" &&
        q.explanation.trim() &&
        !/[A-Za-zА-Яа-я]/.test(q.explanation)
      ) {
        // optional: leave explanation AM or translate once to EN stored as single string
        // Store schema uses single explanation string; keep AM to avoid losing meaning.
      }

      doneSet.add(item.id);
      done += 1;
      if (done % 10 === 0) {
        fs.writeFileSync(PROGRESS_PATH, JSON.stringify({ doneIds: [...doneSet], done, total: need.length }));
        fs.writeFileSync(CACHE_PATH, JSON.stringify(cache));
        console.log(`progress ${done}/${need.length}`);
      }
    } catch (e) {
      failed += 1;
      failures.push({ id: item.id, error: String(e.message || e) });
      console.error("fail", item.id, e.message || e);
    }
  }

  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache));
  const tmp = `${STORE_PATH}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(store, null, 2)}\n`);
  try {
    fs.renameSync(tmp, STORE_PATH);
  } catch {
    fs.copyFileSync(tmp, STORE_PATH);
    fs.unlinkSync(tmp);
  }

  let enDiff = 0;
  let enSame = 0;
  for (const q of store.questions) {
    if (q.category === "signs") continue;
    if ((q.text.en || "") === (q.text.am || "")) enSame += 1;
    else enDiff += 1;
  }

  const report = { done, failed, totalNeed: need.length, enDiff, enSame, failures: failures.slice(0, 20) };
  fs.writeFileSync(path.join(__dirname, "translation-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
