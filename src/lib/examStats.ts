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

interface StoredTopicStats {
  attempts: number;
  bestPct: number;
  lastPct: number;
  bestCorrect: number;
  bestAnswered: number;
  lastCorrect: number;
  lastAnswered: number;
  questionResults: Record<string, boolean>;
}

interface StoredExamStats {
  attempts: number;
  bestPct: number;
  lastPct: number;
  totalCorrect?: number;
  totalWrong?: number;
  questionResults: Record<string, boolean>;
  topics: Record<string, StoredTopicStats>;
  activeSession: ActiveSession | null;
}

const KEY = "exam.tests.stats.v2";

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
  if (typeof window === "undefined") {
    return { attempts: 0, bestPct: 0, lastPct: 0, totalCorrect: 0, totalWrong: 0, questionResults: {}, topics: {} };
  }
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { attempts: 0, bestPct: 0, lastPct: 0, totalCorrect: 0, totalWrong: 0, questionResults: {}, topics: {}, activeSession: null };
    const parsed = JSON.parse(raw) as Partial<StoredExamStats>;
    return {
      attempts: Number(parsed.attempts ?? 0) || 0,
      bestPct: Number(parsed.bestPct ?? 0) || 0,
      lastPct: Number(parsed.lastPct ?? 0) || 0,
      totalCorrect: Number(parsed.totalCorrect ?? 0) || 0,
      totalWrong: Number(parsed.totalWrong ?? 0) || 0,
      questionResults: parsed.questionResults && typeof parsed.questionResults === "object" ? (parsed.questionResults as Record<string, boolean>) : {},
      topics: parsed.topics && typeof parsed.topics === "object" ? (parsed.topics as Record<string, StoredTopicStats>) : {},
      activeSession:
        parsed.activeSession && typeof parsed.activeSession === "object"
          ? (parsed.activeSession as ActiveSession)
          : null,
    };
  } catch {
    return { attempts: 0, bestPct: 0, lastPct: 0, totalCorrect: 0, totalWrong: 0, questionResults: {}, topics: {}, activeSession: null };
  }
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
      activeSession: parsed.activeSession ?? null,
    };
  } catch {
    return EMPTY;
  }
}

