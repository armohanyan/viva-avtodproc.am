import type { NextFunction, Response } from 'express';
import { resolveBranchIdFilter } from '../helpers';
import type { StaffRequest } from '../middleware/staff-auth.middleware';
import AdminFinancialReportService, {
  type FinancialReportQuery,
} from '../services/admin-financial-report.service';
import { SuccessHandlerUtil } from '../utils';

function queryFromRequest(req: StaffRequest): FinancialReportQuery {
  const q = req.query;
  const pick = (key: string): string | undefined => {
    const v = q[key];
    if (typeof v === 'string') return v;
    if (Array.isArray(v) && typeof v[0] === 'string') return v[0];
    return undefined;
  };
  return {
    startDate: pick('startDate'),
    endDate: pick('endDate'),
  };
}

export default class AdminFinancialReportController {
  static async financial(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const branchId = await resolveBranchIdFilter(req);
      const data = await AdminFinancialReportService.build(queryFromRequest(req), branchId);
      SuccessHandlerUtil.handleGet(res, next, data);
    } catch (e) {
      next(e);
    }
  }
}
