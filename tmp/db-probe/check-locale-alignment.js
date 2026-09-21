const fs = require("fs");
const path = require("path");
const exp = JSON.parse(fs.readFileSync(path.join(__dirname, "viu-questions-export.json"), "utf8"));

const byGroupOrder = new Map();
for (const q of exp.questions) {
  const k = `${q.group}:${q.order}`;
  if (!byGroupOrder.has(k)) byGroupOrder.set(k, {});
  byGroupOrder.get(k)[q.locale] = q;
}

let complete = 0;
let missingEn = 0;
let missingRu = 0;
let imagePathAgree = 0;
let imagePathDisagree = 0;
let optionCountAgree = 0;
let optionCountDisagree = 0;
const disagreeSamples = [];

for (const [k, locs] of byGroupOrder) {
  if (locs.hy && locs.en && locs.ru) complete++;
  if (locs.hy && !locs.en) missingEn++;
  if (locs.hy && !locs.ru) missingRu++;
  if (locs.hy && locs.en) {
    const hyOpts = locs.hy.options?.length || 0;
    const enOpts = locs.en.options?.length || 0;
    if (hyOpts === enOpts) optionCountAgree++;
    else optionCountDisagree++;
    if (locs.hy.imagePath && locs.en.imagePath) {
      if (locs.hy.imagePath === locs.en.imagePath) imagePathAgree++;
      else {
        imagePathDisagree++;
        if (disagreeSamples.length < 5) {
          disagreeSamples.push({
            k,
            hy: locs.hy.text.slice(0, 50),
            en: locs.en.text.slice(0, 50),
            hyImg: locs.hy.imagePath,
            enImg: locs.en.imagePath,
          });
        }
      }
    }
  }
}

console.log({
  bundles: byGroupOrder.size,
  complete,
  missingEn,
  missingRu,
  optionCountAgree,
  optionCountDisagree,
  imagePathAgree,
  imagePathDisagree,
  disagreeSamples,
});

// For group 1 order 102 - option counts and images
const b = byGroupOrder.get("1:102");
console.log("1:102", {
  hyOpts: b.hy?.options?.length,
  enOpts: b.en?.options?.length,
  ruOpts: b.ru?.options?.length,
  hyImg: b.hy?.imagePath,
  enImg: b.en?.imagePath,
  ruImg: b.ru?.imagePath,
  hyCorrect: b.hy?.correctIndex,
  enCorrect: b.en?.correctIndex,
});
