import { promises as fs } from 'fs';
import path from 'path';
import {
  addManagedFilenameFromUrl,
  deleteManagedUploadFile,
  deleteManagedUploadFiles,
  managedFilenameFromUrl,
} from '../helpers/managed-upload.helper';
import { SIGN_CATEGORY_SLUGS, SIGNS_CARD_COUNT } from '../constants/sign-categories';
import { ExamQuestion, ExamQuestionMeta } from '../models';

export type ExamQuestionDto = {
  id: string;
  text: Record<string, string>;
  options: Record<string, string[]>;
  explanation?: string;
  correctIndex: number;
  category: 'rules' | 'signs' | 'safety';
  topicId?: string;
  imageUrl?: string | null;
};

export type ExamQuestionMetaDto = {
  thematicCardTitles: string[];
  examCardTitles: string[];
  thematicCardQuestionIds: string[][];
  examCardQuestionIds: string[][];
  signsCardTitles: string[];
  signsCardQuestionIds: string[][];
  /** Total questions in the store (for progress UI without loading full bodies). */
  totalQuestions: number;
};

const THEMATIC_CARD_COUNT = 11;
const EXAM_CARD_COUNT = 60;
/** Color perception (`5`) is last; `11` is road markings (split from former combined slot). */
const THEMATIC_TOPIC_IDS = ['3', '2', '6', '8', '7', '10', '11', '4', '9', '1', '5'] as const;
/** Public UI thematic slots are 1..11; map each slot to the stored topic id. */
const THEMATIC_SLOT_TO_TOPIC_ID = THEMATIC_TOPIC_IDS;
/** Road-sign category UI slots are 1..10; map each slot to the stored category slug. */
const SIGN_SLOT_TO_CATEGORY_SLUG = SIGN_CATEGORY_SLUGS;
const STORAGE_FILE = path.resolve(__dirname, '../../data/exam-questions.store.json');

type QuestionStore = {
  questions: ExamQuestionDto[];
  meta?: Partial<ExamQuestionMetaDto>;
};

function defaultCardTitles(prefix: string, size: number): string[] {
  return Array.from({ length: size }, (_, i) => `${prefix} ${i + 1}`);
}

function withLength(values: unknown, size: number, fallbackPrefix: string): string[] {
  const fallback = defaultCardTitles(fallbackPrefix, size);
  if (!Array.isArray(values)) return fallback;
  return Array.from({ length: size }, (_, i) => {
    const v = values[i];
    if (typeof v !== 'string') return fallback[i];
    const trimmed = v.trim();
    return trimmed || fallback[i];
  });
}

function normalizeCardQuestions(values: unknown, size: number): string[][] {
  if (!Array.isArray(values)) return Array.from({ length: size }, () => []);
  return Array.from({ length: size }, (_, i) => {
    const row = values[i];
    if (!Array.isArray(row)) return [];
    const uniq = new Set<string>();
    for (const item of row) {
      if (typeof item !== 'string') continue;
      const id = item.trim();
      if (!id) continue;
      uniq.add(id);
    }
    return [...uniq];
  });
}

function normalizeQuestion(raw: unknown): ExamQuestionDto | null {
  if (!raw || typeof raw !== 'object') return null;
  const q = raw as Record<string, unknown>;
  if (typeof q.id !== 'string' || !q.id.trim()) return null;
  if (!q.text || typeof q.text !== 'object') return null;
  if (!q.options || typeof q.options !== 'object') return null;
  const text = q.text as Record<string, string>;
  const options = q.options as Record<string, string[]>;
  const ci = Number(q.correctIndex);
  const category = q.category;
  const amOpts = Array.isArray(options.am) ? options.am.length : 0;
  if (!Number.isInteger(ci) || ci < 0) return null;
  if (amOpts <= 0) return null;
  if (ci >= amOpts) return null;
  if (category !== 'rules' && category !== 'signs' && category !== 'safety') return null;
  const explanation =
    typeof q.explanation === 'string'
      ? q.explanation
      : q.explanation && typeof q.explanation === 'object'
        ? (q.explanation as Record<string, unknown>).am ??
          (q.explanation as Record<string, unknown>).en ??
          (q.explanation as Record<string, unknown>).ru
        : undefined;
  return {
    id: q.id.trim(),
    text,
    options,
    ...(typeof explanation === 'string' ? { explanation } : {}),
    correctIndex: ci,
    category,
    topicId: typeof q.topicId === 'string' ? q.topicId : undefined,
    imageUrl: typeof q.imageUrl === 'string' || q.imageUrl === null ? (q.imageUrl as string | null) : undefined,
  };
}

