import type { NextFunction, Response } from 'express';
import { resolveBranchIdFilter } from '../helpers';
import type { StaffRequest } from '../middleware/staff-auth.middleware';
import AdminPetrolFuelKmAnalyticsService from '../services/admin-petrol-fuel-km-analytics.service';
import { SuccessHandlerUtil } from '../utils';

export default class AdminPetrolFuelKmAnalyticsController {
  static async list(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const branchId = await resolveBranchIdFilter(req);
      const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
      const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;
      const data = await AdminPetrolFuelKmAnalyticsService.build(startDate, endDate, branchId);
      SuccessHandlerUtil.handleGet(res, next, data);
    } catch (e) {
      next(e);
    }
  }
}
