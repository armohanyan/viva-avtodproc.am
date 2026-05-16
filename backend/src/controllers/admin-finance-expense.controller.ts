import type { NextFunction, Response } from 'express';
import { z } from 'zod';
import { parseBody, resolveBranchIdFilter } from '../helpers';
import type { StaffRequest } from '../middleware/staff-auth.middleware';
import AdminFinanceExpenseService from '../services/admin-finance-expense.service';
import { SuccessHandlerUtil } from '../utils';

const createSchema = z.object({
  title: z.string().min(1),
  amount: z.coerce.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  purpose: z.enum(['car', 'branch_rent', 'salary', 'other']),
  relatedEntityType: z.enum(['car', 'branch', 'instructor']).nullish(),
  relatedEntityId: z.string().nullish(),
  expenseSubtype: z.string().nullish(),
  customPurposeText: z.string().nullish(),
  notes: z.string().nullish(),
});

const updateSchema = createSchema.partial().refine((obj) => Object.keys(obj).length > 0, {
  message: 'At least one field is required',
});

export default class AdminFinanceExpenseController {
  static async list(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const branchId = await resolveBranchIdFilter(req);
      const data = await AdminFinanceExpenseService.list(branchId);
      SuccessHandlerUtil.handleList(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async create(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const body = parseBody(createSchema, req.body);
      const staffId = req.staff?.sub != null ? Number(req.staff.sub) : undefined;
      const createdByUserId = Number.isFinite(staffId) && staffId! > 0 ? staffId : undefined;
      const row = await AdminFinanceExpenseService.create(body, createdByUserId);
      SuccessHandlerUtil.handleAdd(res, next, row);
    } catch (e) {
      next(e);
    }
  }

  static async update(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const body = parseBody(updateSchema, req.body);
      const row = await AdminFinanceExpenseService.update(String(req.params.id), body);
      SuccessHandlerUtil.handleUpdate(res, next, row);
    } catch (e) {
      next(e);
    }
  }

  static async remove(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      await AdminFinanceExpenseService.remove(String(req.params.id));
      res.sendStatus(204);
    } catch (e) {
      next(e);
    }
  }
}
