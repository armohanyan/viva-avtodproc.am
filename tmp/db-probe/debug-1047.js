const fs = require("fs");
const path = require("path");

function soft(s) {
  return String(s || "")
    .replace(/\u00a0/g, " ")
    .normalize("NFC")
    .replace(/[«»""„“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/[։׃:`]/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const exp = JSON.parse(fs.readFileSync(path.join(__dirname, "viu-questions-export.json"), "utf8"));
const backup = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../../backend/data/exam-questions.store.backup-before-i18n-merge.json"), "utf8"),
);
const q = backup.questions.find((x) => x.id === "1047");
const hy = exp.questions.find((x) => x.id === 2134);
console.log("soft equal", soft(q.text.am) === soft(hy.text));
console.log("store soft", soft(q.text.am));
console.log("hy soft   ", soft(hy.text));
console.log("lens", soft(q.text.am).length, soft(hy.text).length);
// find first diff
const a = soft(q.text.am);
const b = soft(hy.text);
for (let i = 0; i < Math.max(a.length, b.length); i++) {
  if (a[i] !== b[i]) {
    console.log("diff", i, JSON.stringify(a.slice(i, i + 20)), JSON.stringify(b.slice(i, i + 20)), a.charCodeAt(i), b.charCodeAt(i));
    break;
  }
}
