import { z } from 'zod';
import ExamQuestionService from './exam-question.service';
import { StudentExamStats, User } from '../models';

const MAX_JSON_CHARS = 480_000;

const activeSessionSchema = z
  .object({
    topicId: z.string().max(160),
    answered: z.number().int().nonnegative(),
    correct: z.number().int().nonnegative(),
    wrong: z.number().int().nonnegative(),
    startedAt: z.number(),
    updatedAt: z.number(),
  })
  .nullable();

const topicStoredSchema = z.object({
  attempts: z.number().int().nonnegative().optional(),
  bestPct: z.number().nonnegative().max(100).optional(),
  lastPct: z.number().nonnegative().max(100).optional(),
  bestCorrect: z.number().int().nonnegative().optional(),
  bestAnswered: z.number().int().nonnegative().optional(),
  lastCorrect: z.number().int().nonnegative().optional(),
  lastAnswered: z.number().int().nonnegative().optional(),
  questionResults: z.record(z.string(), z.boolean()).optional(),
  questionAnswers: z
    .record(
      z.string(),
      z.object({
        questionId: z.string().trim().min(1).max(160),
        selectedAnswerId: z.number().int().nonnegative(),
        isCorrect: z.boolean(),
        answeredAt: z.number(),
      }),
    )
    .optional(),
  currentQuestionIndex: z.number().int().nonnegative().optional(),
  totalQuestions: z.number().int().nonnegative().optional(),
  completedAt: z.number().nullable().optional(),
  updatedAt: z.number().optional(),
});

export const studentExamStatsPayloadSchema = z.object({
  attempts: z.number().int().nonnegative().max(100_000),
  bestPct: z.number().nonnegative().max(100),
  lastPct: z.number().nonnegative().max(100),
  totalCorrect: z.number().int().nonnegative().optional(),
  totalWrong: z.number().int().nonnegative().optional(),
  questionResults: z.record(z.string(), z.boolean()).default({}),
  topics: z.record(z.string(), topicStoredSchema).default({}),
  activeSession: activeSessionSchema.optional(),
});

export type StudentExamStatsPayload = z.infer<typeof studentExamStatsPayloadSchema>;
export const studentExamAttemptSchema = z.object({
  topicId: z.string().trim().min(1).max(160),
  answers: z
    .array(
      z.object({
        questionId: z.string().trim().min(1).max(160),
        selectedAnswerId: z.number().int().nonnegative(),
      }),
    )
    .default([]),
});
export type StudentExamAttemptInput = z.infer<typeof studentExamAttemptSchema>;

export const studentExamActiveSessionSchema = z.object({
  topicId: z.string().trim().min(1).max(160),
  answers: z
    .array(
      z.object({
        questionId: z.string().trim().min(1).max(160),
        selectedAnswerId: z.number().int().nonnegative(),
      }),
    )
    .default([]),
});
export type StudentExamActiveSessionInput = z.infer<typeof studentExamActiveSessionSchema>;
export const studentExamTopicProgressSchema = z.object({
  topicId: z.string().trim().min(1).max(160),
  questionIds: z.array(z.string().trim().min(1).max(160)).default([]),
  questionId: z.string().trim().min(1).max(160),
  selectedAnswerId: z.number().int().nonnegative(),
  currentQuestionIndex: z.number().int().nonnegative(),
});
export type StudentExamTopicProgressInput = z.infer<typeof studentExamTopicProgressSchema>;
export const studentExamTopicIndexSchema = z.object({
  topicId: z.string().trim().min(1).max(160),
  questionIds: z.array(z.string().trim().min(1).max(160)).default([]),
  currentQuestionIndex: z.number().int().nonnegative(),
});
export type StudentExamTopicIndexInput = z.infer<typeof studentExamTopicIndexSchema>;

export type StudentTopicProgressSnapshot = {
  topicId: string;
  totalQuestions: number;
  currentQuestionIndex: number;
  answeredQuestions: Record<
    string,
    { questionId: string; selectedAnswerId: number; isCorrect: boolean; answeredAt: number }
  >;
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
  completedAt: number | null;
  updatedAt: number;
};

function emptyPayload(): StudentExamStatsPayload {
  return {
    attempts: 0,
    bestPct: 0,
    lastPct: 0,
    totalCorrect: 0,
    totalWrong: 0,
    questionResults: {},
    topics: {},
    activeSession: null,
  };
}

