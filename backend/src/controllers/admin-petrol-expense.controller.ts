import type { NextFunction, Response } from 'express';
import { z } from 'zod';
import { PETROL_PAYMENT_TYPES } from '../constants/petrol-payment-type';
import { PETROL_TYPES } from '../constants/petrol-type';
import { parseBody, resolveBranchIdFilter } from '../helpers';
import type { StaffRequest } from '../middleware/staff-auth.middleware';
import AdminPetrolExpenseService from '../services/admin-petrol-expense.service';
import PetrolExpenseBulkImportService from '../services/petrol-expense-bulk-import.service';
import { SuccessHandlerUtil } from '../utils';

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

function normalizeDecimalInput(val: unknown): unknown {
  if (val === '' || val === null || val === undefined) return null;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const text = val.trim().replace(/\s/g, '').replace(/\u00a0/g, '');
    if (!text) return null;
    const lastComma = text.lastIndexOf(',');
    const lastDot = text.lastIndexOf('.');
    if (lastComma >= 0 && lastDot >= 0) {
      if (lastComma > lastDot) {
        return text.replace(/\./g, '').replace(',', '.');
      }
      return text.replace(/,/g, '');
    }
    if (lastComma >= 0) return text.replace(',', '.');
    return text;
  }
  return val;
}

const petrolCountField = z.preprocess(normalizeDecimalInput, z.coerce.number().positive().nullable());

const optionalCarIdField = z.preprocess((val) => {
  if (val === '' || val === null || val === undefined) return null;
  const n = typeof val === 'number' ? val : Number(val);
  return Number.isFinite(n) ? n : val;
}, z.union([z.null(), z.number().int().positive()]));

const createSchema = z.object({
  carId: optionalCarIdField.optional(),
  instructorUserId: z.coerce.number().int().positive(),
  date: dateField,
  petrolType: z.enum(PETROL_TYPES),
  petrolCount: petrolCountField.optional(),
  paymentType: z.preprocess((val) => {
    if (val === 'pos' || val === 'POS') return 'card';
    return val;
  }, z.enum(PETROL_PAYMENT_TYPES).optional()),
  price: z.preprocess(normalizeDecimalInput, z.coerce.number().min(0)),
  description: z.string().max(4000).nullish(),
});

const updateSchema = createSchema.partial().refine((obj) => Object.keys(obj).length > 0, {
  message: 'At least one field is required',
});

const bulkImportEntrySchema = createSchema;
const bulkImportBodySchema = z.object({
  records: z.array(bulkImportEntrySchema).min(1).max(10000),
});

export default class AdminPetrolExpenseController {
  static async list(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const branchId = await resolveBranchIdFilter(req);
      const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
      const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;
      const data = await AdminPetrolExpenseService.list(startDate, endDate, branchId);
      SuccessHandlerUtil.handleGet(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async create(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const body = parseBody(createSchema, req.body);
      const staffId = req.staff?.sub != null ? Number(req.staff.sub) : undefined;
      const createdByUserId = Number.isFinite(staffId) && staffId! > 0 ? staffId : undefined;
      const row = await AdminPetrolExpenseService.create(
        {
          carId: body.carId ?? null,
          instructorUserId: body.instructorUserId,
          date: body.date,
          petrolType: body.petrolType,
          petrolCount: body.petrolCount ?? null,
          paymentType: body.paymentType,
          price: body.price,
          description: body.description ?? null,
        },
        createdByUserId,
      );
      SuccessHandlerUtil.handleAdd(res, next, row);
    } catch (e) {
      next(e);
    }
  }

  static async update(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const body = parseBody(updateSchema, req.body);
      const row = await AdminPetrolExpenseService.update(Number(req.params.id), {
        ...(body.carId !== undefined ? { carId: body.carId } : {}),
        ...(body.instructorUserId !== undefined ? { instructorUserId: body.instructorUserId } : {}),
        ...(body.date !== undefined ? { date: body.date } : {}),
        ...(body.petrolType !== undefined ? { petrolType: body.petrolType } : {}),
        ...(body.petrolCount !== undefined ? { petrolCount: body.petrolCount ?? null } : {}),
        ...(body.paymentType !== undefined ? { paymentType: body.paymentType } : {}),
        ...(body.price !== undefined ? { price: body.price } : {}),
        ...(body.description !== undefined ? { description: body.description ?? null } : {}),
      });
      SuccessHandlerUtil.handleUpdate(res, next, row);
    } catch (e) {
      next(e);
    }
  }

  static async remove(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      await AdminPetrolExpenseService.remove(Number(req.params.id));
      res.sendStatus(204);
    } catch (e) {
      next(e);
    }
  }

  static async bulkImport(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const body = parseBody(bulkImportBodySchema, req.body);
      const staffId = req.staff?.sub != null ? Number(req.staff.sub) : undefined;
      const createdByUserId = Number.isFinite(staffId) && staffId! > 0 ? staffId : undefined;
      const records = body.records.map((row) => ({
        carId: row.carId ?? null,
        instructorUserId: row.instructorUserId,
        date: row.date,
        petrolType: row.petrolType,
        petrolCount: row.petrolCount ?? null,
        paymentType: row.paymentType,
        price: row.price,
        description: row.description ?? null,
      }));
      const data = await PetrolExpenseBulkImportService.bulkImport(records, createdByUserId);
      SuccessHandlerUtil.handleAdd(res, next, data);
    } catch (e) {
      next(e);
    }
  }
}
