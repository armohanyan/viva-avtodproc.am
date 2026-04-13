import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { parseBody } from '../helpers';
import StudentAdminService from '../services/student-admin.service';
import StudentEntitlementsService from '../services/student-entitlements.service';
import { SuccessHandlerUtil } from '../utils';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';

const { ResourceNotFoundError } = ErrorsUtil;

const createSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  branchId: z.string().min(1),
  packageId: z.string().min(1),
  instructorUserId: z.string().nullable().optional(),
  lessonsCompleted: z.number().int().nonnegative().optional(),
  lessonsTotal: z.number().int().positive().optional(),
  enrollmentStatus: z.string().optional(),
  skillRating: z.number().int().optional(),
  licenseAchieved: z.boolean().optional(),
  joinedIso: z.string().optional(),
});

const updateSchema = createSchema.partial().omit({ id: true });

const entitlementsPackageSchema = z.object({
  packageId: z.string().min(1),
});

const entitlementsExtraSchema = z.object({
  practicalTotal: z.number().int().positive().optional(),
});

export default class StudentController {
  static async list(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await StudentAdminService.list();
      SuccessHandlerUtil.handleList(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const body = parseBody(createSchema, req.body);
      const row = await StudentAdminService.create(body);
      if (!row) {
        return next(new ResourceNotFoundError('Invalid package', HttpStatusCodesUtil.NOT_FOUND));
      }
      SuccessHandlerUtil.handleAdd(res, next, row);
    } catch (e) {
      next(e);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const body = parseBody(updateSchema, req.body);
      const row = await StudentAdminService.update(req.params.id!, body);
      if (!row) {
        return next(new ResourceNotFoundError('Student not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      SuccessHandlerUtil.handleUpdate(res, next, row);
    } catch (e) {
      next(e);
    }
  }

  static async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const ok = await StudentAdminService.remove(req.params.id!);
      if (!ok) {
        return next(new ResourceNotFoundError('Student not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      res.sendStatus(204);
    } catch (e) {
      next(e);
    }
  }

  static async entitlements(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await StudentEntitlementsService.get(req.params.id!);
      if (!data) {
        return next(new ResourceNotFoundError('Student not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      res.status(200).json(data);
    } catch (e) {
      next(e);
    }
  }

  static async entitlementsAssignPackage(req: Request, res: Response, next: NextFunction) {
    try {
      const body = parseBody(entitlementsPackageSchema, req.body);
      const data = await StudentEntitlementsService.assignPackage(req.params.id!, body.packageId);
      if (!data) {
        return next(new ResourceNotFoundError('Student or package not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      SuccessHandlerUtil.handleUpdate(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async entitlementsAddExtra(req: Request, res: Response, next: NextFunction) {
    try {
      const body = parseBody(entitlementsExtraSchema, req.body);
      const data = await StudentEntitlementsService.addExtraPractical(req.params.id!, body.practicalTotal);
      if (!data) {
        return next(
          new ResourceNotFoundError('Student profile required for add-on lessons', HttpStatusCodesUtil.NOT_FOUND),
        );
      }
      SuccessHandlerUtil.handleUpdate(res, next, data);
    } catch (e) {
      next(e);
    }
  }
}
