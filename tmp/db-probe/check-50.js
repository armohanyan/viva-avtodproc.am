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

const backup = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../../backend/data/exam-questions.store.backup-before-i18n-merge.json"), "utf8"),
);
const exp = JSON.parse(fs.readFileSync(path.join(__dirname, "viu-questions-export.json"), "utf8"));

for (const id of ["50", "2000"]) {
  const q = backup.questions.find((x) => x.id === id);
  const k = soft(q.text.am);
  const hyHits = exp.questions.filter((x) => x.locale === "hy" && soft(x.text) === k);
  console.log("\n==", id, "==");
  console.log("STORE AM", q.text.am);
  console.log("hy hits", hyHits.length);
  for (const h of hyHits.slice(0, 3)) {
    const en = exp.questions.find((x) => x.locale === "en" && x.group === h.group && x.order === h.order);
    const ru = exp.questions.find((x) => x.locale === "ru" && x.group === h.group && x.order === h.order);
    console.log({ group: h.group, order: h.order, hy: h.text.slice(0, 80), en: en?.text?.slice(0, 80), ru: ru?.text?.slice(0, 80) });
  }
}
