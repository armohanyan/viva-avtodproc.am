import type { NextFunction, Response } from 'express';
import type { StaffRequest } from '../middleware/staff-auth.middleware';
import InstructorSalaryReportService from '../services/instructor-salary-report.service';
import { SuccessHandlerUtil } from '../utils';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';

const { UnauthorizedError } = ErrorsUtil;

export default class InstructorSalaryReportController {
  /** Lessons + estimated salary for the authenticated instructor only (id from the token, never the query). */
  static async report(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const id = req.staff?.sub != null ? Number(req.staff.sub) : Number.NaN;
      if (!Number.isFinite(id) || id <= 0) {
        throw new UnauthorizedError('Authentication required', HttpStatusCodesUtil.UNAUTHORIZED);
      }
      const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
      const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;
      const data = await InstructorSalaryReportService.report(id, startDate, endDate);
      SuccessHandlerUtil.handleGet(res, next, data);
    } catch (e) {
      next(e);
    }
  }
}
