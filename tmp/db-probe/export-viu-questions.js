/**
 * Read-only export of VIU portal Question + Option (+ imagePath) from Railway.
 * Usage: DATABASE_URL=... node export-viu-questions.js
 */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const outDir = __dirname;
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Set DATABASE_URL");
  process.exit(1);
}

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000,
});

async function main() {
  await client.connect();

  const questions = await client.query(`
    SELECT id, "group", "order", locale, text, explanation, "correctIndex", "hasImage", "imagePath"
    FROM "Question"
    ORDER BY id ASC
  `);

  const options = await client.query(`
    SELECT id, "questionId", "order", text
    FROM "Option"
    ORDER BY "questionId" ASC, "order" ASC
  `);

  const imageMeta = await client.query(`
    SELECT id, "questionId", "mimeType", octet_length(data) AS bytes
    FROM "QuestionImage"
  `).catch(() => ({ rows: [] }));

  const optionsByQ = new Map();
  for (const o of options.rows) {
    if (!optionsByQ.has(o.questionId)) optionsByQ.set(o.questionId, []);
    optionsByQ.get(o.questionId).push({ order: o.order, text: o.text });
  }

  const payload = {
    exportedAt: new Date().toISOString(),
    questions: questions.rows.map((q) => ({
      id: q.id,
      group: q.group,
      order: q.order,
      locale: q.locale,
      text: q.text,
      explanation: q.explanation,
      correctIndex: q.correctIndex,
      hasImage: q.hasImage,
      imagePath: q.imagePath,
      options: optionsByQ.get(q.id) || [],
    })),
    questionImages: imageMeta.rows.map((r) => ({
      id: r.id,
      questionId: r.questionId,
      mimeType: r.mimeType,
      bytes: r.bytes,
    })),
  };

  const outPath = path.join(outDir, "viu-questions-export.json");
  fs.writeFileSync(outPath, JSON.stringify(payload));
  const byLocale = {};
  for (const q of payload.questions) byLocale[q.locale] = (byLocale[q.locale] || 0) + 1;
  console.log(
    JSON.stringify(
      {
        outPath,
        questions: payload.questions.length,
        byLocale,
        options: options.rows.length,
        questionImages: payload.questionImages.length,
        withImagePath: payload.questions.filter((q) => q.imagePath).length,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => client.end());
