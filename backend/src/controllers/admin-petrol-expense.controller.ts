import type { NextFunction, Response } from 'express';
import { z } from 'zod';
import { PETROL_TYPES } from '../constants/petrol-type';
import { parseBody, resolveBranchIdFilter } from '../helpers';
import type { StaffRequest } from '../middleware/staff-auth.middleware';
import AdminPetrolExpenseService from '../services/admin-petrol-expense.service';
import { SuccessHandlerUtil } from '../utils';

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const petrolCountField = z.preprocess((val) => {
  if (val === '' || val === null || val === undefined) return null;
  return val;
}, z.coerce.number().positive().nullable());

const createSchema = z.object({
  carId: z.coerce.number().int().positive(),
  instructorUserId: z.coerce.number().int().positive(),
  date: dateField,
  petrolType: z.enum(PETROL_TYPES),
  petrolCount: petrolCountField.optional(),
  price: z.coerce.number().min(0),
  description: z.string().max(4000).nullish(),
});

const updateSchema = createSchema.partial().refine((obj) => Object.keys(obj).length > 0, {
  message: 'At least one field is required',
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
          carId: body.carId,
          instructorUserId: body.instructorUserId,
          date: body.date,
          petrolType: body.petrolType,
          petrolCount: body.petrolCount ?? null,
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
}
