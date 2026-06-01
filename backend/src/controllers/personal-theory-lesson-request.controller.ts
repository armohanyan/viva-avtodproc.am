import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { parseBody, resolveBranchIdFilter, verifyAccessToken } from '../helpers';
import type { StaffRequest } from '../middleware/staff-auth.middleware';
import { assertStudentSelfServiceBookingEnabled } from '../constants/booking.constants';
import PersonalTheoryLessonRequestService from '../services/personal-theory-lesson-request.service';
import { SuccessHandlerUtil } from '../utils';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';

const { ResourceNotFoundError, UnauthorizedError, PermissionError } = ErrorsUtil;

const createSchema = z.object({
  instructorId: z.coerce.number().int().positive(),
  branchId: z.coerce.number().int().positive(),
  note: z.string().max(4000).optional().nullable(),
  selectedThemes: z.array(z.string().max(500)).optional(),
});

const createBookingSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slots: z.array(z.string().min(4)).min(1),
  status: z.string().min(1).max(64).optional(),
});

const linkBookingSchema = z.object({
  bookingId: z.coerce.number().int().positive(),
});

function readBearerToken(req: Request): string | undefined {
  const raw = req.headers.authorization;
  return raw?.startsWith('Bearer ') ? raw.slice(7).trim() : undefined;
}

function requireStudentUserId(req: Request, next: NextFunction): number | undefined {
  const token = readBearerToken(req);
  if (!token) {
    next(new UnauthorizedError('Authentication required', HttpStatusCodesUtil.UNAUTHORIZED));
    return undefined;
  }
  let payload: ReturnType<typeof verifyAccessToken>;
  try {
    payload = verifyAccessToken(token);
  } catch {
    next(new UnauthorizedError('Invalid or expired token', HttpStatusCodesUtil.UNAUTHORIZED));
    return undefined;
  }
  if (payload.accountType !== 'student') {
    next(new PermissionError('Student access required', HttpStatusCodesUtil.FORBIDDEN));
    return undefined;
  }
  const studentUserId = Number(payload.sub);
  if (!Number.isFinite(studentUserId) || studentUserId <= 0) {
    next(new UnauthorizedError('Invalid token subject', HttpStatusCodesUtil.UNAUTHORIZED));
    return undefined;
  }
  return studentUserId;
}

function staffAdminUserId(req: Request): number {
  const staff = (req as StaffRequest).staff;
  const id = Number(staff?.sub);
  return Number.isFinite(id) && id > 0 ? id : 0;
}

export default class PersonalTheoryLessonRequestController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const studentUserId = requireStudentUserId(req, next);
      if (studentUserId === undefined) return;
      assertStudentSelfServiceBookingEnabled();
      const body = parseBody(createSchema, req.body);
      const row = await PersonalTheoryLessonRequestService.createFromStudent({
        studentUserId,
        instructorUserId: body.instructorId,
        branchId: body.branchId,
        note: body.note,
        selectedThemes: body.selectedThemes,
      });
      SuccessHandlerUtil.handleAdd(res, next, row);
    } catch (e) {
      next(e);
    }
  }

  static async listMine(req: Request, res: Response, next: NextFunction) {
    try {
      const studentUserId = requireStudentUserId(req, next);
      if (studentUserId === undefined) return;
      const data = await PersonalTheoryLessonRequestService.listForStudent(studentUserId);
      SuccessHandlerUtil.handleList(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async listForStaff(req: Request, res: Response, next: NextFunction) {
    try {
      const branchId = await resolveBranchIdFilter(req);
      const data = await PersonalTheoryLessonRequestService.listForStaff(branchId);
      SuccessHandlerUtil.handleList(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async getByIdForStaff(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
        return next(new ResourceNotFoundError('Request not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      const row = await PersonalTheoryLessonRequestService.getByIdForStaff(id);
      if (!row) {
        return next(new ResourceNotFoundError('Request not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      SuccessHandlerUtil.handleGet(res, next, row);
    } catch (e) {
      next(e);
    }
  }

  static async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
        return next(new ResourceNotFoundError('Request not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      const ok = await PersonalTheoryLessonRequestService.remove(id);
      if (!ok) {
        return next(new ResourceNotFoundError('Request not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      res.sendStatus(HttpStatusCodesUtil.NO_CONTENT);
    } catch (e) {
      next(e);
    }
  }

  static async markContacted(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
        return next(new ResourceNotFoundError('Request not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      const row = await PersonalTheoryLessonRequestService.markContacted(id, staffAdminUserId(req));
      if (!row) {
        return next(new ResourceNotFoundError('Request not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      SuccessHandlerUtil.handleUpdate(res, next, row);
    } catch (e) {
      next(e);
    }
  }

  static async cancelMine(req: Request, res: Response, next: NextFunction) {
    try {
      const studentUserId = requireStudentUserId(req, next);
      if (studentUserId === undefined) return;
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
        return next(new ResourceNotFoundError('Request not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      const row = await PersonalTheoryLessonRequestService.cancelFromStudent(id, studentUserId);
      if (!row) {
        return next(new ResourceNotFoundError('Request not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      SuccessHandlerUtil.handleUpdate(res, next, row);
    } catch (e) {
      next(e);
    }
  }

  static async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
        return next(new ResourceNotFoundError('Request not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      const row = await PersonalTheoryLessonRequestService.cancel(id, staffAdminUserId(req));
      if (!row) {
        return next(new ResourceNotFoundError('Request not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      SuccessHandlerUtil.handleUpdate(res, next, row);
    } catch (e) {
      next(e);
    }
  }

  static async linkBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
        return next(new ResourceNotFoundError('Request not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      const body = parseBody(linkBookingSchema, req.body);
      const row = await PersonalTheoryLessonRequestService.linkExistingBooking({
        requestId: id,
        bookingId: body.bookingId,
        adminUserId: staffAdminUserId(req),
      });
      if (!row) {
        return next(new ResourceNotFoundError('Request not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      SuccessHandlerUtil.handleUpdate(res, next, row);
    } catch (e) {
      next(e);
    }
  }

  static async createBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
        return next(new ResourceNotFoundError('Request not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      const body = parseBody(createBookingSchema, req.body);
      const result = await PersonalTheoryLessonRequestService.createBookingFromRequest({
        requestId: id,
        adminUserId: staffAdminUserId(req),
        dateIso: body.date,
        slots: body.slots,
        status: body.status?.trim() || 'confirmed',
      });
      if (!result) {
        return next(new ResourceNotFoundError('Request not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      SuccessHandlerUtil.handleAdd(res, next, result);
    } catch (e) {
      next(e);
    }
  }
}
