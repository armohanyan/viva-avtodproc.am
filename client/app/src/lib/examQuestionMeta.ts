import { vivaApiJson } from "src/lib/vivaApi";
import { SIGNS_CARD_COUNT } from "src/data/signCategories";

export type ExamQuestionMeta = {
  thematicCardTitles: string[];
  examCardTitles: string[];
  thematicCardQuestionIds: string[][];
  examCardQuestionIds: string[][];
  signsCardTitles: string[];
  signsCardQuestionIds: string[][];
  /** From API: total questions in store (avoids loading all bodies for progress). */
  totalQuestions: number;
};

const THEMATIC_CARD_COUNT = 11;
const EXAM_CARD_COUNT = 60;
const UPDATE_EVENT = "viva-exam-question-meta-updated";

function defaults(prefix: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => `${prefix} ${i + 1}`);
}

export function defaultExamQuestionMeta(): ExamQuestionMeta {
  return {
    thematicCardTitles: defaults("Թեմա", THEMATIC_CARD_COUNT),
    examCardTitles: defaults("Թեստ", EXAM_CARD_COUNT),
    thematicCardQuestionIds: Array.from({ length: THEMATIC_CARD_COUNT }, () => []),
    examCardQuestionIds: Array.from({ length: EXAM_CARD_COUNT }, () => []),
    signsCardTitles: defaults("Նշաններ", SIGNS_CARD_COUNT),
    signsCardQuestionIds: Array.from({ length: SIGNS_CARD_COUNT }, () => []),
    totalQuestions: 0,
  };
}

function normalize(values: unknown, count: number, prefix: string): string[] {
  const fallback = defaults(prefix, count);
  if (!Array.isArray(values)) return fallback;
  return Array.from({ length: count }, (_, i) => {
    const value = values[i];
    if (typeof value !== "string") return fallback[i];
    const trimmed = value.trim();
    return trimmed || fallback[i];
  });
}

export async function loadExamQuestionMeta(): Promise<ExamQuestionMeta> {
  try {
    const raw = await vivaApiJson<Partial<ExamQuestionMeta>>("/exam-questions/meta");
    return {
      thematicCardTitles: normalize(raw.thematicCardTitles, THEMATIC_CARD_COUNT, "Թեմա"),
      examCardTitles: normalize(raw.examCardTitles, EXAM_CARD_COUNT, "Թեստ"),
      thematicCardQuestionIds: normalizeMatrix(raw.thematicCardQuestionIds, THEMATIC_CARD_COUNT),
      examCardQuestionIds: normalizeMatrix(raw.examCardQuestionIds, EXAM_CARD_COUNT),
      signsCardTitles: normalize(raw.signsCardTitles, SIGNS_CARD_COUNT, "Նշաններ"),
      signsCardQuestionIds: normalizeMatrix(raw.signsCardQuestionIds, SIGNS_CARD_COUNT),
      totalQuestions:
        typeof raw.totalQuestions === "number" && Number.isFinite(raw.totalQuestions) && raw.totalQuestions >= 0
          ? raw.totalQuestions
          : 0,
    };
  } catch {
    return defaultExamQuestionMeta();
  }
}

export async function updateExamQuestionMeta(next: ExamQuestionMeta): Promise<ExamQuestionMeta> {
  const data = await vivaApiJson<Partial<ExamQuestionMeta>>("/exam-questions/meta", { method: "PUT", body: next });
  const normalized = {
    thematicCardTitles: normalize(data.thematicCardTitles, THEMATIC_CARD_COUNT, "Թեմա"),
    examCardTitles: normalize(data.examCardTitles, EXAM_CARD_COUNT, "Թեստ"),
    thematicCardQuestionIds: normalizeMatrix(data.thematicCardQuestionIds, THEMATIC_CARD_COUNT),
    examCardQuestionIds: normalizeMatrix(data.examCardQuestionIds, EXAM_CARD_COUNT),
    signsCardTitles: normalize(data.signsCardTitles, SIGNS_CARD_COUNT, "Նշաններ"),
    signsCardQuestionIds: normalizeMatrix(data.signsCardQuestionIds, SIGNS_CARD_COUNT),
    totalQuestions:
      typeof data.totalQuestions === "number" && Number.isFinite(data.totalQuestions) && data.totalQuestions >= 0
        ? data.totalQuestions
        : 0,
  };
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
  }
  return normalized;
}

function normalizeMatrix(values: unknown, rowCount: number): string[][] {
  if (!Array.isArray(values)) return Array.from({ length: rowCount }, () => []);
  return Array.from({ length: rowCount }, (_, i) => {
    const row = values[i];
    if (!Array.isArray(row)) return [];
    const seen = new Set<string>();
    for (const item of row) {
      if (typeof item !== "string") continue;
      const trimmed = item.trim();
      if (!trimmed) continue;
      seen.add(trimmed);
    }
    return [...seen];
  });
}

export function subscribeExamQuestionMetaUpdated(fn: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(UPDATE_EVENT, fn);
  return () => window.removeEventListener(UPDATE_EVENT, fn);
}
