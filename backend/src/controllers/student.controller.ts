import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { parseBody, parseParams } from '../helpers';
import InstructorStudentRatingService from '../services/instructor-student-rating.service';
import StudentAdminService from '../services/student-admin.service';
import StudentEntitlementsService from '../services/student-entitlements.service';
import { SuccessHandlerUtil } from '../utils';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';

const { ResourceNotFoundError } = ErrorsUtil;

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  branchId: z.coerce.number().int().positive(),
  packageId: z.coerce.number().int().positive(),
  instructorUserId: z.coerce.number().int().positive().nullable().optional(),
  lessonsCompleted: z.number().int().nonnegative().optional(),
  lessonsTotal: z.number().int().positive().optional(),
  enrollmentStatus: z.string().optional(),
  skillRating: z.number().int().optional(),
  licenseAchieved: z.boolean().optional(),
  joinedIso: z.string().optional(),
});

const updateSchema = createSchema.partial();

const entitlementsPackageSchema = z.object({
  packageId: z.coerce.number().int().positive(),
});

const entitlementsExtraSchema = z.object({
  practicalTotal: z.number().int().positive().optional(),
});

const instructorRatingSubmitSchema = z.object({
  instructorUserId: z.coerce.number().int().positive(),
  stars: z.number().int().min(1).max(5),
});

const studentIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
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
      const { id } = parseParams(studentIdParamsSchema, req.params);
      const body = parseBody(updateSchema, req.body);
      const row = await StudentAdminService.update(id, body);
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
      const { id } = parseParams(studentIdParamsSchema, req.params);
      const ok = await StudentAdminService.remove(id);
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
      const { id } = parseParams(studentIdParamsSchema, req.params);
      const data = await StudentEntitlementsService.get(id);
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
      const { id } = parseParams(studentIdParamsSchema, req.params);
      const body = parseBody(entitlementsPackageSchema, req.body);
      const data = await StudentEntitlementsService.assignPackage(id, body.packageId);
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
      const { id } = parseParams(studentIdParamsSchema, req.params);
      const body = parseBody(entitlementsExtraSchema, req.body);
      const data = await StudentEntitlementsService.addExtraPractical(id, body.practicalTotal);
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

  static async instructorRatingsStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = parseParams(studentIdParamsSchema, req.params);
      const data = await InstructorStudentRatingService.getStatus(id);
      res.status(200).json(data);
    } catch (e) {
      next(e);
    }
  }

  static async instructorRatingsSubmit(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = parseParams(studentIdParamsSchema, req.params);
      const body = parseBody(instructorRatingSubmitSchema, req.body);
      await InstructorStudentRatingService.submit(id, body.instructorUserId, body.stars);
      res.sendStatus(204);
    } catch (e) {
      next(e);
    }
  }
}
