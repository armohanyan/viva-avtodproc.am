const fs = require("fs");
const path = require("path");

function soft(s) {
  return String(s || "")
    .replace(/\u00a0/g, " ")
    .normalize("NFC")
    .replace(/[«»""„“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/[։׃:]/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const exp = JSON.parse(fs.readFileSync(path.join(__dirname, "viu-questions-export.json"), "utf8"));
const store = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../../backend/data/exam-questions.store.json"), "utf8"),
);
const report = JSON.parse(fs.readFileSync(path.join(__dirname, "i18n-merge-report.json"), "utf8"));

const hy = exp.questions.filter((q) => q.locale === "hy");
const samples = report.unmatchedSamples.slice(0, 5);

for (const s of samples) {
  const q = store.questions.find((x) => x.id === s.id);
  const target = soft(q.text.am);
  let best = null;
  for (const h of hy) {
    const hs = soft(h.text);
    // containment / prefix
    const score =
      (hs === target ? 100 : 0) +
      (hs.includes(target.slice(0, 40)) || target.includes(hs.slice(0, 40)) ? 50 : 0) +
      (hs.slice(0, 60) === target.slice(0, 60) ? 30 : 0);
    if (!best || score > best.score) best = { score, id: h.id, group: h.group, order: h.order, text: h.text.slice(0, 90) };
  }
  console.log("\nSTORE", s.id, q.text.am.slice(0, 90));
  console.log("BEST", best);
}
