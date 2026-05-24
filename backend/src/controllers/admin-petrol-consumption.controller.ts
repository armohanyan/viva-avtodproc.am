import type { NextFunction, Response } from 'express';
import { z } from 'zod';
import { DISTANCE_UNITS, PETROL_VOLUME_UNITS } from '../constants/petrol-consumption-units';
import { parseBody, resolveBranchIdFilter } from '../helpers';
import type { StaffRequest } from '../middleware/staff-auth.middleware';
import AdminPetrolConsumptionService from '../services/admin-petrol-consumption.service';
import { SuccessHandlerUtil } from '../utils';

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const positiveNumber = z.coerce.number().positive();

const petrolAmountField = z.preprocess((val) => {
  if (val === '' || val === null || val === undefined) return null;
  return val;
}, z.coerce.number().positive().nullable());

const createSchema = z.object({
  carId: z.coerce.number().int().positive(),
  instructorUserId: z.coerce.number().int().positive(),
  date: dateField,
  distanceValue: positiveNumber,
  distanceUnit: z.enum(DISTANCE_UNITS),
  petrolAmount: petrolAmountField.optional(),
  petrolUnit: z.enum(PETROL_VOLUME_UNITS),
  description: z.string().max(4000).nullish(),
});

const updateSchema = createSchema.partial().refine((obj) => Object.keys(obj).length > 0, {
  message: 'At least one field is required',
});

function parseOptionalPositiveInt(value: unknown): number | undefined {
  if (value == null || value === '') return undefined;
  const n = Number.parseInt(String(value), 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export default class AdminPetrolConsumptionController {
  static async list(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const branchId = await resolveBranchIdFilter(req);
      const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
      const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;
      const instructorUserId = parseOptionalPositiveInt(req.query.instructorUserId);
      const carId = parseOptionalPositiveInt(req.query.carId);
      const data = await AdminPetrolConsumptionService.list(
        startDate,
        endDate,
        branchId,
        instructorUserId,
        carId,
      );
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
      const row = await AdminPetrolConsumptionService.create(
        {
          carId: body.carId,
          instructorUserId: body.instructorUserId,
          date: body.date,
          distanceValue: body.distanceValue,
          distanceUnit: body.distanceUnit,
          petrolAmount: body.petrolAmount ?? null,
          petrolUnit: body.petrolUnit,
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
      const row = await AdminPetrolConsumptionService.update(Number(req.params.id), {
        ...(body.carId !== undefined ? { carId: body.carId } : {}),
        ...(body.instructorUserId !== undefined ? { instructorUserId: body.instructorUserId } : {}),
        ...(body.date !== undefined ? { date: body.date } : {}),
        ...(body.distanceValue !== undefined ? { distanceValue: body.distanceValue } : {}),
        ...(body.distanceUnit !== undefined ? { distanceUnit: body.distanceUnit } : {}),
        ...(body.petrolAmount !== undefined ? { petrolAmount: body.petrolAmount ?? null } : {}),
        ...(body.petrolUnit !== undefined ? { petrolUnit: body.petrolUnit } : {}),
        ...(body.description !== undefined ? { description: body.description ?? null } : {}),
      });
      SuccessHandlerUtil.handleUpdate(res, next, row);
    } catch (e) {
      next(e);
    }
  }

  static async remove(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      await AdminPetrolConsumptionService.remove(Number(req.params.id));
      res.sendStatus(204);
    } catch (e) {
      next(e);
    }
  }
}
