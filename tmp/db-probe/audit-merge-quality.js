const fs = require("fs");
const path = require("path");

function soft(s) {
  return String(s || "")
    .replace(/\u00a0/g, " ")
    .normalize("NFC")
    .replace(/եւ/g, "և")
    .replace(/[«»""„“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/[։׃:`']/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const store = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../../backend/data/exam-questions.store.json"), "utf8"),
);
const exp = JSON.parse(fs.readFileSync(path.join(__dirname, "viu-questions-export.json"), "utf8"));

// Duplicate AM texts in store theory
const bySoft = new Map();
for (const q of store.questions) {
  if (q.category === "signs") continue;
  const k = soft(q.text.am);
  if (!bySoft.has(k)) bySoft.set(k, []);
  bySoft.get(k).push(q.id);
}
const dupGroups = [...bySoft.values()].filter((a) => a.length > 1);
console.log({
  uniqueAmTexts: bySoft.size,
  duplicateGroups: dupGroups.length,
  questionsInDupGroups: dupGroups.reduce((n, a) => n + a.length, 0),
});

// Quality: does EN look plausible for random sample of updated questions?
const samples = ["1", "2", "50", "200", "500", "1000", "1500", "2000"];
for (const id of samples) {
  const q = store.questions.find((x) => x.id === id);
  if (!q || q.category === "signs") continue;
  console.log({
    id,
    am: q.text.am.slice(0, 50),
    en: (q.text.en || "").slice(0, 70),
    enIsAm: q.text.en === q.text.am,
    optsAlign:
      q.options.am.length === q.options.en.length &&
      q.options.am.length === q.options.ru.length,
    correctInRange: q.correctIndex >= 0 && q.correctIndex < q.options.am.length,
  });
}

// How many store theory have Latin EN and also soft-match a hy row?
const hySoft = new Set(
  exp.questions.filter((q) => q.locale === "hy").map((q) => soft(q.text)),
);
let textMatched = 0;
let latinWithoutHy = 0;
for (const q of store.questions) {
  if (q.category === "signs") continue;
  const hasLatin = /[A-Za-z]/.test(q.text.en || "");
  const inHy = hySoft.has(soft(q.text.am));
  if (inHy) textMatched++;
  if (hasLatin && !inHy) latinWithoutHy++;
}
console.log({ textMatchedToHy: textMatched, latinEnButAmNotInPortal: latinWithoutHy });
