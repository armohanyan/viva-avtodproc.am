import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { parseBody, parseParams, verifyAccessToken } from '../helpers';
import InstructorStudentRatingService from '../services/instructor-student-rating.service';
import StudentAdminService from '../services/student-admin.service';
import StudentEntitlementsService from '../services/student-entitlements.service';
import StudentExamStatsService, { studentExamStatsPayloadSchema } from '../services/student-exam-stats.service';
import { SuccessHandlerUtil } from '../utils';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';

const { ResourceNotFoundError, UnauthorizedError, PermissionError, InputValidationError } = ErrorsUtil;

function readBearerToken(req: Request): string | undefined {
  const raw = req.headers.authorization;
  return raw?.startsWith('Bearer ') ? raw.slice(7).trim() : undefined;
}

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  branchId: z.coerce.number().int().positive(),
  packageId: z.coerce.number().int().positive(),
  instructorUserId: z.coerce.number().int().positive().nullable().optional(),
  lessonsCompleted: z.number().int().nonnegative().optional(),
  lessonsTotal: z.number().int().positive().optional(),
  theoryLessonsCompleted: z.number().int().nonnegative().optional(),
  theoryLessonsTotal: z.number().int().nonnegative().optional(),
  enrollmentStatus: z.string().optional(),
  skillRating: z.number().int().optional(),
  licenseAchieved: z.boolean().optional(),
  joinedIso: z.string().optional(),
});

const updateSchema = createSchema.partial().extend({
  packageId: z.union([z.coerce.number().int().positive(), z.null()]).optional(),
});

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

const instructorFieldsPatchSchema = z
  .object({
    skillRating: z.number().int().min(0).max(10).optional(),
    licenseAchieved: z.boolean().optional(),
  })
  .refine((o) => o.skillRating !== undefined || o.licenseAchieved !== undefined, {
    message: 'At least one of skillRating or licenseAchieved is required',
  });

const MAX_EXAM_STATS_JSON_CHARS = 480_000;

function assertStudentSelfAccess(req: Request, studentId: number, next: NextFunction): boolean {
  const token = readBearerToken(req);
  if (!token) {
    next(new UnauthorizedError('Authentication required', HttpStatusCodesUtil.UNAUTHORIZED));
    return false;
  }
  let payload: ReturnType<typeof verifyAccessToken>;
  try {
    payload = verifyAccessToken(token);
  } catch {
    next(new UnauthorizedError('Invalid or expired token', HttpStatusCodesUtil.UNAUTHORIZED));
    return false;
  }
  if (payload.accountType !== 'student') {
    next(new PermissionError('Student access required', HttpStatusCodesUtil.FORBIDDEN));
    return false;
  }
  const uid = Number(payload.sub);
  if (!Number.isFinite(uid) || uid <= 0 || uid !== studentId) {
    next(new PermissionError('You can only access your own exam progress', HttpStatusCodesUtil.FORBIDDEN));
    return false;
  }
  return true;
}

export default class StudentController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const rawInst = req.query.instructorUserId;
      const instructorUserIdRaw =
        typeof rawInst === 'string' ? rawInst : Array.isArray(rawInst) && typeof rawInst[0] === 'string' ? rawInst[0] : undefined;
      const instructorUserId = instructorUserIdRaw !== undefined ? Number(instructorUserIdRaw) : undefined;

      if (instructorUserId !== undefined && Number.isFinite(instructorUserId) && instructorUserId > 0) {
        const token = readBearerToken(req);
        if (!token) {
          return next(new UnauthorizedError('Authentication required', HttpStatusCodesUtil.UNAUTHORIZED));
        }
        let payload: ReturnType<typeof verifyAccessToken>;
        try {
          payload = verifyAccessToken(token);
        } catch {
          return next(new UnauthorizedError('Invalid or expired token', HttpStatusCodesUtil.UNAUTHORIZED));
        }
        if (payload.accountType !== 'instructor') {
          return next(new PermissionError('Instructor access required', HttpStatusCodesUtil.FORBIDDEN));
        }
        const uid = Number(payload.sub);
        if (!Number.isFinite(uid) || uid <= 0 || uid !== instructorUserId) {
          return next(new PermissionError('You can only load your own students', HttpStatusCodesUtil.FORBIDDEN));
        }
        const data = await StudentAdminService.listForInstructor(instructorUserId);
        SuccessHandlerUtil.handleList(res, next, data);
        return;
      }

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

  static async patchInstructorFields(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = parseParams(studentIdParamsSchema, req.params);
      const body = parseBody(instructorFieldsPatchSchema, req.body);

      const token = readBearerToken(req);
      if (!token) {
        return next(new UnauthorizedError('Authentication required', HttpStatusCodesUtil.UNAUTHORIZED));
      }
      let payload: ReturnType<typeof verifyAccessToken>;
      try {
        payload = verifyAccessToken(token);
      } catch {
        return next(new UnauthorizedError('Invalid or expired token', HttpStatusCodesUtil.UNAUTHORIZED));
      }
      if (payload.accountType !== 'instructor') {
        return next(new PermissionError('Instructor access required', HttpStatusCodesUtil.FORBIDDEN));
      }
      const instructorUserId = Number(payload.sub);
      if (!Number.isFinite(instructorUserId) || instructorUserId <= 0) {
        return next(new UnauthorizedError('Invalid token subject', HttpStatusCodesUtil.UNAUTHORIZED));
      }

      const row = await StudentAdminService.patchByAssignedInstructor(instructorUserId, id, body);
      if (!row) {
        return next(
          new ResourceNotFoundError('Student not found or not assigned to you', HttpStatusCodesUtil.NOT_FOUND),
        );
      }
      SuccessHandlerUtil.handleUpdate(res, next, row);
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

  static async examStatsGet(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = parseParams(studentIdParamsSchema, req.params);
      if (!assertStudentSelfAccess(req, id, next)) return;
      const data = await StudentExamStatsService.getForUser(id);
      res.status(200).json(data);
    } catch (e) {
      next(e);
    }
  }

  static async examStatsPut(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = parseParams(studentIdParamsSchema, req.params);
      if (!assertStudentSelfAccess(req, id, next)) return;
      const rawLen = JSON.stringify(req.body ?? {}).length;
      if (rawLen > MAX_EXAM_STATS_JSON_CHARS) {
        return next(
          new InputValidationError('Exam stats payload too large', HttpStatusCodesUtil.BAD_REQUEST),
        );
      }
      const body = parseBody(studentExamStatsPayloadSchema, req.body);
      const data = await StudentExamStatsService.putForUser(id, body);
      if (!data) {
        return next(new ResourceNotFoundError('Student not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      res.status(200).json(data);
    } catch (e) {
      next(e);
    }
  }
}
