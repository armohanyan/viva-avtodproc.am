import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { parseBody, parseQuery } from '../helpers';
import PracticalSlotPlanService from '../services/practical-slot-plan.service';
import { SuccessHandlerUtil } from '../utils';

const slotPlanRowSchema = z.object({
  time: z.union([z.string(), z.null()]),
});

const branchIdQuerySchema = z.object({
  branchId: z.coerce.number().int().positive(),
});

const replacePracticalSlotPlanSchema = z.object({
  branchId: z.coerce.number().int().positive(),
  rows: z.array(slotPlanRowSchema).min(1).max(32),
});

export default class SettingsController {
  static async getPracticalSlotPlan(req: Request, res: Response, next: NextFunction) {
    try {
      const q = parseQuery(branchIdQuerySchema, req.query);
      const rows = await PracticalSlotPlanService.getPlan(q.branchId);
      SuccessHandlerUtil.handleGet(res, next, { branchId: q.branchId, rows });
    } catch (e) {
      next(e);
    }
  }

  static async replacePracticalSlotPlan(req: Request, res: Response, next: NextFunction) {
    try {
      const body = parseBody(replacePracticalSlotPlanSchema, req.body);
      const rows = await PracticalSlotPlanService.savePlan(body.branchId, body.rows);
      SuccessHandlerUtil.handleUpdate(res, next, { branchId: body.branchId, rows });
    } catch (e) {
      next(e);
    }
  }
}
