import type { NextFunction, Request, Response } from 'express';
import ClassScheduleService, { type ClassScheduleQuery } from '../services/class-schedule.service';
import { SuccessHandlerUtil } from '../utils';

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

export default class ClassScheduleController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ClassScheduleService.listForAdmin(queryFromRequest(req));
      SuccessHandlerUtil.handleGet(res, next, data);
    } catch (e) {
      next(e);
    }
  }
}