function normalizePayload(raw: unknown): StudentExamStatsPayload {
  const parsed = studentExamStatsPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    return emptyPayload();
  }
  return {
    ...parsed.data,
    questionResults: parsed.data.questionResults ?? {},
    topics: parsed.data.topics ?? {},
    activeSession: parsed.data.activeSession ?? null,
  };
}

type ComputedAttempt = {
  answered: number;
  correct: number;
  wrong: number;
  questionOutcomes: Array<{ questionId: string; isCorrect: boolean }>;
};

async function computeAttemptFromAnswers(
  answers: Array<{ questionId: string; selectedAnswerId: number }>,
): Promise<ComputedAttempt> {
  const latestById = new Map<string, number>();
  for (const row of answers) {
    const qid = row.questionId.trim();
    if (!qid) continue;
    latestById.set(qid, Number(row.selectedAnswerId));
  }
  const ids = [...latestById.keys()];
  if (ids.length === 0) {
    return { answered: 0, correct: 0, wrong: 0, questionOutcomes: [] };
  }
  const questions = await ExamQuestionService.listPackByIdsOrdered(ids);
  const byId = new Map(questions.map((q) => [q.id, q]));
  const questionOutcomes: Array<{ questionId: string; isCorrect: boolean }> = [];
  let correct = 0;
  for (const qid of ids) {
    const q = byId.get(qid);
    if (!q) continue;
    const selected = latestById.get(qid);
    const isCorrect = Number(selected) === Number(q.correctIndex);
    if (isCorrect) correct += 1;
    questionOutcomes.push({ questionId: qid, isCorrect });
  }
  const answered = questionOutcomes.length;
  return {
    answered,
    correct,
    wrong: Math.max(0, answered - correct),
    questionOutcomes,
  };
}

function buildTopicSnapshot(payload: StudentExamStatsPayload, topicId: string, questionIds: readonly string[]): StudentTopicProgressSnapshot {
  const tid = topicId.trim();
  const uniqIds = [...new Set(questionIds.map((id) => id.trim()).filter(Boolean))];
  const topic = payload.topics[tid];
  const answersRaw = topic?.questionAnswers && typeof topic.questionAnswers === 'object' ? topic.questionAnswers : {};
  const answeredQuestions: StudentTopicProgressSnapshot['answeredQuestions'] = {};
  for (const qid of uniqIds) {
    const row = answersRaw[qid];
    if (!row) continue;
    answeredQuestions[qid] = {
      questionId: qid,
      selectedAnswerId: Number(row.selectedAnswerId),
      isCorrect: Boolean(row.isCorrect),
      answeredAt: Number.isFinite(Number(row.answeredAt)) ? Number(row.answeredAt) : Date.now(),
    };
  }
  const answered = Object.keys(answeredQuestions).length;
  const correctCount = Object.values(answeredQuestions).filter((x) => x.isCorrect).length;
  const wrongCount = Math.max(0, answered - correctCount);
  const unansweredCount = Math.max(0, uniqIds.length - answered);
  const firstUnanswered = uniqIds.findIndex((id) => !answeredQuestions[id]);
  const storedIdx = Number(topic?.currentQuestionIndex ?? 0);
  const idx = Number.isFinite(storedIdx) ? Math.max(0, Math.min(uniqIds.length > 0 ? uniqIds.length - 1 : 0, storedIdx)) : 0;
  const currentQuestionIndex = firstUnanswered >= 0 ? firstUnanswered : idx;
  return {
    topicId: tid,
    totalQuestions: uniqIds.length,
    currentQuestionIndex,
    answeredQuestions,
    correctCount,
    wrongCount,
    unansweredCount,
    completedAt: unansweredCount === 0 && uniqIds.length > 0 ? Number(topic?.completedAt ?? Date.now()) : null,
    updatedAt: Number.isFinite(Number(topic?.updatedAt)) ? Number(topic?.updatedAt) : Date.now(),
  };
}

export function isExamStatsPayloadVisiblyEmpty(p: StudentExamStatsPayload): boolean {
  const qr = Object.keys(p.questionResults ?? {}).length;
  const tp = Object.keys(p.topics ?? {}).length;
  return (p.attempts ?? 0) === 0 && qr === 0 && tp === 0 && (p.activeSession == null || p.activeSession === null);
}

export default class StudentExamStatsService {
  private static async readRow(userId: number): Promise<StudentExamStatsPayload> {
    const row = await StudentExamStats.findByPk(userId);
    return row ? normalizePayload(row.payload) : emptyPayload();
  }

