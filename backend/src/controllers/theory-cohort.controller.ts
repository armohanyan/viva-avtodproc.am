import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { parseBody, resolveBranchIdFilter } from '../helpers';
import TheoryCohortService from '../services/theory-cohort.service';
import TheoryCohortSessionService from '../services/theory-cohort-session.service';
import { SuccessHandlerUtil } from '../utils';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';

const { ResourceNotFoundError } = ErrorsUtil;

const HM = /^([01]\d|2[0-3]):[0-5]\d$/;
const optionalSessionTime = z
  .union([z.string().regex(HM, 'Time must be HH:MM (24h)'), z.null(), z.literal('')])
  .optional()
  .transform((s) => (s === undefined || s === null || s === '' ? null : s));

const createSchema = z.object({
  name: z.string().min(1),
  startDateIso: z.string().min(1),
  endDateIso: z.string().min(1),
  seats: z.number().int().positive(),
  instructorName: z.string().min(1),
  meetLink: z.string().optional(),
  status: z.string().min(1),
  branchId: z.coerce.number().int().positive(),
  sessionStartTime: optionalSessionTime,
  sessionEndTime: optionalSessionTime,
  /** Whole-group price (AMD); omit or null to derive from instructor hourly at booking time. */
  priceAmd: z.union([z.coerce.number().int().min(0), z.null()]).optional(),
  lessonWeekdays: z.array(z.coerce.number().int().min(0).max(6)).optional(),
  totalLessons: z.coerce.number().int().min(0).optional(),
  instructorUserId: z.union([z.coerce.number().int().positive(), z.null()]).optional(),
  instructorUserIds: z.array(z.coerce.number().int().positive()).optional(),
});

const updateSchema = createSchema.partial();

const previewSchema = z.object({
  startDateIso: z.string().min(1),
  endDateIso: z.string().min(1),
  lessonWeekdays: z.array(z.coerce.number().int().min(0).max(6)).min(1),
  sessionStartTime: z.string().regex(HM, 'Time must be HH:MM (24h)'),
  sessionEndTime: z.string().regex(HM, 'Time must be HH:MM (24h)'),
  totalLessons: z.coerce.number().int().positive(),
});

const enrollSchema = z.object({
  studentUserId: z.coerce.number().int().positive(),
});

export default class TheoryCohortController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const branchId = await resolveBranchIdFilter(req);
      const data = await TheoryCohortService.list(branchId);
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
      const row = await TheoryCohortService.update(Number(req.params.id), body);
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
      const ok = await TheoryCohortService.remove(Number(req.params.id));
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
      const row = await TheoryCohortService.enroll(Number(req.params.id), body.studentUserId);
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
      const data = await TheoryCohortService.listEnrollments(Number(req.params.id));
      if (data === null) {
        return next(new ResourceNotFoundError('Cohort not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      SuccessHandlerUtil.handleList(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async previewSessions(req: Request, res: Response, next: NextFunction) {
    try {
      const body = parseBody(previewSchema, req.body);
      const data = TheoryCohortService.previewSessions(body);
      SuccessHandlerUtil.handleList(res, next, data.sessions);
    } catch (e) {
      next(e);
    }
  }

  static async listSessions(req: Request, res: Response, next: NextFunction) {
    try {
      const cohortId = Number(req.params.id);
      const data = await TheoryCohortSessionService.listByCohort(cohortId);
      SuccessHandlerUtil.handleList(res, next, data);
    } catch (e) {
      next(e);
    }
  }
}
