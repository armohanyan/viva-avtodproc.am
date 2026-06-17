import { loadAccountSession } from "src/modules/accounts/account.session";
import { vivaApiJson } from "src/lib/vivaApi";

export interface ExamStats {
  answered: number;
  correct: number;
  wrong: number;
  attempts: number;
  bestPct: number;
  lastPct: number;
  questionResults: Record<string, boolean>;
  topicStats: Record<string, TopicStats>;
  activeSession: ActiveSession | null;
}

/** URL slot ids "1"–"11" for thematic chapters (see thematic dashboard cards). */
export function isThematicSlotTopicKey(topicId: string): boolean {
  const t = topicId.trim();
  if (!/^\d+$/.test(t)) return false;
  const n = Number(t);
  return n >= 1 && n <= 11;
}

/** Full / signs practice and ticketed exams under official exam flows. */
export function isExamScopeTopicKey(topicId: string): boolean {
  const t = topicId.trim();
  if (t === "exam-full" || t === "exam-signs") return true;
  return /^exam-ticket-\d+$/.test(t);
}

/** Thematic practice: chapter slots, full-topic mix, and signs from the thematic entry. */
export function isThematicScopeTopicKey(topicId: string): boolean {
  const t = topicId.trim();
  if (t === "thematic-full" || t === "thematic-signs") return true;
  return isThematicSlotTopicKey(t);
}

/** Road-sign category practice (`road-signs-1` … `road-signs-10`). */
export function isRoadSignsScopeTopicKey(topicId: string): boolean {
  const t = topicId.trim();
  if (t === "road-signs-full") return true;
  if (!/^road-signs-\d+$/.test(t)) return false;
  const slot = Number.parseInt(t.slice("road-signs-".length), 10);
  return slot >= 1 && slot <= 10;
}

export type ExamProgressScope = "thematic" | "exam" | "road-signs";

export interface ScopedExamProgress {
  passed: number;
  failed: number;
}

/** Uses per-topic cumulative `questionResults` (not last-attempt-only aggregates). */
export function getScopedExamProgress(stats: ExamStats, scope: ExamProgressScope): ScopedExamProgress {
  const pred =
    scope === "thematic"
      ? isThematicScopeTopicKey
      : scope === "exam"
        ? isExamScopeTopicKey
        : isRoadSignsScopeTopicKey;
  let passed = 0;
  let failed = 0;
  for (const [topicId, ts] of Object.entries(stats.topicStats)) {
    if (!pred(topicId)) continue;
    passed += Math.max(0, ts.correct);
    failed += Math.max(0, ts.wrong);
  }
  return { passed, failed };
}

export function progressPercentPassed(passed: number, totalQuestions: number): number {
  if (totalQuestions <= 0) return 0;
  const capped = Math.min(passed, totalQuestions);
  return Math.min(100, Number(((capped / totalQuestions) * 100).toFixed(1)));
}

export interface TopicStats {
  answered: number;
  correct: number;
  wrong: number;
  attempts: number;
  bestPct: number;
  lastPct: number;
  bestCorrect: number;
  bestAnswered: number;
  lastCorrect: number;
  lastAnswered: number;
}

export interface ActiveSession {
  topicId: string;
  answered: number;
  correct: number;
  wrong: number;
  startedAt: number;
  updatedAt: number;
}
export interface SessionAnswerInput {
  questionId: string;
  selectedAnswerId: number;
}

export interface StoredTopicStats {
  attempts: number;
  bestPct: number;
  lastPct: number;
  bestCorrect: number;
  bestAnswered: number;
  lastCorrect: number;
  lastAnswered: number;
  questionResults: Record<string, boolean>;
  questionAnswers?: Record<
    string,
    {
      questionId: string;
      selectedAnswerId: number;
      isCorrect: boolean;
      answeredAt: number;
    }
  >;
  currentQuestionIndex?: number;
  totalQuestions?: number;
  completedAt?: number | null;
  updatedAt?: number;
}

export interface StoredExamStats {
  attempts: number;
  bestPct: number;
  lastPct: number;
  totalCorrect?: number;
  totalWrong?: number;
  questionResults: Record<string, boolean>;
  topics: Record<string, StoredTopicStats>;
  activeSession: ActiveSession | null;
}

const listeners = new Set<() => void>();
let memoryStoredStats: StoredExamStats = {
  attempts: 0,
  bestPct: 0,
  lastPct: 0,
  totalCorrect: 0,
  totalWrong: 0,
  questionResults: {},
  topics: {},
  activeSession: null,
};