export function addExamAttempt(result: {
  topicId: string;
  answered: number;
  correct: number;
  wrong: number;
  questionOutcomes: Array<{ questionId: string; isCorrect: boolean }>;
}): ExamStats {
  const current = getExamStats();
  const stored = readStoredStats();
  const attemptPct = result.answered > 0 ? Math.round((result.correct / result.answered) * 100) : 0;
  const topicId = result.topicId || "default";

  const nextQuestionResults: Record<string, boolean> = { ...current.questionResults };
  const currentTopic = current.topicStats[topicId];
  const currentTopicQuestionResults: Record<string, boolean> = {};
  if (currentTopic) {
    for (const [qId, isCorrect] of Object.entries(current.questionResults)) {
      if (qId.startsWith(`${topicId}:`)) {
        currentTopicQuestionResults[qId.slice(topicId.length + 1)] = isCorrect;
      }
    }
  }
  const nextTopicQuestionResults = { ...currentTopicQuestionResults };

  for (const outcome of result.questionOutcomes) {
    if (!outcome.questionId) continue;
    nextQuestionResults[`${topicId}:${outcome.questionId}`] = outcome.isCorrect;
    nextTopicQuestionResults[outcome.questionId] = outcome.isCorrect;
  }
  const topicAnswered = Object.keys(nextTopicQuestionResults).length;
  const topicCorrect = Object.values(nextTopicQuestionResults).filter(Boolean).length;
  const topicWrong = Math.max(0, topicAnswered - topicCorrect);
  const uniqueAnswered = Object.keys(nextQuestionResults).length;
  const uniqueCorrect = Object.values(nextQuestionResults).filter(Boolean).length;

  const nextTopics: Record<string, StoredTopicStats> = { ...stored.topics };
  const prevTopic = nextTopics[topicId];
  const isBestImproved = attemptPct > Number(prevTopic?.bestPct ?? 0);
  nextTopics[topicId] = {
    attempts: Number(nextTopics[topicId]?.attempts ?? 0) + 1,
    bestPct: Math.max(Number(nextTopics[topicId]?.bestPct ?? 0), attemptPct),
    lastPct: attemptPct,
    bestCorrect: isBestImproved ? result.correct : Number(nextTopics[topicId]?.bestCorrect ?? 0),
    bestAnswered: isBestImproved ? result.answered : Number(nextTopics[topicId]?.bestAnswered ?? 0),
    lastCorrect: result.correct,
    lastAnswered: result.answered,
    questionResults: nextTopicQuestionResults,
  };
  const latestCorrectTotal = Object.values(nextTopics).reduce(
    (sum, topic) => sum + Math.max(0, Number(topic.lastCorrect ?? 0)),
    0,
  );
  const latestWrongTotal = Object.values(nextTopics).reduce(
    (sum, topic) => sum + Math.max(0, Number(topic.lastAnswered ?? 0) - Number(topic.lastCorrect ?? 0)),
    0,
  );

  const next: ExamStats = {
    answered: uniqueAnswered,
    correct: latestCorrectTotal,
    wrong: latestWrongTotal,
    attempts: current.attempts + 1,
    bestPct: Math.max(current.bestPct, attemptPct),
    lastPct: attemptPct,
    questionResults: nextQuestionResults,
    topicStats: {
      ...current.topicStats,
      [topicId]: {
        answered: topicAnswered,
        correct: topicCorrect,
        wrong: topicWrong,
        attempts: nextTopics[topicId].attempts,
        bestPct: nextTopics[topicId].bestPct,
        lastPct: nextTopics[topicId].lastPct,
        bestCorrect: nextTopics[topicId].bestCorrect,
        bestAnswered: nextTopics[topicId].bestAnswered,
        lastCorrect: nextTopics[topicId].lastCorrect,
        lastAnswered: nextTopics[topicId].lastAnswered,
      },
    },
    activeSession: null,
  };
  if (typeof window !== "undefined") {
    const payload: StoredExamStats = {
      attempts: next.attempts,
      bestPct: next.bestPct,
      lastPct: next.lastPct,
      totalCorrect: next.correct,
      totalWrong: next.wrong,
      questionResults: next.questionResults,
      topics: nextTopics,
      activeSession: null,
    };
    window.localStorage.setItem(KEY, JSON.stringify(payload));
  }
  return next;
}

export function updateActiveSession(result: {
  topicId: string;
  answered: number;
  correct: number;
  wrong: number;
}): ExamStats {
  const current = getExamStats();
  const stored = readStoredStats();
  const now = Date.now();
  const startedAt = stored.activeSession?.topicId === result.topicId ? stored.activeSession.startedAt : now;
  const activeSession: ActiveSession = {
    topicId: result.topicId,
    answered: Math.max(0, result.answered),
    correct: Math.max(0, result.correct),
    wrong: Math.max(0, result.wrong),
    startedAt,
    updatedAt: now,
  };

  const payload: StoredExamStats = {
    attempts: stored.attempts,
    bestPct: stored.bestPct,
    lastPct: stored.lastPct,
    totalCorrect: stored.totalCorrect,
    totalWrong: stored.totalWrong,
    questionResults: stored.questionResults,
    topics: stored.topics,
    activeSession,
  };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY, JSON.stringify(payload));
  }
  return {
    ...current,
    activeSession,
  };
}

export function clearActiveSession(): ExamStats {
  const current = getExamStats();
  const stored = readStoredStats();
  const payload: StoredExamStats = {
    attempts: stored.attempts,
    bestPct: stored.bestPct,
    lastPct: stored.lastPct,
    totalCorrect: stored.totalCorrect,
    totalWrong: stored.totalWrong,
    questionResults: stored.questionResults,
    topics: stored.topics,
    activeSession: null,
  };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY, JSON.stringify(payload));
  }
  return {
    ...current,
    activeSession: null,
  };
}
