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

const payrollSchema = z.object({
  kind: z.literal('payroll'),
  employeeUserId: z.coerce.number().int().positive(),
  title: z.string().trim().min(1).max(255),
  periodStart: dateField,
  periodEnd: dateField,
  status: z.enum(['approved', 'paid']).optional().default('paid'),
  notes: z.string().trim().max(2000).optional().nullable(),
});

const createSchema = z.discriminatedUnion('kind', [calculatedSchema, otherSchema, payrollSchema]);

const cardTransferSchema = z.object({
  instructorUserId: z.coerce.number().int().positive(),
  amountAmd: z.coerce.number().int().positive(),
  autoMonthly: z.boolean().optional().default(true),
  notes: z.string().trim().max(2000).optional().nullable(),
});

const compensationTypeZ = z.enum([
  'fixed_monthly',
  'hourly_practical',
  'per_theory_lesson',
  'per_group',
]);

const createRuleSchema = z.object({
  staffEmployeeId: z.coerce.number().int().positive(),
  compensationType: compensationTypeZ,
  roleLabel: z.string().trim().min(1).max(128),
  rateAmd: z.coerce.number().int().positive(),
  effectiveFrom: dateField,
  effectiveTo: dateField.optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

const updateRuleSchema = z.object({
  roleLabel: z.string().trim().min(1).max(128).optional(),
  rateAmd: z.coerce.number().int().positive().optional(),
  effectiveFrom: dateField.optional(),
  effectiveTo: dateField.optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

const createAdjustmentSchema = z.object({
  employeeUserId: z.coerce.number().int().positive(),
  dateIso: dateField,
  kind: z.enum(['bonus', 'additional', 'deduction', 'other']),
  amountAmd: z.coerce.number().int().positive(),
  title: z.string().trim().min(1).max(255),
  notes: z.string().trim().max(2000).optional().nullable(),
});

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

const employeeDetailQuerySchema = z.object({
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

  static async employeeDetail(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const query = parseQuery(employeeDetailQuerySchema, req.query);
      const data = await AdminSalaryService.employeeDetail(
        query.employeeUserId,
        query.startDate,
        query.endDate,
      );
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
      let row;
      if (body.kind === 'other') {
        row = await AdminSalaryService.createOtherPayment(body, createdByUserId);
      } else if (body.kind === 'payroll') {
        row = await AdminSalaryService.createPayrollPayment(body, createdByUserId);
      } else {
        row = await AdminSalaryService.createCalculatedPayment(body, createdByUserId);
      }
      SuccessHandlerUtil.handleAdd(res, next, row);
    } catch (e) {
      next(e);
    }
  }

  static async markPaymentPaid(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const row = await AdminSalaryService.markPaymentPaid(Number(req.params.id));
      SuccessHandlerUtil.handleUpdate(res, next, row);
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

  static async listCardTransfers(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const data = await AdminSalaryService.listCardTransfers();
      SuccessHandlerUtil.handleGet(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async createCardTransfer(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const body = parseBody(cardTransferSchema, req.body);
      const created = await AdminSalaryService.createCardTransfer(body, staffUserId(req));
      SuccessHandlerUtil.handleAdd(res, next, created);
    } catch (e) {
      next(e);
    }
  }

  static async updateCardTransfer(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const body = parseBody(cardTransferSchema, req.body);
      const updated = await AdminSalaryService.updateCardTransfer(Number(req.params.id), body);
      SuccessHandlerUtil.handleUpdate(res, next, updated);
    } catch (e) {
      next(e);
    }
  }

  static async removeCardTransfer(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      await AdminSalaryService.removeCardTransfer(Number(req.params.id));
      res.sendStatus(204);
    } catch (e) {
      next(e);
    }
  }

  static async listCompensationRules(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const fromStaff =
        typeof req.query.staffEmployeeId === 'string' ? Number(req.query.staffEmployeeId) : undefined;
      const data = await AdminSalaryService.listCompensationRules(
        Number.isFinite(fromStaff) ? fromStaff : undefined,
      );
      SuccessHandlerUtil.handleGet(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async createCompensationRule(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const body = parseBody(createRuleSchema, req.body);
      const created = await AdminSalaryService.createCompensationRule(body, staffUserId(req));
      SuccessHandlerUtil.handleAdd(res, next, created);
    } catch (e) {
      next(e);
    }
  }

  static async updateCompensationRule(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const body = parseBody(updateRuleSchema, req.body);
      const updated = await AdminSalaryService.updateCompensationRule(Number(req.params.id), body);
      SuccessHandlerUtil.handleUpdate(res, next, updated);
    } catch (e) {
      next(e);
    }
  }

  static async removeCompensationRule(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      await AdminSalaryService.removeCompensationRule(Number(req.params.id));
      res.sendStatus(204);
    } catch (e) {
      next(e);
    }
  }

  static async listAdjustments(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
      const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;
      const employeeUserId =
        typeof req.query.employeeUserId === 'string' ? Number(req.query.employeeUserId) : undefined;
      const data = await AdminSalaryService.listAdjustments(
        startDate,
        endDate,
        Number.isFinite(employeeUserId) ? employeeUserId : undefined,
      );
      SuccessHandlerUtil.handleGet(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async createAdjustment(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const body = parseBody(createAdjustmentSchema, req.body);
      const created = await AdminSalaryService.createAdjustment(body, staffUserId(req));
      SuccessHandlerUtil.handleAdd(res, next, created);
    } catch (e) {
      next(e);
    }
  }

  static async removeAdjustment(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      await AdminSalaryService.removeAdjustment(Number(req.params.id));
      res.sendStatus(204);
    } catch (e) {
      next(e);
    }
  }
}
