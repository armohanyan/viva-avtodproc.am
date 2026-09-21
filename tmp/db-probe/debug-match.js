const fs = require("fs");
const path = require("path");

const exportPayload = JSON.parse(fs.readFileSync(path.join(__dirname, "viu-questions-export.json"), "utf8"));
const store = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../../backend/data/exam-questions.store.backup-before-i18n-merge.json"), "utf8"),
);

function normText(s) {
  return String(s || "")
    .replace(/\u00a0/g, " ")
    .replace(/[«»""„“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const q1 = store.questions.find((q) => q.id === "1");
const hy = exportPayload.questions.find((q) => q.locale === "hy" && q.group === 1 && q.order === 1);
const en = exportPayload.questions.find((q) => q.locale === "en" && q.group === 1 && q.order === 1);

console.log("STORE", JSON.stringify(q1.text.am));
console.log("HY   ", JSON.stringify(hy?.text));
console.log("EN   ", JSON.stringify(en?.text));
console.log("norm store", normText(q1.text.am));
console.log("norm hy   ", normText(hy?.text));
console.log("equal", normText(q1.text.am) === normText(hy?.text));

// char code diff
const a = q1.text.am;
const b = hy?.text || "";
for (let i = 0; i < Math.max(a.length, b.length); i++) {
  if (a[i] !== b[i]) {
    console.log("first diff at", i, "store", a.charCodeAt(i), JSON.stringify(a.slice(i, i + 8)), "hy", b.charCodeAt(i), JSON.stringify(b.slice(i, i + 8)));
    break;
  }
}

// How many hy texts match any store am after softer norm?
function soft(s) {
  return normText(s)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
const hyBySoft = new Map();
for (const q of exportPayload.questions.filter((x) => x.locale === "hy")) {
  const k = soft(q.text);
  if (!hyBySoft.has(k)) hyBySoft.set(k, []);
  hyBySoft.get(k).push(q);
}
let softHits = 0;
for (const q of store.questions) {
  if (q.category === "signs") continue;
  if (hyBySoft.has(soft(q.text.am))) softHits++;
}
console.log({ softHits, theory: store.questions.filter((q) => q.category !== "signs").length });
