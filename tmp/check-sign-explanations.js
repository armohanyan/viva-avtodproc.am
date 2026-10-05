const s = require("../backend/data/exam-questions.store.json");
const signs = s.questions.filter((q) => q.category === "signs");
const re = /^(\d+(?:\.\d+)*)\.\s*(.+)$/;
let bad = 0;
let noBody = 0;
const samples = [];
for (const q of signs) {
  const raw = (q.explanation || "").replace(/\r\n/g, "\n").trim();
  const parts = raw.split("\n");
  const line = (parts[0] || "").trim();
  const body = parts.slice(1).join("\n").trim();
  if (!re.test(line)) {
    bad += 1;
    if (samples.length < 8) samples.push({ id: q.id, line: line.slice(0, 100) });
  }
  if (!body) noBody += 1;
}
const noBodySamples = [];
for (const q of signs) {
  const raw = (q.explanation || "").replace(/\r\n/g, "\n").trim();
  const parts = raw.split("\n");
  const body = parts.slice(1).join("\n").trim();
  if (!body && noBodySamples.length < 6) {
    noBodySamples.push({ id: q.id, explanation: raw.slice(0, 240) });
  }
}
console.log(JSON.stringify({ total: signs.length, badTitle: bad, noBody, samples, noBodySamples }, null, 2));
