import type { NextFunction, Request, Response } from 'express';
import ClassScheduleService, { type ClassScheduleQuery } from '../services/class-schedule.service';
import type { StaffRequest } from '../middleware/staff-auth.middleware';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';
import { SuccessHandlerUtil } from '../utils';

const { PermissionError } = ErrorsUtil;

function queryFromRequest(req: Request): ClassScheduleQuery {
  const q = req.query;
  const pick = (key: string): string | undefined => {
    const v = q[key];
    if (typeof v === 'string') return v;
    if (Array.isArray(v) && typeof v[0] === 'string') return v[0];
    return undefined;
  };
  return {
    view: pick('view'),
    startDate: pick('startDate'),
    endDate: pick('endDate'),
    lessonType: pick('lessonType'),
    instructorId: pick('instructorId'),
    studentId: pick('studentId'),
    branchId: pick('branchId'),
    status: pick('status'),
    search: pick('search'),
    packageFilter: pick('packageFilter'),
  };
}

function instructorUserIdFromRequest(req: Request): number {
  const payload = (req as StaffRequest).staff;
  if (payload?.accountType !== 'instructor') {
    throw new PermissionError('Instructor access required', HttpStatusCodesUtil.FORBIDDEN);
  }
  const uid = Number(payload.sub);
  if (!Number.isFinite(uid) || uid <= 0) {
    throw new PermissionError('Invalid instructor session', HttpStatusCodesUtil.FORBIDDEN);
  }
  return uid;
}

export default class ClassScheduleController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ClassScheduleService.listForAdmin(queryFromRequest(req));
      SuccessHandlerUtil.handleGet(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async listForInstructor(req: Request, res: Response, next: NextFunction) {
    try {
      const instructorUserId = instructorUserIdFromRequest(req);
      const q = queryFromRequest(req);
      delete q.instructorId;
      delete q.studentId;
      const data = await ClassScheduleService.listForInstructor(instructorUserId, q);
      SuccessHandlerUtil.handleGet(res, next, data);
    } catch (e) {
      next(e);
    }
  }
}
