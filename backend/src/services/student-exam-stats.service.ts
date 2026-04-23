import { z } from 'zod';
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

export function isExamStatsPayloadVisiblyEmpty(p: StudentExamStatsPayload): boolean {
  const qr = Object.keys(p.questionResults ?? {}).length;
  const tp = Object.keys(p.topics ?? {}).length;
  return (p.attempts ?? 0) === 0 && qr === 0 && tp === 0 && (p.activeSession == null || p.activeSession === null);
}

export default class StudentExamStatsService {
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
    await StudentExamStats.upsert({ userId, payload: payload as Record<string, unknown> });
    const row = await StudentExamStats.findByPk(userId);
    return row ? normalizePayload(row.payload) : payload;
  }
}
