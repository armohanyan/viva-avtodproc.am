const fs = require("fs");
const path = require("path");
const exp = JSON.parse(fs.readFileSync(path.join(__dirname, "viu-questions-export.json"), "utf8"));

const en102 = exp.questions.find((q) => q.locale === "en" && q.group === 1 && q.order === 102);
console.log("EN 1:102", en102.text);

// Find HY that might match yard theme - search keywords won't work in hy.
// Instead: find pairs where image basename order matches AND option counts match AND correctIndex matches
const hy = exp.questions.filter((q) => q.locale === "hy" && q.group === 1);
const en = exp.questions.filter((q) => q.locale === "en" && q.group === 1);
const ru = exp.questions.filter((q) => q.locale === "ru" && q.group === 1);

console.log({ hy: hy.length, en: en.length, ru: ru.length });

// Alignment quality: same order, same option count, same correctIndex
let good = 0;
let bad = 0;
const badSamples = [];
for (const h of hy) {
  const e = en.find((x) => x.order === h.order);
  if (!e) continue;
  const sameOpts = (h.options?.length || 0) === (e.options?.length || 0);
  const sameCorrect = h.correctIndex === e.correctIndex;
  if (sameOpts && sameCorrect) good++;
  else {
    bad++;
    if (badSamples.length < 8) {
      badSamples.push({
        order: h.order,
        hyOpts: h.options.length,
        enOpts: e.options.length,
        hyC: h.correctIndex,
        enC: e.correctIndex,
        hy: h.text.slice(0, 40),
        en: e.text.slice(0, 50),
      });
    }
  }
}
console.log({ good, bad, badSamples });

// Maybe EN/RU were translated from a subset and orders still align for the first N?
let firstBreak = null;
for (const h of hy.sort((a, b) => a.order - b.order)) {
  const e = en.find((x) => x.order === h.order);
  if (!e) {
    if (firstBreak == null) firstBreak = { type: "missing", order: h.order };
    continue;
  }
  if (h.options.length !== e.options.length || h.correctIndex !== e.correctIndex) {
    if (firstBreak == null) firstBreak = { type: "mismatch", order: h.order, hy: h.text.slice(0, 40), en: e.text.slice(0, 50) };
  }
}
console.log({ firstBreak });
