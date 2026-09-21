const fs = require("fs");
const path = require("path");
const store = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../../backend/data/exam-questions.store.json"), "utf8"),
);
const q1 = store.questions.find((q) => q.id === "1");
console.log({
  id: q1.id,
  am: q1.text.am,
  en: q1.text.en,
  ru: q1.text.ru,
  optAm0: q1.options.am[0],
  optEn0: q1.options.en[0],
  optRu0: q1.options.ru[0],
  correctIndex: q1.correctIndex,
  imageUrl: q1.imageUrl,
});

// How many theory still Armenian-in-en
let stillAm = 0;
let realEn = 0;
const stillSamples = [];
for (const q of store.questions) {
  if (q.category === "signs") continue;
  const enIsAm = (q.text.en || "") === (q.text.am || "");
  const enLooksLatin = /[A-Za-z]/.test(q.text.en || "");
  if (enIsAm) {
    stillAm++;
    if (stillSamples.length < 5) stillSamples.push(q.id);
  } else if (enLooksLatin) realEn++;
}
console.log({ stillAm, realEn, stillSamples });

// Portal coverage ceiling
const exp = JSON.parse(fs.readFileSync(path.join(__dirname, "viu-questions-export.json"), "utf8"));
const enBundles = new Set(
  exp.questions.filter((q) => q.locale === "en").map((q) => `${q.group}:${q.order}`),
);
const ruBundles = new Set(
  exp.questions.filter((q) => q.locale === "ru").map((q) => `${q.group}:${q.order}`),
);
const hyBundles = new Set(
  exp.questions.filter((q) => q.locale === "hy").map((q) => `${q.group}:${q.order}`),
);
console.log({
  hyBundles: hyBundles.size,
  enBundles: enBundles.size,
  ruBundles: ruBundles.size,
  enAndRu: [...enBundles].filter((k) => ruBundles.has(k)).length,
});
