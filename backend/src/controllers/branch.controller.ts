import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { parseBody } from '../helpers';
import BranchService from '../services/branch.service';
import BranchScheduleService from '../services/branch-schedule.service';
import { SuccessHandlerUtil } from '../utils';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';

const { ResourceNotFoundError } = ErrorsUtil;

const createSchema = z.object({
  cityId: z.coerce.number().int().positive(),
  name: z.string().min(1),
  mapUrl: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().optional(),
  workHours: z.string().optional(),
});

const updateSchema = createSchema.partial();

function toBranchJson(b: Awaited<ReturnType<typeof BranchService.list>>[number]) {
  return {
    id: b.id,
    cityId: b.cityId,
    name: b.name,
    mapUrl: b.mapUrl,
    phone: b.phone ?? undefined,
    email: b.email ?? undefined,
    workHours: b.workHours ?? undefined,
  };
}

export default class BranchController {
  static async list(_req: Request, res: Response, next: NextFunction) {
    try {
      const rows = await BranchService.list();
      SuccessHandlerUtil.handleList(res, next, rows.map(toBranchJson));
    } catch (e) {
      next(e);
    }
  }

  /** Resolved branch hours for booking calendars (DB rules → workHours text → default 09:00–18:00). */
  static async bookingSchedule(req: Request, res: Response, next: NextFunction) {
    try {
      const branchId = Number(req.params.id);
      if (!Number.isFinite(branchId) || branchId <= 0) {
        return next(new ResourceNotFoundError('Branch not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      const exists = await BranchScheduleService.branchExists(branchId);
      if (!exists) {
        return next(new ResourceNotFoundError('Branch not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      const rules = await BranchScheduleService.resolveEffectiveRulesForBranch(branchId);
      SuccessHandlerUtil.handleList(res, next, rules);
    } catch (e) {
      next(e);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const body = parseBody(createSchema, req.body);
      const row = await BranchService.create({
        ...body,
        phone: body.phone ?? null,
        email: body.email ?? null,
        workHours: body.workHours ?? null,
      });
      SuccessHandlerUtil.handleAdd(res, next, toBranchJson(row));
    } catch (e) {
      next(e);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const body = parseBody(updateSchema, req.body);
      const row = await BranchService.update(Number(req.params.id), {
        ...body,
        phone: body.phone === undefined ? undefined : body.phone ?? null,
        email: body.email === undefined ? undefined : body.email ?? null,
        workHours: body.workHours === undefined ? undefined : body.workHours ?? null,
      });
      if (!row) {
        return next(new ResourceNotFoundError('Branch not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      SuccessHandlerUtil.handleUpdate(res, next, toBranchJson(row));
    } catch (e) {
      next(e);
    }
  }

  static async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const ok = await BranchService.remove(Number(req.params.id));
      if (!ok) {
        return next(new ResourceNotFoundError('Branch not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      res.sendStatus(204);
    } catch (e) {
      next(e);
    }
  }
}
