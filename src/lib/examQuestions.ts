import type { Lang } from "src/lib/i18n";
import { sanitizeCoverImageUrl } from "src/lib/blogHtml";
import {
  EXAM_QUESTION_POOL,
  type ExamQuestion,
  type ExamQuestionCategory,
  type ExamQuizMode,
} from "src/data/examSampleQuestions";

const STORAGE_KEY = "viva.examQuestions.v1";
const UPDATE_EVENT = "viva-exam-questions-updated";

const LANGS: Lang[] = ["en", "ru", "am"];

function isCategory(s: unknown): s is ExamQuestionCategory {
  return s === "rules" || s === "signs" || s === "safety";
}

function parseStringRecord(o: unknown, keys: Lang[]): Record<Lang, string> | null {
  if (!o || typeof o !== "object") return null;
  const r = o as Record<string, unknown>;
  const out: Partial<Record<Lang, string>> = {};
  for (const k of keys) {
    if (typeof r[k] !== "string") return null;
    out[k] = r[k] as string;
  }
  return out as Record<Lang, string>;
}

function parseOptionsRecord(o: unknown, keys: Lang[]): Record<Lang, string[]> | null {
  if (!o || typeof o !== "object") return null;
  const r = o as Record<string, unknown>;
  const out: Partial<Record<Lang, string[]>> = {};
  for (const k of keys) {
    const arr = r[k];
    if (!Array.isArray(arr) || arr.length !== 4) return null;
    if (!arr.every((x) => typeof x === "string")) return null;
    out[k] = [...arr] as string[];
  }
  return out as Record<Lang, string[]>;
}

function parseExplanations(o: unknown, keys: Lang[], optionLen: number): Record<Lang, (string | null)[]> | undefined {
  if (o === undefined || o === null) return undefined;
  if (!o || typeof o !== "object") return undefined;
  const r = o as Record<string, unknown>;
  const out: Partial<Record<Lang, (string | null)[]>> = {};
  for (const k of keys) {
    const arr = r[k];
    if (!Array.isArray(arr) || arr.length !== optionLen) return undefined;
    const row: (string | null)[] = [];
    for (const x of arr) {
      if (x === null) row.push(null);
      else if (typeof x === "string") row.push(x);
      else return undefined;
    }
    out[k] = row;
  }
  return out as Record<Lang, (string | null)[]>;
}

function parseOne(raw: unknown): ExamQuestion | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string" || !o.id.trim()) return null;
  const text = parseStringRecord(o.text, LANGS);
  if (!text) return null;
  const options = parseOptionsRecord(o.options, LANGS);
  if (!options) return null;
  const ci = Number(o.correctIndex);
  if (!Number.isInteger(ci) || ci < 0 || ci > 3) return null;
  if (!isCategory(o.category)) return null;
  const category = o.category;
  let topicId = typeof o.topicId === "string" && o.topicId.trim() ? o.topicId.trim() : undefined;
  if ((category === "rules" || category === "safety") && !topicId) {
    topicId = "5";
  }
  const exp = parseExplanations(o.optionExplanations, LANGS, 4);
  const imageUrl = sanitizeCoverImageUrl(typeof o.imageUrl === "string" ? o.imageUrl : null);
  return {
    id: o.id.trim(),
    text,
    options,
    optionExplanations: exp,
    correctIndex: ci,
    category,
    ...(topicId ? { topicId } : {}),
    ...(imageUrl ? { imageUrl } : {}),
  };
}

function parseStored(raw: unknown): ExamQuestion[] {
  if (!Array.isArray(raw)) return [];
  const out: ExamQuestion[] = [];
  for (const x of raw) {
    const q = parseOne(x);
    if (q) out.push(q);
  }
  return out;
}

function seedPool(): ExamQuestion[] {
  return JSON.parse(JSON.stringify(EXAM_QUESTION_POOL)) as ExamQuestion[];
}

function writeAll(list: ExamQuestion[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
}

/** Full question list for student UI and admin (browser). Seeds from bundled samples once. */
export function loadExamQuestions(): ExamQuestion[] {
  if (typeof window === "undefined") return [...seedPool()];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = seedPool();
      writeAll(initial);
      return initial;
    }
    const parsed = parseStored(JSON.parse(raw) as unknown);
    if (parsed.length === 0) {
      const initial = seedPool();
      writeAll(initial);
      return initial;
    }
    return parsed;
  } catch {
    const initial = seedPool();
    writeAll(initial);
    return initial;
  }
}

export function getExamQuestionPool(): ExamQuestion[] {
  return loadExamQuestions();
}

export function countQuestionsForExamMode(pool: readonly ExamQuestion[], mode: ExamQuizMode): number {
  if (mode === "signs") return pool.filter((q) => q.category === "signs").length;
  if (mode === "topics") return pool.filter((q) => q.category === "rules" || q.category === "safety").length;
  return pool.length;
}

export function countThematicTopicQuestions(pool: readonly ExamQuestion[], topicId: string): number {
  const tid = topicId.trim();
  return pool.filter((q) => (q.category === "rules" || q.category === "safety") && q.topicId === tid).length;
}

export function subscribeExamQuestionsUpdated(fn: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(UPDATE_EVENT, fn);
  return () => window.removeEventListener(UPDATE_EVENT, fn);
}

function normalizeQuestionInput(input: ExamQuestion): ExamQuestion {
  const { topicId, imageUrl, ...rest } = input;
  const safeImg = sanitizeCoverImageUrl(imageUrl ?? null);
  return {
    ...rest,
    id: input.id.trim(),
    ...(topicId?.trim() ? { topicId: topicId.trim() } : {}),
    ...(safeImg ? { imageUrl: safeImg } : {}),
  };
}

export function createExamQuestion(input: Omit<ExamQuestion, "id"> & { id?: string }): ExamQuestion {
  const all = loadExamQuestions();
  const id =
    input.id?.trim() ||
    `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  if (all.some((q) => q.id === id)) {
    throw new Error("duplicate_id");
  }
  const draft: ExamQuestion = { ...input, id } as ExamQuestion;
  const q = normalizeQuestionInput(draft);
  writeAll([q, ...all]);
  return q;
}

export function updateExamQuestion(next: ExamQuestion): void {
  const all = loadExamQuestions();
  if (!all.some((q) => q.id === next.id)) return;
  const normalized = normalizeQuestionInput(next);
  writeAll(all.map((q) => (q.id === normalized.id ? normalized : q)));
}

export function deleteExamQuestion(id: string): void {
  const all = loadExamQuestions();
  writeAll(all.filter((q) => q.id !== id));
}

/** Replace stored pool with a fresh copy of bundled sample questions. */
export function resetExamQuestionsToSeed(): void {
  writeAll(seedPool());
}