  private static async saveRow(userId: number, payload: StudentExamStatsPayload): Promise<StudentExamStatsPayload> {
    await StudentExamStats.upsert({ userId, payload: payload as Record<string, unknown> });
    const row = await StudentExamStats.findByPk(userId);
    return row ? normalizePayload(row.payload) : payload;
  }

  static async getForUser(userId: number): Promise<StudentExamStatsPayload> {
    const user = await User.findByPk(userId);
    if (!user || user.accountType !== 'student') {
      return emptyPayload();
    }
    const row = await StudentExamStats.findByPk(userId);
    if (!row) {
      return emptyPayload();
    }
    return normalizePayload(row.payload);
  }

  static async putForUser(userId: number, body: unknown): Promise<StudentExamStatsPayload | null> {
    const user = await User.findByPk(userId);
    if (!user || user.accountType !== 'student') {
      return null;
    }
    const payload = normalizePayload(body);
    const json = JSON.stringify(payload);
    if (json.length > MAX_JSON_CHARS) {
      throw new Error('Exam stats payload too large');
    }
    return this.saveRow(userId, payload);
  }

  static async applyAttempt(userId: number, body: StudentExamAttemptInput): Promise<StudentExamStatsPayload | null> {
    const user = await User.findByPk(userId);
    if (!user || user.accountType !== 'student') return null;

    const current = await this.readRow(userId);
    const topicId = body.topicId.trim();
    const computed = await computeAttemptFromAnswers(body.answers ?? []);
    const topic = current.topics[topicId] ?? {};
    const prevQuestionResults = topic.questionResults ?? {};
    const nextTopicQuestionResults: Record<string, boolean> = { ...prevQuestionResults };

    for (const outcome of computed.questionOutcomes) {
      nextTopicQuestionResults[outcome.questionId] = Boolean(outcome.isCorrect);
    }

    const answered = Object.keys(nextTopicQuestionResults).length;
    const correct = Object.values(nextTopicQuestionResults).filter(Boolean).length;
    const wrong = Math.max(0, answered - correct);
    const attemptPct = answered > 0 ? Math.round((correct / answered) * 100) : 0;
    const isBestImproved = attemptPct > Number(topic.bestPct ?? 0);

    const nextQuestionResults = { ...(current.questionResults ?? {}) };
    for (const [qid, ok] of Object.entries(nextTopicQuestionResults)) {
      nextQuestionResults[`${topicId}:${qid}`] = ok;
    }

    const nextTopics = { ...(current.topics ?? {}) };
    nextTopics[topicId] = {
      attempts: Number(topic.attempts ?? 0) + 1,
      bestPct: Math.max(Number(topic.bestPct ?? 0), attemptPct),
      lastPct: attemptPct,
      bestCorrect: isBestImproved ? correct : Number(topic.bestCorrect ?? 0),
      bestAnswered: isBestImproved ? answered : Number(topic.bestAnswered ?? 0),
      lastCorrect: correct,
      lastAnswered: answered,
      questionResults: nextTopicQuestionResults,
    };

    const next: StudentExamStatsPayload = {
      attempts: Math.max(0, Number(current.attempts ?? 0) + 1),
      bestPct: Math.max(Number(current.bestPct ?? 0), attemptPct),
      lastPct: attemptPct,
      totalCorrect: Number(current.totalCorrect ?? 0),
      totalWrong: Number(current.totalWrong ?? 0),
      questionResults: nextQuestionResults,
      topics: nextTopics,
      activeSession: null,
    };

    return this.saveRow(userId, next);
  }

  static async setActiveSession(userId: number, body: StudentExamActiveSessionInput): Promise<StudentExamStatsPayload | null> {
    const user = await User.findByPk(userId);
    if (!user || user.accountType !== 'student') return null;
    const computed = await computeAttemptFromAnswers(body.answers ?? []);
    const current = await this.readRow(userId);
    const now = Date.now();
    const activeSession = {
      topicId: body.topicId.trim(),
      answered: computed.answered,
      correct: computed.correct,
      wrong: computed.wrong,
      startedAt:
        current.activeSession && current.activeSession.topicId === body.topicId
          ? Number(current.activeSession.startedAt ?? now)
          : now,
      updatedAt: now,
    };
    const next: StudentExamStatsPayload = { ...current, activeSession };
    return this.saveRow(userId, next);
  }

