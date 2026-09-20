import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { parseBody } from '../helpers';
import BranchService from '../services/branch.service';
import BranchScheduleService from '../services/branch-schedule.service';
import PracticalSlotPlanService from '../services/practical-slot-plan.service';
import { SuccessHandlerUtil } from '../utils';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';

const { ResourceNotFoundError } = ErrorsUtil;

/** Optional contact fields: allow clearing with null / empty string. */
const optionalContactField = z.union([z.string(), z.null()]).optional();

const createSchema = z.object({
  cityId: z.coerce.number().int().positive(),
  name: z.string().min(1),
  mapUrl: z.string().min(1),
  label: optionalContactField,
  phone: optionalContactField,
  email: optionalContactField,
  workHours: optionalContactField,
});

const updateSchema = createSchema.partial();

function normalizeContactField(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function toBranchJson(b: Awaited<ReturnType<typeof BranchService.list>>[number]) {
  return {
    id: b.id,
    cityId: b.cityId,
    name: b.name,
    mapUrl: b.mapUrl,
    label: b.label ?? undefined,
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
  /** Practical lesson slot grid for this branch (used by student/admin booking UIs). */
  static async practicalSlotPlan(req: Request, res: Response, next: NextFunction) {
    try {
      const branchId = Number(req.params.id);
      if (!Number.isFinite(branchId) || branchId <= 0) {
        return next(new ResourceNotFoundError('Branch not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      const exists = await BranchScheduleService.branchExists(branchId);
      if (!exists) {
        return next(new ResourceNotFoundError('Branch not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      const rows = await PracticalSlotPlanService.getPlan(branchId);
      SuccessHandlerUtil.handleGet(res, next, { branchId, rows });
    } catch (e) {
      next(e);
    }
  }

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
        label: normalizeContactField(body.label) ?? null,
        phone: normalizeContactField(body.phone) ?? null,
        email: normalizeContactField(body.email) ?? null,
        workHours: normalizeContactField(body.workHours) ?? null,
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
        label: normalizeContactField(body.label),
        phone: normalizeContactField(body.phone),
        email: normalizeContactField(body.email),
        workHours: normalizeContactField(body.workHours),
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
