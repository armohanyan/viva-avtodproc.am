import type { NextFunction, Response } from 'express';
import { z } from 'zod';
import { parseBody, parseQuery } from '../helpers';
import type { StaffRequest } from '../middleware/staff-auth.middleware';
import StaffEmployeeService from '../services/staff-employee.service';
import { SuccessHandlerUtil } from '../utils';

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const positionZ = z.enum([
  'instructor',
  'theory_teacher',
  'instructor_and_theory',
  'director',
  'admin',
  'cleaner',
  'other',
]);

const createSchema = z.object({
  name: z.string().trim().min(1).max(255),
  userId: z.coerce.number().int().positive().optional().nullable(),
  position: positionZ,
  jobTitle: z.string().trim().max(128).optional().nullable(),
  startDateIso: dateField,
  phone: z.string().trim().max(64).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  isActive: z.boolean().optional(),
});

const updateSchema = createSchema.partial();

function staffUserId(req: StaffRequest): number | undefined {
  const id = req.staff?.sub != null ? Number(req.staff.sub) : undefined;
  return Number.isFinite(id) && id! > 0 ? id : undefined;
}

export default class StaffEmployeeController {
  static async list(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const query = parseQuery(
        z.object({ activeOnly: z.enum(['0', '1', 'true', 'false']).optional() }),
        req.query,
      );
      const activeOnly = query.activeOnly === '1' || query.activeOnly === 'true';
      const data = await StaffEmployeeService.list(activeOnly);
      SuccessHandlerUtil.handleGet(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async create(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const body = parseBody(createSchema, req.body);
      const row = await StaffEmployeeService.create(body, staffUserId(req));
      SuccessHandlerUtil.handleAdd(res, next, row);
    } catch (e) {
      next(e);
    }
  }

  static async update(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const body = parseBody(updateSchema, req.body);
      const row = await StaffEmployeeService.update(Number(req.params.id), body);
      SuccessHandlerUtil.handleUpdate(res, next, row);
    } catch (e) {
      next(e);
    }
  }

  static async remove(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      await StaffEmployeeService.remove(Number(req.params.id));
      res.sendStatus(204);
    } catch (e) {
      next(e);
    }
  }
}
