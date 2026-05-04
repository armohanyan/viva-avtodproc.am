import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { parseBody, verifyAccessToken } from '../helpers';
import FinanceService from '../services/finance.service';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';
import { SuccessHandlerUtil } from '../utils';

const { InputValidationError, UnauthorizedError, PermissionError } = ErrorsUtil;

const financeTxBodySchema = z.object({
  customer: z.string().min(1),
  email: z.string().optional(),
  /** Omitted for booking-linked manual payments: server fills from the booking. */
  description: z.string().optional(),
  branchId: z.coerce.number().int().positive(),
  /** Defaults to `office` when omitted (e.g. admin booking payment). */
  channel: z.enum(['online', 'pos', 'office', 'bank']).optional(),
  method: z.enum(['card', 'idram', 'cash', 'transfer']),
  grossAmd: z.number().int().nonnegative(),
  /** Defaults to `0` when omitted. */
  feeAmd: z.number().int().nonnegative().optional(),
  /** Defaults to `completed` when omitted. */
  status: z.enum(['completed', 'pending', 'failed', 'refunded']).optional(),
  providerRef: z.string().optional(),
  source: z.enum(['system', 'manual']),
  entryType: z.enum(['income', 'expense']).optional(),
  expenseKind: z
    .enum(['salary', 'hourly_rate', 'rent', 'utilities', 'maintenance', 'marketing', 'booking_refund', 'other'])
    .nullish(),
  employeeName: z.string().nullish(),
  units: z.number().positive().nullish(),
  unitRateAmd: z.number().int().positive().nullish(),
  createdAt: z.string().optional(),
  bookingId: z.coerce.number().int().positive().nullish(),
});

const createSchema = financeTxBodySchema.superRefine((data, ctx) => {
  const desc = (data.description ?? '').trim();
  const bid = data.bookingId != null && data.bookingId > 0;
  if (!desc && !bid) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'description is required when bookingId is not set',
      path: ['description'],
    });
  }
});

const approveRefundBodySchema = z.object({
  /** Positive AMD; defaults to full original payment when omitted. */
  refundAmountAmd: z.coerce.number().int().positive().optional(),
});

const updateSchema = financeTxBodySchema
  .omit({ source: true })
  .partial()
  .refine((obj: Record<string, unknown>) => Object.keys(obj).length > 0, {
    message: 'At least one field is required',
  });

export default class FinanceController {
  private static readBearerToken(req: Request): string | undefined {
    const raw = req.headers.authorization;
    return raw?.startsWith('Bearer ') ? raw.slice(7).trim() : undefined;
  }

  private static requireStudentUserId(req: Request): number {
    const token = FinanceController.readBearerToken(req);
    if (!token) {
      throw new UnauthorizedError('Authentication required', HttpStatusCodesUtil.UNAUTHORIZED);
    }
    let payload: ReturnType<typeof verifyAccessToken>;
    try {
      payload = verifyAccessToken(token);
    } catch {
      throw new UnauthorizedError('Invalid or expired token', HttpStatusCodesUtil.UNAUTHORIZED);
    }
    if (payload.accountType !== 'student') {
      throw new PermissionError('Student access required', HttpStatusCodesUtil.FORBIDDEN);
    }
    const userId = Number(payload.sub);
    if (!Number.isFinite(userId) || userId <= 0) {
      throw new UnauthorizedError('Invalid token subject', HttpStatusCodesUtil.UNAUTHORIZED);
    }
    return userId;
  }

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

  static async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
        return next(new InputValidationError('Invalid transaction id', HttpStatusCodesUtil.BAD_REQUEST));
      }
      await FinanceService.removeManual(id);
      res.sendStatus(204);
    } catch (e) {
      next(e);
    }
  }

  static async requestRefund(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
        return next(new InputValidationError('Invalid transaction id', HttpStatusCodesUtil.BAD_REQUEST));
      }
      const studentUserId = FinanceController.requireStudentUserId(req);
      const row = await FinanceService.requestRefundForStudentUser(id, studentUserId);
      SuccessHandlerUtil.handleUpdate(res, next, row);
    } catch (e) {
      next(e);
    }
  }

  static async approveRefund(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
        return next(new InputValidationError('Invalid transaction id', HttpStatusCodesUtil.BAD_REQUEST));
      }
      const body = parseBody(approveRefundBodySchema, req.body ?? {});
      const row = await FinanceService.approveRefundRequest(id, body.refundAmountAmd);
      SuccessHandlerUtil.handleUpdate(res, next, row);
    } catch (e) {
      next(e);
    }
  }

  static async rejectRefund(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
        return next(new InputValidationError('Invalid transaction id', HttpStatusCodesUtil.BAD_REQUEST));
      }
      const row = await FinanceService.rejectRefundRequest(id);
      SuccessHandlerUtil.handleUpdate(res, next, row);
    } catch (e) {
      next(e);
    }
  }
}
