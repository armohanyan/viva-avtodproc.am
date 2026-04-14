import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { parseBody } from '../helpers';
import TheoryCohortService from '../services/theory-cohort.service';
import { SuccessHandlerUtil } from '../utils';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';

const { ResourceNotFoundError } = ErrorsUtil;

const createSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  startDateIso: z.string().min(1),
  endDateIso: z.string().min(1),
  schedule: z.string().min(1),
  seats: z.number().int().positive(),
  instructorName: z.string().min(1),
  meetLink: z.string().optional(),
  status: z.string().min(1),
  branchId: z.string().min(1),
});

const updateSchema = createSchema.partial().omit({ id: true });

const enrollSchema = z.object({
  studentUserId: z.string().min(1),
});

export default class TheoryCohortController {
  static async list(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await TheoryCohortService.list();
      SuccessHandlerUtil.handleList(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const body = parseBody(createSchema, req.body);
      const row = await TheoryCohortService.create(body);
      SuccessHandlerUtil.handleAdd(res, next, row);
    } catch (e) {
      next(e);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const body = parseBody(updateSchema, req.body);
      const row = await TheoryCohortService.update(req.params.id!, body);
      if (!row) {
        return next(new ResourceNotFoundError('Cohort not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      SuccessHandlerUtil.handleUpdate(res, next, row);
    } catch (e) {
      next(e);
    }
  }

  static async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const ok = await TheoryCohortService.remove(req.params.id!);
      if (!ok) {
        return next(new ResourceNotFoundError('Cohort not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      res.sendStatus(204);
    } catch (e) {
      next(e);
    }
  }

  static async enroll(req: Request, res: Response, next: NextFunction) {
    try {
      const body = parseBody(enrollSchema, req.body);
      const row = await TheoryCohortService.enroll(req.params.id!, body.studentUserId);
      if (!row) {
        return next(new ResourceNotFoundError('Cohort not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      SuccessHandlerUtil.handleUpdate(res, next, row);
    } catch (e) {
      next(e);
    }
  }

  static async listEnrollments(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await TheoryCohortService.listEnrollments(req.params.id!);
      if (data === null) {
        return next(new ResourceNotFoundError('Cohort not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      SuccessHandlerUtil.handleList(res, next, data);
    } catch (e) {
      next(e);
    }
  }
}
