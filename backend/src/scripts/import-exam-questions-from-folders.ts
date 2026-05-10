/**
 * Reads `theme-questions/` and `exam-questions/` at repo root and writes
 * `backend/data/exam-questions.store.json` with sequential numeric ids.
 *
 * Thematic: 11 cards — same order as `THEMATIC_TOPIC_IDS` in `exam-question.service.ts`
 * (color perception `topicId` `5` is last). Markings use `topicId` `11`.
 *
 * Run: `npm run import:exam-questions --prefix backend`
 */
import fs from 'node:fs/promises';
import path from 'node:path';

/** Must match `THEMATIC_TOPIC_IDS` in `../services/exam-question.service.ts`. */
const THEMATIC_TOPIC_IDS = ['3', '2', '6', '8', '7', '10', '11', '4', '9', '1', '5'] as const;

const THEMATIC_CARD_COUNT = 11;
const EXAM_CARD_COUNT = 60;

type RawQuestion = {
  question?: string;
  options?: unknown;
  correct_answer?: string;
  explanation?: string;
  image?: string;
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
};

type StoreFile = {
  questions: ExamQuestionDto[];
  meta: ExamQuestionMetaDto;
};

function repoRoot(): string {
  return path.resolve(__dirname, '../../..');
}

function normalizeText(value: string): string {
  return value
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('hy-AM')
    .replace(/\s+/g, ' ');
}

function safeString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function resolveCorrectIndex(options: string[], correctAnswer: string): number {
  const normalizedCorrect = normalizeText(correctAnswer);
  if (!normalizedCorrect) return -1;
  return options.findIndex((option) => normalizeText(option) === normalizedCorrect);
}

function localize(amText: string, amOptions: string[]): { text: Record<string, string>; options: Record<string, string[]> } {
  return {
    text: { am: amText, en: amText, ru: amText },
    options: { am: amOptions, en: [...amOptions], ru: [...amOptions] },
  };
}

function buildQuestion(params: {
  topicId?: string;
  category: 'rules' | 'signs' | 'safety';
  q: RawQuestion;
}): ExamQuestionDto | null {
  const questionText = safeString(params.q.question);
  const rawOpts = Array.isArray(params.q.options) ? params.q.options.map((o) => safeString(o)) : [];
  const options = rawOpts.filter((x) => x.length > 0);
  if (!questionText || options.length === 0) return null;

  const ci = resolveCorrectIndex(options, safeString(params.q.correct_answer));
  const correctIndex = ci >= 0 ? ci : 0;
  const { text, options: locOpts } = localize(questionText, options);
  const explanationRaw = safeString(params.q.explanation);
  const explanation = explanationRaw ? explanationRaw : undefined;
  const img = safeString(params.q.image);
  const imageUrl = img ? img : undefined;

  return {
    id: '',
    text,
    options: locOpts,
    ...(explanation ? { explanation } : {}),
    correctIndex,
    category: params.category,
    ...(params.topicId ? { topicId: params.topicId } : {}),
    ...(imageUrl ? { imageUrl } : {}),
  };
}

async function readJson<T>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw) as T;
}

/**
 * One JSON per thematic card (same order as THEMATIC_TOPIC_IDS). Color perception is last.
 */
const THEMATIC_SOURCES: { file: string }[] = [
  { file: 't5out.json' },
  { file: 't3out.json' },
  { file: 't2out.json' },
  { file: 't6out.json' },
  { file: 't8out.json' },
  { file: 't7out.json' },
  { file: 't10out.json' },
  { file: 't4out.json' },
  { file: 't9out.json' },
  { file: 't1out.json' },
  { file: 'color_perception_tests_out.json' },
];

