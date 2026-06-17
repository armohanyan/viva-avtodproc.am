import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { parseBody, parseParams, parseQuery, verifyAccessToken } from '../helpers';
import ExamQuestionService from '../services/exam-question.service';
import ExamQuestionEngagementService from '../services/exam-question-engagement.service';
import { SuccessHandlerUtil } from '../utils';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';

const { PermissionError, ResourceNotFoundError, UnauthorizedError } = ErrorsUtil;

const langRecord = z.record(z.string(), z.string());

const questionPayloadBase = z.object({
  text: langRecord,
  options: z.record(z.string(), z.array(z.string())),
  explanation: z.string().optional(),
  correctIndex: z.number().int().min(0).max(32),
  category: z.enum(['rules', 'signs', 'safety']),
  topicId: z.string().optional(),
  imageUrl: z.string().nullable().optional(),
});

function refineQuestionPayload<T extends z.infer<typeof questionPayloadBase>>(data: T, ctx: z.RefinementCtx): void {
  const opts = data.options?.am;
  if (!Array.isArray(opts) || opts.length === 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'options.am must be a non-empty array', path: ['options', 'am'] });
    return;
  }
  if (data.correctIndex < 0 || data.correctIndex >= opts.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'correctIndex out of range for options.am',
      path: ['correctIndex'],
    });
  }
}

const questionPayloadSchema = questionPayloadBase.superRefine(refineQuestionPayload);

const questionUpsertSchema = questionPayloadBase
  .extend({
    id: z.string().trim().min(1).optional(),
  })
  .superRefine(refineQuestionPayload);

const replaceSchema = z.object({
  questions: z.array(questionPayloadSchema),
});

const metaSchema = z.object({
  thematicCardTitles: z.array(z.string()).length(11).optional(),
  examCardTitles: z.array(z.string()).length(60).optional(),
  thematicCardQuestionIds: z.array(z.array(z.string())).length(11).optional(),
  examCardQuestionIds: z.array(z.array(z.string())).length(60).optional(),
  signsCardTitles: z.array(z.string()).length(10).optional(),
  signsCardQuestionIds: z.array(z.array(z.string())).length(10).optional(),
});

const packByIdsSchema = z.object({
  ids: z.array(z.string()).max(400),
});

const setSavedSchema = z.object({
  saved: z.boolean(),
});

const addCommentSchema = z.object({
  text: z.string().trim().min(1).max(2000),
});

const commentIdParamsSchema = z.object({
  commentId: z.coerce.number().int().positive(),
});
const commentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().min(1).max(50).optional(),
});

function readBearerToken(req: Request): string | undefined {
  const raw = req.headers.authorization;
  return raw?.startsWith('Bearer ') ? raw.slice(7).trim() : undefined;
}

function readAuthenticatedUser(req: Request): { userId: number; accountType: 'super_admin' | 'admin' | 'instructor' | 'student' } {
  const token = readBearerToken(req);
  if (!token) {
    throw new UnauthorizedError('Authentication required', HttpStatusCodesUtil.UNAUTHORIZED);
  }
  let payload: ReturnType<typeof verifyAccessToken>;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw new UnauthorizedError('Invalid or expired token', HttpStatusCodesUtil.UNAUTHORIZED);
  }
  const userId = Number(payload.sub);
  if (!Number.isFinite(userId) || userId <= 0) {
    throw new UnauthorizedError('Invalid token subject', HttpStatusCodesUtil.UNAUTHORIZED);
  }
  if (
    payload.accountType !== 'super_admin' &&
    payload.accountType !== 'admin' &&
    payload.accountType !== 'instructor' &&
    payload.accountType !== 'student'
  ) {
    throw new PermissionError('Invalid account type', HttpStatusCodesUtil.FORBIDDEN);
  }
  return {
    userId,
    accountType: payload.accountType,
  };
}

