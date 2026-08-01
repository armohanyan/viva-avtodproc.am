import type { NextFunction, Response } from 'express';
import { z } from 'zod';
import { parseBody, parseQuery } from '../helpers';
import type { StaffRequest } from '../middleware/staff-auth.middleware';
import { PETROL_EXPENSE_REQUEST_STATUSES } from '../models/petrol-expense-request.model';
import PetrolExpenseRequestService from '../services/petrol-expense-request.service';
import { SuccessHandlerUtil } from '../utils';

const listQuerySchema = z.object({
  status: z.enum(PETROL_EXPENSE_REQUEST_STATUSES).optional(),
});

const decisionSchema = z.object({
  note: z.string().max(2000).optional().nullable(),
});

function staffUserId(req: StaffRequest): number | undefined {
  const id = req.staff?.sub != null ? Number(req.staff.sub) : undefined;
  return Number.isFinite(id) && id! > 0 ? id : undefined;
}

export default class AdminPetrolExpenseRequestController {
  static async list(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const query = parseQuery(listQuerySchema, req.query);
      const data = await PetrolExpenseRequestService.listForAdmin(query.status);
      SuccessHandlerUtil.handleGet(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async approve(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const body = parseBody(decisionSchema, req.body ?? {});
      const row = await PetrolExpenseRequestService.approve(
        Number(req.params.id),
        staffUserId(req),
        body.note ?? null,
      );
      SuccessHandlerUtil.handleUpdate(res, next, row);
    } catch (e) {
      next(e);
    }
  }

  static async reject(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const body = parseBody(decisionSchema, req.body ?? {});
      const row = await PetrolExpenseRequestService.reject(
        Number(req.params.id),
        staffUserId(req),
        body.note ?? null,
      );
      SuccessHandlerUtil.handleUpdate(res, next, row);
    } catch (e) {
      next(e);
    }
  }
}
