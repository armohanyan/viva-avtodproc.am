import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { parseBody } from '../helpers';
import FinanceService from '../services/finance.service';
import { SuccessHandlerUtil } from '../utils';

const createSchema = z.object({
  id: z.string().optional(),
  customer: z.string().min(1),
  email: z.string().optional(),
  description: z.string().min(1),
  branchId: z.string().min(1),
  channel: z.enum(['online', 'pos', 'office', 'bank']),
  method: z.enum(['card', 'idram', 'cash', 'transfer']),
  grossAmd: z.number().int().nonnegative(),
  feeAmd: z.number().int().nonnegative(),
  status: z.enum(['completed', 'pending', 'failed', 'refunded']),
  providerRef: z.string().optional(),
  source: z.enum(['system', 'manual']),
  createdAt: z.string().optional(),
  bookingId: z
    .string()
    .max(64)
    .nullish()
    .transform((s) => {
      if (s == null) return undefined;
      const t = s.trim();
      return t.length ? t : undefined;
    }),
});

export default class FinanceController {
  static async list(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await FinanceService.list();
      SuccessHandlerUtil.handleList(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const body = parseBody(createSchema, req.body);
      const row = await FinanceService.create(body);
      SuccessHandlerUtil.handleAdd(res, next, row);
    } catch (e) {
      next(e);
    }
  }
}
