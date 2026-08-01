import type { NextFunction, Response } from 'express';
import { z } from 'zod';
import { parseBody, parseQuery } from '../helpers';
import type { StaffRequest } from '../middleware/staff-auth.middleware';
import AdminSalaryService from '../services/admin-salary.service';
import { SuccessHandlerUtil } from '../utils';

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const calculatedSchema = z.object({
  kind: z.enum(['instructor', 'theory_teacher']),
  employeeUserId: z.coerce.number().int().positive(),
  title: z.string().trim().min(1).max(255),
  periodStart: dateField,
  periodEnd: dateField,
  notes: z.string().trim().max(2000).optional().nullable(),
});

const otherSchema = z.object({
  kind: z.literal('other'),
  title: z.string().trim().min(1).max(255),
  employeeName: z.string().trim().max(255).optional().nullable(),
  amountAmd: z.coerce.number().int().positive(),
  periodStart: dateField,
  periodEnd: dateField,
  notes: z.string().trim().max(2000).optional().nullable(),
});

const createSchema = z.discriminatedUnion('kind', [calculatedSchema, otherSchema]);

function staffUserId(req: StaffRequest): number | undefined {
  const id = req.staff?.sub != null ? Number(req.staff.sub) : undefined;
  return Number.isFinite(id) && id! > 0 ? id : undefined;
}

const lessonsQuerySchema = z.object({
  kind: z.enum(['instructor', 'theory_teacher']),
  employeeUserId: z.coerce.number().int().positive(),
  startDate: dateField.optional(),
  endDate: dateField.optional(),
});

export default class AdminSalaryController {
  static async lessons(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const query = parseQuery(lessonsQuerySchema, req.query);
      const data = await AdminSalaryService.lessons(
        query.kind,
        query.employeeUserId,
        query.startDate,
        query.endDate,
      );
      SuccessHandlerUtil.handleGet(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async report(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
      const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;
      const data = await AdminSalaryService.report(startDate, endDate);
      SuccessHandlerUtil.handleGet(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async listPayments(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
      const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;
      const data = await AdminSalaryService.listPayments(startDate, endDate);
      SuccessHandlerUtil.handleGet(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async createPayment(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const body = parseBody(createSchema, req.body);
      const createdByUserId = staffUserId(req);
      const row =
        body.kind === 'other'
          ? await AdminSalaryService.createOtherPayment(body, createdByUserId)
          : await AdminSalaryService.createCalculatedPayment(body, createdByUserId);
      SuccessHandlerUtil.handleAdd(res, next, row);
    } catch (e) {
      next(e);
    }
  }

  static async removePayment(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      await AdminSalaryService.removePayment(Number(req.params.id));
      res.sendStatus(204);
    } catch (e) {
      next(e);
    }
  }
}
