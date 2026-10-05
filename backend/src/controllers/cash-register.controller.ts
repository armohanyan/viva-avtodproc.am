import type { NextFunction, Response } from 'express';
import { z } from 'zod';
import { DIRECTOR_CASH_DIRECTIONS } from '../constants/director-cash-direction';
import { parseBody, parseQuery, resolveBranchIdFilter } from '../helpers';
import { directorAmdField, directorCommentField } from '../helpers/director-form.helper';
import type { StaffRequest } from '../middleware/staff-auth.middleware';
import CashRegisterService from '../services/cash-register.service';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';
import { SuccessHandlerUtil } from '../utils';

const { InputValidationError } = ErrorsUtil;

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

function staffId(req: StaffRequest): number {
  const id = req.staff?.sub != null ? Number(req.staff.sub) : NaN;
  if (!Number.isFinite(id) || id <= 0) {
    throw new InputValidationError('Staff account is required.', HttpStatusCodesUtil.BAD_REQUEST);
  }
  return id;
}

function isSuperAdmin(req: StaffRequest): boolean {
  return req.staff?.accountType === 'super_admin';
}

const entryBody = z.object({
  direction: z.enum(DIRECTOR_CASH_DIRECTIONS),
  amount: directorAmdField.pipe(z.number().int().positive()),
  comment: directorCommentField.optional(),
});

export default class CashRegisterController {
  static async periodSummary(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = parseQuery(
        z.object({ startDate: dateField, endDate: dateField }),
        req.query,
      );
      const branchId = await resolveBranchIdFilter(req);
      const data = await CashRegisterService.periodSummary({
        startDate,
        endDate,
        branchId,
        allowAllBranches: isSuperAdmin(req),
      });
      SuccessHandlerUtil.handleGet(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async list(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const { startDate, endDate } = parseQuery(
        z.object({ startDate: dateField, endDate: dateField }),
        req.query,
      );
      const branchId = await resolveBranchIdFilter(req);
      const data = await CashRegisterService.list({
        startDate,
        endDate,
        branchId,
        allowAllBranches: isSuperAdmin(req),
      });
      SuccessHandlerUtil.handleList(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async detail(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const data = await CashRegisterService.detail(Number(req.params.id));
      SuccessHandlerUtil.handleGet(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async open(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const body = parseBody(
        z.object({
          branchId: z.coerce.number().int().positive(),
          openingBalance: directorAmdField,
        }),
        req.body,
      );
      const data = await CashRegisterService.open(body, staffId(req));
      SuccessHandlerUtil.handleAdd(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async close(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const body = parseBody(
        z.object({
          actualBalance: directorAmdField,
        }),
        req.body,
      );
      const data = await CashRegisterService.close(Number(req.params.id), body.actualBalance, staffId(req));
      SuccessHandlerUtil.handleUpdate(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async createEntry(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const body = parseBody(entryBody, req.body);
      const data = await CashRegisterService.createEntry(Number(req.params.id), body, staffId(req));
      SuccessHandlerUtil.handleAdd(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async updateEntry(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const body = parseBody(entryBody, req.body);
      const data = await CashRegisterService.updateEntry(
        Number(req.params.id),
        Number(req.params.entryId),
        body,
      );
      SuccessHandlerUtil.handleUpdate(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async deleteEntry(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      await CashRegisterService.deleteEntry(Number(req.params.id), Number(req.params.entryId));
      res.sendStatus(204);
    } catch (e) {
      next(e);
    }
  }
}