export default class ExamQuestionController {
  static async getMeta(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ExamQuestionService.getMeta();
      SuccessHandlerUtil.handleGet(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async updateMeta(req: Request, res: Response, next: NextFunction) {
    try {
      const body = parseBody(metaSchema, req.body);
      const data = await ExamQuestionService.updateMeta(body);
      SuccessHandlerUtil.handleUpdate(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async list(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ExamQuestionService.list();
      SuccessHandlerUtil.handleList(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async listPackThematic(req: Request, res: Response, next: NextFunction) {
    try {
      const topicId = String(req.params.topicId ?? '').trim();
      const data = await ExamQuestionService.listPackThematicTopic(topicId);
      SuccessHandlerUtil.handleList(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async listPackSigns(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ExamQuestionService.listPackSigns();
      SuccessHandlerUtil.handleList(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async listPackSignCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const topicId = String(req.params.topicId ?? '').trim();
      const data = await ExamQuestionService.listPackSignCategory(topicId);
      SuccessHandlerUtil.handleList(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async listPackRulesSafety(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ExamQuestionService.listPackRulesSafety();
      SuccessHandlerUtil.handleList(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async listPackByIds(req: Request, res: Response, next: NextFunction) {
    try {
      const body = parseBody(packByIdsSchema, req.body);
      const data = await ExamQuestionService.listPackByIdsOrdered(body.ids);
      SuccessHandlerUtil.handleList(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      const row = await ExamQuestionService.getById(String(req.params.id ?? ''));
      SuccessHandlerUtil.handleGet(res, next, row);
    } catch (e) {
      next(e);
    }
  }

  static async replaceAll(req: Request, res: Response, next: NextFunction) {
    try {
      const body = parseBody(replaceSchema, req.body);
      await ExamQuestionService.replaceAll(body.questions);
      const data = await ExamQuestionService.list();
      SuccessHandlerUtil.handleList(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async upsert(req: Request, res: Response, next: NextFunction) {
    try {
      const body = parseBody(questionUpsertSchema, req.body);
      const row = await ExamQuestionService.upsertOne(body);
      SuccessHandlerUtil.handleUpdate(res, next, row);
    } catch (e) {
      next(e);
    }
  }

  static async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const ok = await ExamQuestionService.remove(String(req.params.id));
      if (!ok) {
        return next(new ResourceNotFoundError('Question not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      res.sendStatus(204);
    } catch (e) {
      next(e);
    }
  }

  static async listComments(req: Request, res: Response, next: NextFunction) {
    try {
      const questionId = String(req.params.id ?? '').trim();
      const { page = 1, pageSize = 10 } = parseQuery(commentsQuerySchema, req.query);
      const exists = await ExamQuestionEngagementService.questionExists(questionId);
      if (!exists) {
        return next(new ResourceNotFoundError('Question not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      const data = await ExamQuestionEngagementService.listComments(questionId, page, pageSize);
      SuccessHandlerUtil.handleGet(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async addComment(req: Request, res: Response, next: NextFunction) {
    try {
      const questionId = String(req.params.id ?? '').trim();
      const exists = await ExamQuestionEngagementService.questionExists(questionId);
      if (!exists) {
        return next(new ResourceNotFoundError('Question not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      const user = readAuthenticatedUser(req);
      if (user.accountType !== 'student' && user.accountType !== 'instructor' && user.accountType !== 'admin' && user.accountType !== 'super_admin') {
        return next(new PermissionError('Insufficient permissions', HttpStatusCodesUtil.FORBIDDEN));
      }
      const body = parseBody(addCommentSchema, req.body);
      const data = await ExamQuestionEngagementService.addComment(questionId, user.userId, body.text);
      SuccessHandlerUtil.handleAdd(res, next, data ?? undefined);
    } catch (e) {
      next(e);
    }
  }

  static async removeComment(req: Request, res: Response, next: NextFunction) {
    try {
      const user = readAuthenticatedUser(req);
      if (user.accountType !== 'admin' && user.accountType !== 'super_admin') {
        return next(new PermissionError('Admin access required', HttpStatusCodesUtil.FORBIDDEN));
      }
      const { commentId } = parseParams(commentIdParamsSchema, req.params);
      const ok = await ExamQuestionEngagementService.removeComment(commentId);
      if (!ok) {
        return next(new ResourceNotFoundError('Comment not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      res.sendStatus(204);
    } catch (e) {
      next(e);
    }
  }

  static async getSavedState(req: Request, res: Response, next: NextFunction) {
    try {
      const user = readAuthenticatedUser(req);
      if (user.accountType !== 'student') {
        return next(new PermissionError('Student access required', HttpStatusCodesUtil.FORBIDDEN));
      }
      const questionId = String(req.params.id ?? '').trim();
      const exists = await ExamQuestionEngagementService.questionExists(questionId);
      if (!exists) {
        return next(new ResourceNotFoundError('Question not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      const saved = await ExamQuestionEngagementService.isSaved(questionId, user.userId);
      SuccessHandlerUtil.handleGet(res, next, { saved });
    } catch (e) {
      next(e);
    }
  }

  static async setSavedState(req: Request, res: Response, next: NextFunction) {
    try {
      const user = readAuthenticatedUser(req);
      if (user.accountType !== 'student') {
        return next(new PermissionError('Student access required', HttpStatusCodesUtil.FORBIDDEN));
      }
      const questionId = String(req.params.id ?? '').trim();
      const exists = await ExamQuestionEngagementService.questionExists(questionId);
      if (!exists) {
        return next(new ResourceNotFoundError('Question not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      const body = parseBody(setSavedSchema, req.body);
      const saved = await ExamQuestionEngagementService.setSaved(questionId, user.userId, body.saved);
      SuccessHandlerUtil.handleUpdate(res, next, { saved });
    } catch (e) {
      next(e);
    }
  }

  static async listSavedQuestions(req: Request, res: Response, next: NextFunction) {
    try {
      const user = readAuthenticatedUser(req);
      if (user.accountType !== 'student') {
        return next(new PermissionError('Student access required', HttpStatusCodesUtil.FORBIDDEN));
      }
      const savedIds = await ExamQuestionEngagementService.listSavedQuestionIds(user.userId);
      if (savedIds.length === 0) {
        return SuccessHandlerUtil.handleList(res, next, []);
      }
      const rows = await ExamQuestionService.listPackByIdsOrdered(savedIds);
      SuccessHandlerUtil.handleList(res, next, rows);
    } catch (e) {
      next(e);
    }
  }
}