function normalizeActiveSession(raw: unknown): ActiveSession | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<ActiveSession>;
  const topicId = typeof r.topicId === "string" ? r.topicId.trim() : "";
  const answered = Number(r.answered ?? 0);
  const correct = Number(r.correct ?? 0);
  const wrong = Number(r.wrong ?? 0);
  const startedAt = Number(r.startedAt ?? Date.now());
  const updatedAt = Number(r.updatedAt ?? startedAt);
  // Hard rule: no selected answers => treat as no active session.
  if (!topicId || !Number.isFinite(answered) || answered <= 0) return null;
  return {
    topicId,
    answered: Math.max(0, answered),
    correct: Number.isFinite(correct) ? Math.max(0, correct) : 0,
    wrong: Number.isFinite(wrong) ? Math.max(0, wrong) : 0,
    startedAt: Number.isFinite(startedAt) ? startedAt : Date.now(),
    updatedAt: Number.isFinite(updatedAt) ? updatedAt : Date.now(),
  };
}

export function subscribeExamStatsChanged(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emitExamStatsChanged(): void {
  listeners.forEach((l) => {
    try {
      l();
    } catch {
      /* ignore subscriber errors */
    }
  });
}

let scheduleRemoteSave: (() => void) | null = null;

/** Debounced server PUT is registered from the student exam-stats sync effect for logged-in students. */
export function setExamStatsRemoteSaveScheduler(fn: (() => void) | null): void {
  scheduleRemoteSave = fn;
}

function triggerRemoteSave(): void {
  try {
    scheduleRemoteSave?.();
  } catch {
    /* ignore */
  }
}

function persistLocal(payload: StoredExamStats, opts?: { skipRemote?: boolean }): void {
  memoryStoredStats = {
    ...payload,
    questionResults: payload.questionResults ?? {},
    topics: payload.topics ?? {},
    activeSession: normalizeActiveSession(payload.activeSession),
  };
  emitExamStatsChanged();
  if (!opts?.skipRemote) {
    triggerRemoteSave();
  }
}

export function readStoredExamStatsSnapshot(): StoredExamStats {
  return readStoredStats();
}

export function isStoredExamStatsVisiblyEmpty(s: StoredExamStats): boolean {
  const qr = Object.keys(s.questionResults ?? {}).length;
  const tp = Object.keys(s.topics ?? {}).length;
  return (
    (Number(s.attempts ?? 0) || 0) === 0 &&
    qr === 0 &&
    tp === 0 &&
    (s.activeSession == null || s.activeSession === null)
  );
}

/** Applies server payload to localStorage (does not trigger a remote save). */
export function mergeStoredExamStatsFromServer(remote: StoredExamStats): ExamStats {
  if (typeof window === "undefined") return EMPTY;
  const topicsRaw = remote.topics && typeof remote.topics === "object" ? remote.topics : {};
  const normalized: StoredExamStats = {
    attempts: Number(remote.attempts ?? 0) || 0,
    bestPct: Number(remote.bestPct ?? 0) || 0,
    lastPct: Number(remote.lastPct ?? 0) || 0,
    totalCorrect: Number(remote.totalCorrect ?? 0) || 0,
    totalWrong: Number(remote.totalWrong ?? 0) || 0,
    questionResults:
      remote.questionResults && typeof remote.questionResults === "object"
        ? (remote.questionResults as Record<string, boolean>)
        : {},
    topics: topicsRaw as Record<string, StoredTopicStats>,
    activeSession: normalizeActiveSession(remote.activeSession),
  };
  persistLocal(normalized, { skipRemote: true });
  return getExamStats();
}

const EMPTY: ExamStats = {
  answered: 0,
  correct: 0,
  wrong: 0,
  attempts: 0,
  bestPct: 0,
  lastPct: 0,
  questionResults: {},
  topicStats: {},
  activeSession: null,
};

function readStoredStats(): StoredExamStats {
  return memoryStoredStats;
}

function getCurrentStudentId(): string | null {
  const session = loadAccountSession();
  if (!session || session.accountType !== "student" || !session.id) return null;
  return String(session.id);
}

export function getExamStats(): ExamStats {
  if (typeof window === "undefined") return EMPTY;
  try {
    const parsed = readStoredStats();
    const attempts = Number(parsed.attempts ?? 0);
    const bestPct = Number(parsed.bestPct ?? 0);
    const lastPct = Number(parsed.lastPct ?? 0);
    const questionResults = parsed.questionResults && typeof parsed.questionResults === "object"
      ? (parsed.questionResults as Record<string, boolean>)
      : {};
    const topicsRaw = parsed.topics && typeof parsed.topics === "object" ? parsed.topics : {};
    const topicStats: Record<string, TopicStats> = {};
    for (const [topicId, value] of Object.entries(topicsRaw)) {
      const topicValue = value as Partial<StoredTopicStats>;
      const topicQuestions =
        topicValue.questionResults && typeof topicValue.questionResults === "object"
          ? (topicValue.questionResults as Record<string, boolean>)
          : {};
      const topicAnswered = Object.keys(topicQuestions).length;
      const topicCorrect = Object.values(topicQuestions).filter(Boolean).length;
      topicStats[topicId] = {
        answered: topicAnswered,
        correct: topicCorrect,
        wrong: Math.max(0, topicAnswered - topicCorrect),
        attempts: Number.isFinite(Number(topicValue.attempts ?? 0)) ? Math.max(0, Number(topicValue.attempts ?? 0)) : 0,
        bestPct: Number.isFinite(Number(topicValue.bestPct ?? 0)) ? Math.max(0, Math.min(100, Number(topicValue.bestPct ?? 0))) : 0,
        lastPct: Number.isFinite(Number(topicValue.lastPct ?? 0)) ? Math.max(0, Math.min(100, Number(topicValue.lastPct ?? 0))) : 0,
        bestCorrect: Number.isFinite(Number(topicValue.bestCorrect ?? 0)) ? Math.max(0, Number(topicValue.bestCorrect ?? 0)) : 0,
        bestAnswered: Number.isFinite(Number(topicValue.bestAnswered ?? 0)) ? Math.max(0, Number(topicValue.bestAnswered ?? 0)) : 0,
        lastCorrect: Number.isFinite(Number(topicValue.lastCorrect ?? 0)) ? Math.max(0, Number(topicValue.lastCorrect ?? 0)) : 0,
        lastAnswered: Number.isFinite(Number(topicValue.lastAnswered ?? 0)) ? Math.max(0, Number(topicValue.lastAnswered ?? 0)) : 0,
      };
    }
    const answered = Object.keys(questionResults).length;
    const latestCorrectTotal = Object.values(topicStats).reduce((sum, topic) => sum + Math.max(0, topic.lastCorrect), 0);
    const latestWrongTotal = Object.values(topicStats).reduce(
      (sum, topic) => sum + Math.max(0, topic.lastAnswered - topic.lastCorrect),
      0,
    );
    return {
      answered,
      // Sum of latest attempt per topic (re-attempt replaces previous values).
      correct: latestCorrectTotal,
      wrong: latestWrongTotal,
      attempts: Number.isFinite(attempts) ? Math.max(0, attempts) : 0,
      bestPct: Number.isFinite(bestPct) ? Math.max(0, Math.min(100, bestPct)) : 0,
      lastPct: Number.isFinite(lastPct) ? Math.max(0, Math.min(100, lastPct)) : 0,
      questionResults,
      topicStats,
      activeSession: normalizeActiveSession(parsed.activeSession),
    };
  } catch {
    return EMPTY;
  }
}

export function addExamAttempt(result: {
  topicId: string;
  answers: SessionAnswerInput[];
}): ExamStats {
  const sid = getCurrentStudentId();
  if (!sid) return getExamStats();
  void vivaApiJson<StoredExamStats>(`/students/${encodeURIComponent(sid)}/exam-stats/attempt`, {
    method: "POST",
    body: {
      topicId: result.topicId || "default",
      answers: result.answers ?? [],
    },
  })
    .then((payload) => mergeStoredExamStatsFromServer(payload))
    .catch(() => {
      /* offline */
    });
  return getExamStats();
}

export function updateActiveSession(result: {
  topicId: string;
  answers: SessionAnswerInput[];
}): ExamStats {
  const sid = getCurrentStudentId();
  if (!sid) return getExamStats();
  void vivaApiJson<StoredExamStats>(`/students/${encodeURIComponent(sid)}/exam-stats/active-session`, {
    method: "PUT",
    body: {
      topicId: result.topicId,
      answers: result.answers ?? [],
    },
  })
    .then((payload) => mergeStoredExamStatsFromServer(payload))
    .catch(() => {
      /* offline */
    });
  return getExamStats();
}

export function clearActiveSession(): ExamStats {
  const sid = getCurrentStudentId();
  if (!sid) return getExamStats();
  void vivaApiJson<StoredExamStats>(`/students/${encodeURIComponent(sid)}/exam-stats/active-session`, {
    method: "DELETE",
  })
    .then((payload) => mergeStoredExamStatsFromServer(payload))
    .catch(() => {
      /* offline */
    });
  return getExamStats();
}

export function resetTopicProgress(topicId: string): void {
  const sid = getCurrentStudentId();
  if (!sid) return;
  const tid = topicId.trim();
  if (!tid) return;
  void vivaApiJson<StoredExamStats>(`/students/${encodeURIComponent(sid)}/exam-stats/topic/${encodeURIComponent(tid)}`, {
    method: "DELETE",
  })
    .then((payload) => mergeStoredExamStatsFromServer(payload))
    .catch(() => {
      /* offline */
    });
}

export type TopicProgressSnapshot = {
  topicId: string;
  totalQuestions: number;
  currentQuestionIndex: number;
  answeredQuestions: Record<
    string,
    {
      questionId: string;
      selectedAnswerId: number;
      isCorrect: boolean;
      answeredAt: number;
    }
  >;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  completedAt: number | null;
  updatedAt: number;
};

function emptyTopicSnapshot(topicId: string, questionIds: readonly string[]): TopicProgressSnapshot {
  return {
    topicId: topicId.trim(),
    totalQuestions: questionIds.length,
    currentQuestionIndex: 0,
    answeredQuestions: {},
    correctCount: 0,
    wrongCount: 0,
    unansweredCount: questionIds.length,
    completedAt: null,
    updatedAt: Date.now(),
  };
}

export async function fetchTopicProgressSnapshot(
  topicId: string,
  questionIds: readonly string[],
): Promise<TopicProgressSnapshot> {
  const tid = topicId.trim();
  const sid = getCurrentStudentId();
  if (!sid || !tid) return emptyTopicSnapshot(tid, questionIds);
  const q = questionIds.map((id) => id.trim()).filter(Boolean).join(",");
  try {
    const snapshot = await vivaApiJson<TopicProgressSnapshot>(
      `/students/${encodeURIComponent(sid)}/exam-stats/topic/${encodeURIComponent(tid)}/progress?questionIds=${encodeURIComponent(q)}`,
    );
    const stored = readStoredStats();
    const topic = stored.topics[tid] ?? {
      attempts: 0,
      bestPct: 0,
      lastPct: 0,
      bestCorrect: 0,
      bestAnswered: 0,
      lastCorrect: 0,
      lastAnswered: 0,
      questionResults: {},
    };
    const questionAnswers = snapshot.answeredQuestions ?? {};
    const questionResults: Record<string, boolean> = {};
    for (const [qid, row] of Object.entries(questionAnswers)) questionResults[qid] = Boolean(row.isCorrect);
    persistLocal(
      {
        ...stored,
        topics: {
          ...stored.topics,
          [tid]: {
            ...topic,
            questionAnswers,
            questionResults,
            totalQuestions: snapshot.totalQuestions,
            currentQuestionIndex: snapshot.currentQuestionIndex,
            completedAt: snapshot.completedAt,
            updatedAt: snapshot.updatedAt,
          },
        },
      },
      { skipRemote: true },
    );
    return snapshot;
  } catch {
    return emptyTopicSnapshot(tid, questionIds);
  }
}

export function upsertTopicAnswerProgress(input: {
  topicId: string;
  questionIds: string[];
  questionId: string;
  selectedAnswerId: number;
  currentQuestionIndex: number;
}): TopicProgressSnapshot {
  const topicId = input.topicId.trim();
  const sid = getCurrentStudentId();
  const empty = emptyTopicSnapshot(topicId, input.questionIds);
  if (!sid || !topicId) return empty;
  void vivaApiJson<TopicProgressSnapshot>(`/students/${encodeURIComponent(sid)}/exam-stats/topic/progress`, {
    method: "PUT",
    body: {
      topicId,
      questionIds: input.questionIds,
      questionId: input.questionId,
      selectedAnswerId: input.selectedAnswerId,
      currentQuestionIndex: Math.max(0, input.currentQuestionIndex),
    },
  })
    .then((snapshot) => {
      const stored = readStoredStats();
      const topic = stored.topics[topicId] ?? {
        attempts: 0,
        bestPct: 0,
        lastPct: 0,
        bestCorrect: 0,
        bestAnswered: 0,
        lastCorrect: 0,
        lastAnswered: 0,
        questionResults: {},
      };
      const questionAnswers = snapshot.answeredQuestions ?? {};
      const questionResults: Record<string, boolean> = {};
      for (const [qid, row] of Object.entries(questionAnswers)) questionResults[qid] = Boolean(row.isCorrect);
      persistLocal(
        {
          ...stored,
          topics: {
            ...stored.topics,
            [topicId]: {
              ...topic,
              questionAnswers,
              questionResults,
              totalQuestions: snapshot.totalQuestions,
              currentQuestionIndex: snapshot.currentQuestionIndex,
              completedAt: snapshot.completedAt,
              updatedAt: snapshot.updatedAt,
            },
          },
        },
        { skipRemote: true },
      );
    })
    .catch(() => {
      /* offline */
    });
  return empty;
}

export function saveTopicCurrentQuestionIndex(
  topicId: string,
  questionIds: string[],
  currentQuestionIndex: number,
): void {
  const tid = topicId.trim();
  const sid = getCurrentStudentId();
  if (!sid || !tid) return;
  void vivaApiJson<TopicProgressSnapshot>(`/students/${encodeURIComponent(sid)}/exam-stats/topic/index`, {
    method: "PUT",
    body: {
      topicId: tid,
      questionIds,
      currentQuestionIndex: Math.max(0, currentQuestionIndex),
    },
  }).catch(() => {
    /* offline */
  });
}
