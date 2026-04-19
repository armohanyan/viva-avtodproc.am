import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { parseBody } from '../helpers';
import FinanceService from '../services/finance.service';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';
import { SuccessHandlerUtil } from '../utils';

const { InputValidationError } = ErrorsUtil;

const createSchema = z.object({
  customer: z.string().min(1),
  email: z.string().optional(),
  description: z.string().min(1),
  branchId: z.coerce.number().int().positive(),
  channel: z.enum(['online', 'pos', 'office', 'bank']),
  method: z.enum(['card', 'idram', 'cash', 'transfer']),
  grossAmd: z.number().int().nonnegative(),
  feeAmd: z.number().int().nonnegative(),
  status: z.enum(['completed', 'pending', 'failed', 'refunded']),
  providerRef: z.string().optional(),
  source: z.enum(['system', 'manual']),
  createdAt: z.string().optional(),
  bookingId: z.coerce.number().int().positive().nullish(),
});

const updateSchema = createSchema
  .omit({ source: true })
  .partial()
  .refine((obj) => Object.keys(obj).length > 0, { message: 'At least one field is required' });

export default class FinanceController {
  static async listStudent(req: Request, res: Response, next: NextFunction) {
    try {
      const raw = req.query.studentUserId;
      const studentUserIdRaw =
        typeof raw === 'string' ? raw : Array.isArray(raw) && typeof raw[0] === 'string' ? raw[0] : undefined;
      const studentUserId = studentUserIdRaw !== undefined ? Number(studentUserIdRaw) : NaN;
      if (!Number.isFinite(studentUserId) || studentUserId <= 0) {
        return SuccessHandlerUtil.handleList(res, next, []);
      }
      const data = await FinanceService.listForStudentUser(studentUserId);
      SuccessHandlerUtil.handleList(res, next, data);
    } catch (e) {
      next(e);
    }
  }

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

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
        return next(new InputValidationError('Invalid transaction id', HttpStatusCodesUtil.BAD_REQUEST));
      }
      const body = parseBody(updateSchema, req.body);
      const row = await FinanceService.updateManual(id, body);
      SuccessHandlerUtil.handleUpdate(res, next, row);
    } catch (e) {
      next(e);
    }
  }
}
