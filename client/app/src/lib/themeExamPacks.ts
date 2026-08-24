/** Theme-based practice exams: 20 questions each from selected thematic topics. */

export const THEME_EXAM_QUESTIONS_PER_TEST = 20;

const STORAGE_KEY = "viva.themeExamPacks.v1";

export type ThemeExamSession = {
  /** Thematic UI slot ids (`"1"`…`"11"`). */
  selectedTopicSlots: string[];
  /** Each pack is exactly `THEME_EXAM_QUESTIONS_PER_TEST` question ids (no overlap). */
  packs: string[][];
  createdAt: number;
};

function shuffleInPlace<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = items[i]!;
    items[i] = items[j]!;
    items[j] = tmp;
  }
  return items;
}

/** Unique question ids from selected thematic cards, then random packs of 20. */
export function buildThemeExamPacks(
  questionIdsBySlot: ReadonlyMap<string, readonly string[]>,
  selectedTopicSlots: readonly string[],
  questionsPerTest: number = THEME_EXAM_QUESTIONS_PER_TEST,
): { poolSize: number; packs: string[][]; remainder: number } {
  const seen = new Set<string>();
  const pool: string[] = [];
  for (const slot of selectedTopicSlots) {
    const ids = questionIdsBySlot.get(slot) ?? [];
    for (const id of ids) {
      const trimmed = id.trim();
      if (!trimmed || seen.has(trimmed)) continue;
      seen.add(trimmed);
      pool.push(trimmed);
    }
  }

  shuffleInPlace(pool);
  const packs: string[][] = [];
  for (let i = 0; i + questionsPerTest <= pool.length; i += questionsPerTest) {
    packs.push(pool.slice(i, i + questionsPerTest));
  }
  const remainder = pool.length % questionsPerTest;
  return { poolSize: pool.length, packs, remainder };
}

export function saveThemeExamSession(session: ThemeExamSession): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    /* ignore quota / private mode */
  }
}

export function loadThemeExamSession(): ThemeExamSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ThemeExamSession;
    if (
      !parsed ||
      !Array.isArray(parsed.selectedTopicSlots) ||
      !Array.isArray(parsed.packs) ||
      !parsed.packs.every((p) => Array.isArray(p) && p.every((id) => typeof id === "string"))
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearThemeExamSession(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function getThemeExamPackIds(packIndex: number): string[] | null {
  const session = loadThemeExamSession();
  if (!session) return null;
  const pack = session.packs[packIndex];
  if (!pack || pack.length === 0) return null;
  return [...pack];
}