function sortQuestions(rows: ExamQuestionDto[]): ExamQuestionDto[] {
  return [...rows].sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }));
}

async function ensureStoreDir(): Promise<void> {
  await fs.mkdir(path.dirname(STORAGE_FILE), { recursive: true });
}

async function readStore(): Promise<QuestionStore> {
  await ensureStoreDir();
  try {
    const raw = await fs.readFile(STORAGE_FILE, 'utf8');
    const parsed = JSON.parse(raw) as QuestionStore;
    const questions = Array.isArray(parsed.questions)
      ? parsed.questions.map(normalizeQuestion).filter((x): x is ExamQuestionDto => Boolean(x))
      : [];
    return { questions: sortQuestions(questions), meta: parsed.meta ?? {} };
  } catch {
    const migrated = await migrateFromDatabase();
    if (migrated) {
      await writeStore(migrated);
      return migrated;
    }
    return { questions: [], meta: {} };
  }
}

async function writeStore(store: QuestionStore): Promise<void> {
  await ensureStoreDir();
  const tmp = `${STORAGE_FILE}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
  await fs.rename(tmp, STORAGE_FILE);
}

async function migrateFromDatabase(): Promise<QuestionStore | null> {
  try {
    const rows = await ExamQuestion.findAll({ order: [['id', 'ASC']] });
    if (!rows.length) return null;
    const questions: ExamQuestionDto[] = rows.map((row) => ({
      id: String(row.id),
      text: JSON.parse(row.textJson) as Record<string, string>,
      options: JSON.parse(row.optionsJson) as Record<string, string[]>,
      explanation: row.optionExplanationsJson
        ? (() => {
            try {
              const parsed = JSON.parse(row.optionExplanationsJson) as Record<string, unknown>;
              if (typeof parsed.am === 'string') return parsed.am;
              if (typeof parsed.en === 'string') return parsed.en;
              if (typeof parsed.ru === 'string') return parsed.ru;
              return undefined;
            } catch {
              return undefined;
            }
          })()
        : undefined,
      correctIndex: row.correctIndex,
      category: row.category,
      topicId: row.topicId ?? undefined,
      imageUrl: row.imageUrl ?? undefined,
    }));
    let meta: Partial<ExamQuestionMetaDto> | undefined;
    const metaRow = await ExamQuestionMeta.findOne({ where: { settingKey: 'card_titles' } });
    if (metaRow?.valueJson) {
      try {
        meta = JSON.parse(metaRow.valueJson) as Partial<ExamQuestionMetaDto>;
      } catch {
        meta = undefined;
      }
    }
    return { questions: sortQuestions(questions), meta };
  } catch {
    return null;
  }
}

export default class ExamQuestionService {
  private static async inferMappings(): Promise<
    Pick<ExamQuestionMetaDto, 'thematicCardQuestionIds' | 'examCardQuestionIds' | 'signsCardQuestionIds'>
  > {
    const store = await readStore();
    const thematicCardQuestionIds = Array.from({ length: THEMATIC_CARD_COUNT }, () => [] as string[]);
    const examCardQuestionIds = Array.from({ length: EXAM_CARD_COUNT }, () => [] as string[]);
    const signsCardQuestionIds = Array.from({ length: SIGNS_CARD_COUNT }, () => [] as string[]);
    for (const row of store.questions) {
      const qid = row.id;
      const topicIndex = THEMATIC_TOPIC_IDS.findIndex((tid) => tid === (row.topicId ?? ''));
      if (topicIndex >= 0 && (row.category === 'rules' || row.category === 'safety')) {
        thematicCardQuestionIds[topicIndex].push(qid);
      }
      const signIndex = SIGN_CATEGORY_SLUGS.findIndex((slug) => slug === (row.topicId ?? ''));
      if (signIndex >= 0 && row.category === 'signs') {
        signsCardQuestionIds[signIndex].push(qid);
      }
      examCardQuestionIds[0].push(qid);
    }
    return { thematicCardQuestionIds, examCardQuestionIds, signsCardQuestionIds };
  }

  static async list(): Promise<ExamQuestionDto[]> {
    const store = await readStore();
    return store.questions;
  }

  /** Rules + safety only (all thematic-style theory), for topic quizzes without `?topic=` or full-practice shuffle. */
  static async listPackRulesSafety(): Promise<ExamQuestionDto[]> {
    const store = await readStore();
    return store.questions.filter((q) => q.category === 'rules' || q.category === 'safety');
  }

  /** Signs only (road signs category). */
  static async listPackSigns(): Promise<ExamQuestionDto[]> {
    const store = await readStore();
    return store.questions.filter((q) => q.category === 'signs');
  }

  /** One road-sign category: `category === "signs"` with matching `topicId` (slug or UI slot 1..10). */
  static async listPackSignCategory(topicId: string): Promise<ExamQuestionDto[]> {
    const raw = topicId.trim();
    if (!raw) return [];
    const slot = Number.parseInt(raw, 10);
    const slug =
      Number.isInteger(slot) && slot >= 1 && slot <= SIGN_SLOT_TO_CATEGORY_SLUG.length
        ? SIGN_SLOT_TO_CATEGORY_SLUG[slot - 1]
        : raw;
    const store = await readStore();
    return store.questions.filter((q) => q.category === 'signs' && (q.topicId ?? '') === slug);
  }

  /** One thematic topic: rules/safety rows with this `topicId`. */
  static async listPackThematicTopic(topicId: string): Promise<ExamQuestionDto[]> {
    const raw = topicId.trim();
    if (!raw) return [];
    const slot = Number.parseInt(raw, 10);
    const tid =
      Number.isInteger(slot) && slot >= 1 && slot <= THEMATIC_SLOT_TO_TOPIC_ID.length
        ? THEMATIC_SLOT_TO_TOPIC_ID[slot - 1]
        : raw;
    const store = await readStore();
    return store.questions.filter(
      (q) => (q.topicId ?? '') === tid && (q.category === 'rules' || q.category === 'safety'),
    );
  }

  /** Resolve questions by id in request order (dedupe, skip missing). */
  static async listPackByIdsOrdered(ids: string[]): Promise<ExamQuestionDto[]> {
    const store = await readStore();
    const byId = new Map(store.questions.map((q) => [q.id, q]));
    const out: ExamQuestionDto[] = [];
    const seen = new Set<string>();
    for (const raw of ids) {
      const id = String(raw).trim();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const row = byId.get(id);
      if (row) out.push(row);
    }
    return out;
  }

  static async getById(id: string): Promise<ExamQuestionDto | null> {
    const qid = id.trim();
    if (!qid) return null;
    const store = await readStore();
    return store.questions.find((q) => q.id === qid) ?? null;
  }

  static async replaceAll(questions: Omit<ExamQuestionDto, 'id'>[]): Promise<void> {
    const store = await readStore();
    const oldFiles = new Set<string>();
    for (const r of store.questions) {
      addManagedFilenameFromUrl(r.imageUrl ?? null, oldFiles);
    }
    const newFiles = new Set<string>();
    for (const q of questions) {
      addManagedFilenameFromUrl(q.imageUrl ?? null, newFiles);
    }

    const nextQuestions: ExamQuestionDto[] = questions.map((q, idx) => ({
      id: String(idx + 1),
      ...q,
    }));
    await writeStore({ ...store, questions: sortQuestions(nextQuestions) });

    const toRemove = [...oldFiles].filter((f) => !newFiles.has(f));
    await deleteManagedUploadFiles(toRemove);
  }

  static async upsertOne(q: Omit<ExamQuestionDto, 'id'> & { id?: string }): Promise<ExamQuestionDto> {
    const store = await readStore();
    const requestedId = typeof q.id === 'string' ? q.id.trim() : '';
    const hasId = Boolean(requestedId);
    const prev = hasId ? store.questions.find((x) => x.id === requestedId) : undefined;
    const prevFile = managedFilenameFromUrl(prev?.imageUrl ?? null);
    const nextFile = managedFilenameFromUrl(q.imageUrl ?? null);

    let id = requestedId;
    if (!id) {
      id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
    }
    const row: ExamQuestionDto = { id, ...q };
    const nextQuestions = prev
      ? store.questions.map((x) => (x.id === id ? row : x))
      : [...store.questions, row];
    await writeStore({ ...store, questions: sortQuestions(nextQuestions) });

    if (prevFile && prevFile !== nextFile) {
      const others = nextQuestions.filter((x) => x.id !== id && managedFilenameFromUrl(x.imageUrl ?? null) === prevFile).length;
      if (others === 0) {
        await deleteManagedUploadFile(prevFile);
      }
    }

    return row;
  }

  static async remove(id: string): Promise<boolean> {
    const store = await readStore();
    const found = store.questions.find((x) => x.id === id);
    const file = managedFilenameFromUrl(found?.imageUrl ?? null);
    const nextQuestions = store.questions.filter((x) => x.id !== id);
    const removed = nextQuestions.length !== store.questions.length;
    if (!removed) return false;
    await writeStore({ ...store, questions: nextQuestions });
    if (file) {
      const others = nextQuestions.filter((x) => managedFilenameFromUrl(x.imageUrl ?? null) === file).length;
      if (others === 0) {
        await deleteManagedUploadFile(file);
      }
    }
    return true;
  }

  static async getMeta(): Promise<ExamQuestionMetaDto> {
    const store = await readStore();
    const inferred = await this.inferMappings();
    const parsed = (store.meta ?? {}) as {
      thematicCardTitles?: unknown;
      examCardTitles?: unknown;
      thematicCardQuestionIds?: unknown;
      examCardQuestionIds?: unknown;
      signsCardTitles?: unknown;
      signsCardQuestionIds?: unknown;
    };
    const validIds = new Set(store.questions.map((q) => q.id));
    const prune = (rows: string[][]): string[][] => rows.map((row) => row.filter((id) => validIds.has(id)));
    return {
      thematicCardTitles: withLength(parsed.thematicCardTitles, THEMATIC_CARD_COUNT, 'Թեմա'),
      examCardTitles: withLength(parsed.examCardTitles, EXAM_CARD_COUNT, 'Թեստ'),
      thematicCardQuestionIds: prune(
        normalizeCardQuestions(parsed.thematicCardQuestionIds, THEMATIC_CARD_COUNT).map((row, idx) =>
          row.length ? row : inferred.thematicCardQuestionIds[idx],
        ),
      ),
      examCardQuestionIds: prune(
        normalizeCardQuestions(parsed.examCardQuestionIds, EXAM_CARD_COUNT).map((row, idx) =>
          row.length ? row : inferred.examCardQuestionIds[idx],
        ),
      ),
      signsCardTitles: withLength(parsed.signsCardTitles, SIGNS_CARD_COUNT, 'Նշաններ'),
      signsCardQuestionIds: prune(
        normalizeCardQuestions(parsed.signsCardQuestionIds, SIGNS_CARD_COUNT).map((row, idx) =>
          row.length ? row : inferred.signsCardQuestionIds[idx],
        ),
      ),
      totalQuestions: store.questions.length,
    };
  }

  static async updateMeta(input: Partial<ExamQuestionMetaDto>): Promise<ExamQuestionMetaDto> {
    const store = await readStore();
    const current = await this.getMeta();
    const validIds = new Set(store.questions.map((q) => q.id));
    const prune = (rows: string[][]): string[][] => rows.map((row) => row.filter((id) => validIds.has(id)));
    const next: ExamQuestionMetaDto = {
      thematicCardTitles: withLength(input.thematicCardTitles ?? current.thematicCardTitles, THEMATIC_CARD_COUNT, 'Թեմա'),
      examCardTitles: withLength(input.examCardTitles ?? current.examCardTitles, EXAM_CARD_COUNT, 'Թեստ'),
      thematicCardQuestionIds: prune(
        normalizeCardQuestions(input.thematicCardQuestionIds ?? current.thematicCardQuestionIds, THEMATIC_CARD_COUNT),
      ),
      examCardQuestionIds: prune(
        normalizeCardQuestions(input.examCardQuestionIds ?? current.examCardQuestionIds, EXAM_CARD_COUNT),
      ),
      signsCardTitles: withLength(input.signsCardTitles ?? current.signsCardTitles, SIGNS_CARD_COUNT, 'Նշաններ'),
      signsCardQuestionIds: prune(
        normalizeCardQuestions(input.signsCardQuestionIds ?? current.signsCardQuestionIds, SIGNS_CARD_COUNT),
      ),
      totalQuestions: store.questions.length,
    };
    await writeStore({ ...store, meta: next });
    return next;
  }
}
