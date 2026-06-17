/**
 * Builds road-sign MCQs from `questions/categories/*.json` (+ EN/RU names) and merges
 * them into `backend/data/exam-questions.store.json` with `category: "signs"`.
 *
 * Run: `npx tsx src/scripts/import-road-sign-questions.ts` (from backend/)
 */
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import {
  SIGN_CATEGORY_EN_SLUGS,
  SIGN_CATEGORY_SLUGS,
  SIGNS_CARD_COUNT,
} from '../constants/sign-categories';

type SignRow = {
  պատկեր?: string;
  կոդ?: string;
  անվանում?: string;
  'կարճ նկարագրություն'?: string;
  'լրացուցիչ տեքստ'?: string;
};

type CategoryFile = {
  կատեգորիա?: string;
  slug?: string;
  նշաններ?: SignRow[];
};

type ExamQuestionDto = {
  id: string;
  text: Record<string, string>;
  options: Record<string, string[]>;
  explanation?: string;
  correctIndex: number;
  category: 'rules' | 'signs' | 'safety';
  topicId?: string;
  imageUrl?: string | null;
};

type ExamQuestionMetaDto = {
  thematicCardTitles: string[];
  examCardTitles: string[];
  thematicCardQuestionIds: string[][];
  examCardQuestionIds: string[][];
  signsCardTitles?: string[];
  signsCardQuestionIds?: string[][];
};

type StoreFile = {
  questions: ExamQuestionDto[];
  meta?: Partial<ExamQuestionMetaDto>;
};

const QUESTION_TEXT = {
  am: 'Ինչ է նշանակում այս ճանապարհային նշանը?',
  en: 'What does this road sign mean?',
  ru: 'Что означает этот дорожный знак?',
};

function repoRoot(): string {
  return path.resolve(__dirname, '../../..');
}

function safeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function deterministicShuffle<T>(items: readonly T[], seed: string): T[] {
  const arr = [...items];
  let h = crypto.createHash('sha256').update(seed).digest();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const byte = h[i % h.length] ?? 0;
    const j = byte % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
    if (i % 32 === 0) {
      h = crypto.createHash('sha256').update(h).update(seed).digest();
    }
  }
  return arr;
}

function buildOptions(
  allNames: { am: string; en: string; ru: string }[],
  correctIndex: number,
  seed: string,
): { options: Record<string, string[]>; correctIndex: number } | null {
  const correct = allNames[correctIndex];
  if (!correct?.am) return null;

  const pool = allNames
    .map((row, idx) => ({ ...row, idx }))
    .filter((row) => row.idx !== correctIndex && row.am.length > 0);

  if (pool.length < 3) return null;

  const picked = deterministicShuffle(pool, `${seed}:distractors`).slice(0, 3);
  const optionRows = deterministicShuffle([correct, ...picked], `${seed}:options`);

  const correctIdx = optionRows.findIndex((row) => row.am === correct.am);
  if (correctIdx < 0) return null;

  return {
    options: {
      am: optionRows.map((row) => row.am),
      en: optionRows.map((row) => row.en || row.am),
      ru: optionRows.map((row) => row.ru || row.am),
    },
    correctIndex: correctIdx,
  };
}

function buildExplanation(sign: SignRow): string | undefined {
  const short = safeString(sign['կարճ նկարագրություն']);
  const extra = safeString(sign['լրացուցիչ տեքստ']);
  const merged = [short, extra].filter(Boolean).join('\n\n').replace(/\r\n/g, '\n').trim();
  return merged || undefined;
}

function questionId(slug: string, code: string): string {
  const safeCode = code.replace(/[^\w.-]+/g, '_');
  return `sign-${slug}-${safeCode}`;
}

async function readJson<T>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw) as T;
}

async function main(): Promise<void> {
  const root = repoRoot();
  const storePath = path.join(root, 'backend/data/exam-questions.store.json');
  const store = await readJson<StoreFile>(storePath);

  const slugSet = new Set<string>(SIGN_CATEGORY_SLUGS);
  const keptQuestions = store.questions.filter((q) => !(q.category === 'signs' && slugSet.has(q.topicId ?? '')));

  const signsCardTitles: string[] = [];
  const signsCardQuestionIds: string[][] = Array.from({ length: SIGNS_CARD_COUNT }, () => []);
  const newSignQuestions: ExamQuestionDto[] = [];

  for (let cardIndex = 0; cardIndex < SIGNS_CARD_COUNT; cardIndex += 1) {
    const slug = SIGN_CATEGORY_SLUGS[cardIndex];
    const enSlug = SIGN_CATEGORY_EN_SLUGS[cardIndex];
    const ruSlug = enSlug;

    const amPath = path.join(root, 'questions/categories', `${slug}.json`);
    const enPath = path.join(root, 'questions/varir-signs-en/categories', `${enSlug}.json`);
    const ruPath = path.join(root, 'questions/varir-signs-ru/categories', `${ruSlug}.json`);

    const [amFile, enFile, ruFile] = await Promise.all([
      readJson<CategoryFile>(amPath),
      readJson<CategoryFile>(enPath),
      readJson<CategoryFile>(ruPath),
    ]);

    const title = safeString(amFile.կատեգորիա) || slug;
    signsCardTitles.push(title);

    const amSigns = Array.isArray(amFile.նշաններ) ? amFile.նշաններ : [];
    const enSigns = Array.isArray(enFile.նշաններ) ? enFile.նշաններ : [];
    const ruSigns = Array.isArray(ruFile.նշաններ) ? ruFile.նշաններ : [];

    const allNames = amSigns.map((sign, idx) => ({
      am: safeString(sign.անվանում),
      en: safeString(enSigns[idx]?.անվանում),
      ru: safeString(ruSigns[idx]?.անվանում),
    }));

    amSigns.forEach((sign, signIndex) => {
      const code = safeString(sign.կոդ) || `item-${signIndex + 1}`;
      const imageUrl = safeString(sign.պատկեր) || undefined;
      if (!allNames[signIndex]?.am) return;

      const built = buildOptions(allNames, signIndex, `${slug}:${code}`);
      if (!built) return;

      const id = questionId(slug, code);
      const explanation = buildExplanation(sign);

      const row: ExamQuestionDto = {
        id,
        text: { ...QUESTION_TEXT },
        options: built.options,
        ...(explanation ? { explanation } : {}),
        correctIndex: built.correctIndex,
        category: 'signs',
        topicId: slug,
        imageUrl,
      };

      newSignQuestions.push(row);
      signsCardQuestionIds[cardIndex].push(id);
    });
  }

  const nextQuestions = [...keptQuestions, ...newSignQuestions].sort((a, b) => a.id.localeCompare(b.id, 'en'));
  const meta = store.meta ?? {};
  const nextStore: StoreFile = {
    questions: nextQuestions,
    meta: {
      thematicCardTitles: meta.thematicCardTitles ?? [],
      examCardTitles: meta.examCardTitles ?? [],
      thematicCardQuestionIds: meta.thematicCardQuestionIds ?? [],
      examCardQuestionIds: meta.examCardQuestionIds ?? [],
      signsCardTitles,
      signsCardQuestionIds,
    },
  };

  await fs.writeFile(storePath, `${JSON.stringify(nextStore, null, 2)}\n`, 'utf8');

  console.log(`Imported ${newSignQuestions.length} road-sign questions into ${storePath}`);
  for (let i = 0; i < SIGNS_CARD_COUNT; i += 1) {
    console.log(`  [${i + 1}] ${signsCardTitles[i]}: ${signsCardQuestionIds[i].length} questions`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
