import type { NextFunction, Response } from 'express';
import { z } from 'zod';
import { PETROL_TYPES } from '../constants/petrol-type';
import { parseBody } from '../helpers';
import type { StaffRequest } from '../middleware/staff-auth.middleware';
import PetrolExpenseRequestService from '../services/petrol-expense-request.service';
import { SuccessHandlerUtil } from '../utils';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';

const { UnauthorizedError } = ErrorsUtil;

const createSchema = z.object({
  carId: z.coerce.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .optional()
    .nullable(),
  petrolType: z.enum(PETROL_TYPES),
  price: z.coerce.number().int().positive(),
  photoUrl: z
    .string()
    .trim()
    .min(1)
    .max(500)
    .refine((v) => v.includes('/upload/'), { message: 'photoUrl must be an uploaded image URL' }),
  description: z.string().max(2000).optional().nullable(),
});

function requesterUserId(req: StaffRequest): number {
  const id = req.staff?.sub != null ? Number(req.staff.sub) : Number.NaN;
  if (!Number.isFinite(id) || id <= 0) {
    throw new UnauthorizedError('Authentication required', HttpStatusCodesUtil.UNAUTHORIZED);
  }
  return id;
}

export default class InstructorPetrolExpenseRequestController {
  static async cars(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const data = await PetrolExpenseRequestService.carsForInstructor(requesterUserId(req));
      SuccessHandlerUtil.handleGet(res, next, { items: data });
    } catch (e) {
      next(e);
    }
  }

  static async list(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const data = await PetrolExpenseRequestService.listForInstructor(requesterUserId(req));
      SuccessHandlerUtil.handleGet(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async create(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const body = parseBody(createSchema, req.body);
      const row = await PetrolExpenseRequestService.create(requesterUserId(req), {
        carId: body.carId,
        date: body.date,
        time: body.time ?? null,
        petrolType: body.petrolType,
        price: body.price,
        photoUrl: body.photoUrl,
        description: body.description ?? null,
      });
      SuccessHandlerUtil.handleAdd(res, next, row);
    } catch (e) {
      next(e);
    }
  }
}
