import type { NextFunction, Response } from 'express';
import { z } from 'zod';
import { parseBody, resolveBranchIdFilter } from '../helpers';
import type { StaffRequest } from '../middleware/staff-auth.middleware';
import AdminInstructorKmLogService from '../services/admin-instructor-km-log.service';
import { SuccessHandlerUtil } from '../utils';

const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const createSchema = z.object({
  instructorUserId: z.coerce.number().int().positive(),
  date: dateField,
  km: z.coerce.number().positive(),
});

const updateSchema = createSchema.partial().refine((obj) => Object.keys(obj).length > 0, {
  message: 'At least one field is required',
});

function parseOptionalPositiveInt(value: unknown): number | undefined {
  if (value == null || value === '') return undefined;
  const n = Number.parseInt(String(value), 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export default class AdminInstructorKmLogController {
  static async list(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      const branchId = await resolveBranchIdFilter(req);
      const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
      const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;
      const instructorUserId = parseOptionalPositiveInt(req.query.instructorUserId);
      const data = await AdminInstructorKmLogService.list(
        startDate,
        endDate,
        branchId,
        instructorUserId,
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
      const row = await AdminInstructorKmLogService.create(
        {
          instructorUserId: body.instructorUserId,
          date: body.date,
          km: body.km,
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
      const row = await AdminInstructorKmLogService.update(Number(req.params.id), {
        ...(body.instructorUserId !== undefined ? { instructorUserId: body.instructorUserId } : {}),
        ...(body.date !== undefined ? { date: body.date } : {}),
        ...(body.km !== undefined ? { km: body.km } : {}),
      });
      SuccessHandlerUtil.handleUpdate(res, next, row);
    } catch (e) {
      next(e);
    }
  }

  static async remove(req: StaffRequest, res: Response, next: NextFunction) {
    try {
      await AdminInstructorKmLogService.remove(Number(req.params.id));
      res.sendStatus(204);
    } catch (e) {
      next(e);
    }
  }
}
