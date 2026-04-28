import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { parseBody } from '../helpers';
import ExamQuestionService from '../services/exam-question.service';
import { SuccessHandlerUtil } from '../utils';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';

const { ResourceNotFoundError } = ErrorsUtil;

const langRecord = z.record(z.string(), z.string());

const questionPayloadSchema = z.object({
  text: langRecord,
  options: z.record(z.string(), z.array(z.string())),
  optionExplanations: z.record(z.string(), z.array(z.string().nullable())).optional(),
  correctIndex: z.number().int().min(0).max(3),
  category: z.enum(['rules', 'signs', 'safety']),
  topicId: z.string().optional(),
  imageUrl: z.string().nullable().optional(),
});

const questionUpsertSchema = questionPayloadSchema.extend({
  id: z.string().trim().min(1).optional(),
});

const replaceSchema = z.object({
  questions: z.array(questionPayloadSchema),
});

const metaSchema = z.object({
  thematicCardTitles: z.array(z.string()).length(10).optional(),
  examCardTitles: z.array(z.string()).length(60).optional(),
  thematicCardQuestionIds: z.array(z.array(z.string())).length(10).optional(),
  examCardQuestionIds: z.array(z.array(z.string())).length(60).optional(),
});

export default class ExamQuestionController {
  static async getMeta(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ExamQuestionService.getMeta();
      SuccessHandlerUtil.handleRead(res, next, data);
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
}