  static async clearActiveSession(userId: number): Promise<StudentExamStatsPayload | null> {
    const user = await User.findByPk(userId);
    if (!user || user.accountType !== 'student') return null;
    const current = await this.readRow(userId);
    const next: StudentExamStatsPayload = { ...current, activeSession: null };
    return this.saveRow(userId, next);
  }

  static async resetTopic(userId: number, topicIdRaw: string): Promise<StudentExamStatsPayload | null> {
    const user = await User.findByPk(userId);
    if (!user || user.accountType !== 'student') return null;
    const topicId = topicIdRaw.trim();
    const current = await this.readRow(userId);
    const nextTopics = { ...(current.topics ?? {}) };
    delete nextTopics[topicId];
    const nextQuestionResults = { ...(current.questionResults ?? {}) };
    for (const key of Object.keys(nextQuestionResults)) {
      if (key.startsWith(`${topicId}:`)) delete nextQuestionResults[key];
    }
    const nextActive =
      current.activeSession && current.activeSession.topicId === topicId ? null : (current.activeSession ?? null);
    const next: StudentExamStatsPayload = {
      ...current,
      topics: nextTopics,
      questionResults: nextQuestionResults,
      activeSession: nextActive,
    };
    return this.saveRow(userId, next);
  }

  static async getTopicProgress(userId: number, topicId: string, questionIds: string[]): Promise<StudentTopicProgressSnapshot | null> {
    const user = await User.findByPk(userId);
    if (!user || user.accountType !== 'student') return null;
    const current = await this.readRow(userId);
    return buildTopicSnapshot(current, topicId, questionIds);
  }

  static async upsertTopicProgress(userId: number, input: StudentExamTopicProgressInput): Promise<StudentTopicProgressSnapshot | null> {
    const user = await User.findByPk(userId);
    if (!user || user.accountType !== 'student') return null;
    const current = await this.readRow(userId);
    const topicId = input.topicId.trim();
    const questionIds = input.questionIds ?? [];
    const topic = current.topics[topicId] ?? {};
    const answers = topic.questionAnswers && typeof topic.questionAnswers === 'object' ? topic.questionAnswers : {};
    const now = Date.now();
    const selectedAnswerId = Number(input.selectedAnswerId);
    const q = await ExamQuestionService.getById(input.questionId);
    const isCorrect = q ? Number(q.correctIndex) === selectedAnswerId : false;
    const nextQuestionAnswers = {
      ...answers,
      [input.questionId]: {
        questionId: input.questionId,
        selectedAnswerId,
        isCorrect,
        answeredAt: now,
      },
    };
    const nextQuestionResults: Record<string, boolean> = {};
    for (const [qid, row] of Object.entries(nextQuestionAnswers)) {
      nextQuestionResults[qid] = Boolean(row.isCorrect);
    }
    const nextTopics = {
      ...current.topics,
      [topicId]: {
        ...topic,
        questionAnswers: nextQuestionAnswers,
        questionResults: nextQuestionResults,
        totalQuestions: questionIds.length,
        currentQuestionIndex: Math.max(0, Number(input.currentQuestionIndex ?? 0)),
        updatedAt: now,
      },
    };
    const nextPayload: StudentExamStatsPayload = { ...current, topics: nextTopics };
    const snapshot = buildTopicSnapshot(nextPayload, topicId, questionIds);
    nextTopics[topicId] = { ...nextTopics[topicId], completedAt: snapshot.completedAt, updatedAt: now };
    const saved = await this.saveRow(userId, { ...nextPayload, topics: nextTopics });
    return buildTopicSnapshot(saved, topicId, questionIds);
  }

  static async saveTopicCurrentIndex(userId: number, input: StudentExamTopicIndexInput): Promise<StudentTopicProgressSnapshot | null> {
    const user = await User.findByPk(userId);
    if (!user || user.accountType !== 'student') return null;
    const current = await this.readRow(userId);
    const topicId = input.topicId.trim();
    const topic = current.topics[topicId];
    if (!topic) return buildTopicSnapshot(current, topicId, input.questionIds ?? []);
    const now = Date.now();
    const nextTopics = {
      ...current.topics,
      [topicId]: {
        ...topic,
        totalQuestions: input.questionIds.length,
        currentQuestionIndex: Math.max(0, Number(input.currentQuestionIndex ?? 0)),
        updatedAt: now,
      },
    };
    const saved = await this.saveRow(userId, { ...current, topics: nextTopics });
    return buildTopicSnapshot(saved, topicId, input.questionIds ?? []);
  }
}