async function main(): Promise<void> {
  if (THEMATIC_SOURCES.length !== THEMATIC_CARD_COUNT) {
    throw new Error(`THEMATIC_SOURCES length ${THEMATIC_SOURCES.length} !== ${THEMATIC_CARD_COUNT}`);
  }

  const root = repoRoot();
  const themeDir = path.join(root, 'theme-questions');
  const examDir = path.join(root, 'exam-questions');
  const outFile = path.join(root, 'backend', 'data', 'exam-questions.store.json');

  const examFileNames = (await fs.readdir(examDir)).filter((f) => /^test\d+out\.json$/i.test(f));
  type ExamFileInfo = { file: string; ticketId: number; ticketName: string; questions: RawQuestion[] };
  const examInfos: ExamFileInfo[] = [];
  for (const file of examFileNames) {
    const fp = path.join(examDir, file);
    const data = await readJson<{ tickets?: { ticket_id?: number; ticket_name?: string; questions?: RawQuestion[] }[] }>(fp);
    const ticket = data.tickets?.[0];
    if (!ticket) throw new Error(`Missing tickets[0] in ${file}`);
    const ticketId = Number(ticket.ticket_id);
    if (!Number.isInteger(ticketId)) throw new Error(`Invalid ticket_id in ${file}`);
    examInfos.push({
      file,
      ticketId,
      ticketName: safeString(ticket.ticket_name),
      questions: ticket.questions ?? [],
    });
  }
  examInfos.sort((a, b) => a.ticketId - b.ticketId || a.file.localeCompare(b.file));
  if (examInfos.length !== EXAM_CARD_COUNT) {
    throw new Error(`Expected ${EXAM_CARD_COUNT} exam JSON files, found ${examInfos.length}`);
  }

  const thematicCardTitles: string[] = [];
  const thematicQuestions: ExamQuestionDto[] = [];
  const thematicCardQuestionIds: string[][] = Array.from({ length: THEMATIC_CARD_COUNT }, () => []);

  for (let cardIndex = 0; cardIndex < THEMATIC_CARD_COUNT; cardIndex += 1) {
    const topicId = THEMATIC_TOPIC_IDS[cardIndex];
    const { file } = THEMATIC_SOURCES[cardIndex];
    const fp = path.join(themeDir, file);
    const data = await readJson<{
      themes?: { theme_name?: string; questions?: RawQuestion[] }[];
      tickets?: { ticket_name?: string; questions?: RawQuestion[] }[];
    }>(fp);

    let title = '';
    let rows: RawQuestion[] = [];
    if (data.tickets && data.tickets.length > 0) {
      title = safeString(data.tickets[0]?.ticket_name);
      rows = data.tickets[0]?.questions ?? [];
    } else if (data.themes && data.themes.length > 0) {
      title = safeString(data.themes[0]?.theme_name);
      rows = data.themes[0]?.questions ?? [];
    }
    thematicCardTitles.push(title || `Թեմա ${cardIndex + 1}`);

    const category: 'rules' | 'signs' | 'safety' = topicId === '5' || topicId === '1' ? 'safety' : 'rules';

    for (const q of rows) {
      const dto = buildQuestion({ topicId, category, q });
      if (!dto) continue;
      thematicQuestions.push(dto);
    }
  }

  const examCardTitles: string[] = [];
  const examQuestions: ExamQuestionDto[] = [];
  const examCardQuestionIds: string[][] = Array.from({ length: EXAM_CARD_COUNT }, () => []);

  for (let examIndex = 0; examIndex < EXAM_CARD_COUNT; examIndex += 1) {
    const info = examInfos[examIndex];
    examCardTitles.push(info.ticketName || `Թեստ ${examIndex + 1}`);

    for (const q of info.questions) {
      const dto = buildQuestion({ category: 'rules', q });
      if (!dto) continue;
      examQuestions.push(dto);
    }
  }

  const questions: ExamQuestionDto[] = [...thematicQuestions, ...examQuestions];

  let idNum = 1;
  for (const q of thematicQuestions) {
    const id = String(idNum++);
    q.id = id;
    const idx = (THEMATIC_TOPIC_IDS as readonly string[]).indexOf(q.topicId ?? '');
    if (idx >= 0) thematicCardQuestionIds[idx].push(id);
  }

  for (let examIndex = 0; examIndex < EXAM_CARD_COUNT; examIndex += 1) {
    const rows = examInfos[examIndex].questions;
    const accepted = rows.filter((q) => buildQuestion({ category: 'rules', q }));
    for (let k = 0; k < accepted.length; k += 1) {
      const q = examQuestions.shift();
      if (!q) throw new Error('Internal error: exam question buffer underrun');
      const id = String(idNum++);
      q.id = id;
      examCardQuestionIds[examIndex].push(id);
    }
  }
  if (examQuestions.length !== 0) {
    throw new Error(`Internal error: ${examQuestions.length} exam questions left unmatched`);
  }

  const store: StoreFile = {
    questions,
    meta: {
      thematicCardTitles,
      examCardTitles,
      thematicCardQuestionIds,
      examCardQuestionIds,
    },
  };

  const json = `${JSON.stringify(store, null, 2)}\n`;
  JSON.parse(json);
  await fs.writeFile(outFile, json, 'utf8');
  console.log(`Wrote ${questions.length} questions to ${outFile}`);
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
