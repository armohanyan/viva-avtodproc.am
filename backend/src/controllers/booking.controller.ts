import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { parseBody, verifyAccessToken } from '../helpers';
import BookingService from '../services/booking.service';
import { SuccessHandlerUtil } from '../utils';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';

const { ResourceNotFoundError, UnauthorizedError, PermissionError, InputValidationError } = ErrorsUtil;

const bookingStatusSchema = z.enum(['confirmed', 'pending', 'cancelled', 'refunded']);

const createSchema = z.object({
  studentId: z.coerce.number().int().positive(),
  instructorName: z.string().min(1),
  dateIso: z.string().min(1),
  time: z.string().min(1),
  type: z.enum(['practical', 'theory']),
  status: bookingStatusSchema,
  branchId: z.coerce.number().int().positive(),
});

const studentMultiSlotSchema = z
  .object({
    instructorId: z.coerce.number().int().positive().optional(),
    instructor_id: z.coerce.number().int().positive().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    slots: z.array(z.string().min(4)).min(1),
    branchId: z.coerce.number().int().positive(),
  })
  .refine((v) => v.instructorId != null || v.instructor_id != null, {
    message: 'instructorId or instructor_id is required',
    path: ['instructorId'],
  });

const updateSchema = createSchema.partial();

function readBearerToken(req: Request): string | undefined {
  const raw = req.headers.authorization;
  return raw?.startsWith('Bearer ') ? raw.slice(7).trim() : undefined;
}

export default class BookingController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const rawStudent = req.query.studentUserId;
      const studentUserIdRaw =
        typeof rawStudent === 'string'
          ? rawStudent
          : Array.isArray(rawStudent) && typeof rawStudent[0] === 'string'
            ? rawStudent[0]
            : undefined;
      const studentUserId = studentUserIdRaw !== undefined ? Number(studentUserIdRaw) : undefined;

      const rawInst = req.query.instructorUserId;
      const instructorUserIdRaw =
        typeof rawInst === 'string' ? rawInst : Array.isArray(rawInst) && typeof rawInst[0] === 'string' ? rawInst[0] : undefined;
      const instructorUserId = instructorUserIdRaw !== undefined ? Number(instructorUserIdRaw) : undefined;

      if (
        studentUserId !== undefined &&
        Number.isFinite(studentUserId) &&
        studentUserId > 0 &&
        instructorUserId !== undefined &&
        Number.isFinite(instructorUserId) &&
        instructorUserId > 0
      ) {
        return next(
          new InputValidationError(
            'Use only one of studentUserId or instructorUserId',
            HttpStatusCodesUtil.BAD_REQUEST,
          ),
        );
      }

      if (studentUserId !== undefined && Number.isFinite(studentUserId) && studentUserId > 0) {
        const data = await BookingService.listForStudent(studentUserId);
        SuccessHandlerUtil.handleList(res, next, data);
        return;
      }

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
          return next(new PermissionError('You can only load your own bookings', HttpStatusCodesUtil.FORBIDDEN));
        }
        const data = await BookingService.listForInstructor(instructorUserId);
        SuccessHandlerUtil.handleList(res, next, data);
        return;
      }

      const data = await BookingService.listAdmin();
      SuccessHandlerUtil.handleList(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const rawBody = req.body as Record<string, unknown>;
      if (Array.isArray(rawBody.slots)) {
        const body = parseBody(studentMultiSlotSchema, rawBody);
        const instructorUserId = body.instructorId ?? body.instructor_id;
        if (instructorUserId == null || !Number.isFinite(instructorUserId)) {
          return next(
            new InputValidationError('instructorId or instructor_id is required', HttpStatusCodesUtil.BAD_REQUEST),
          );
        }

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
        if (payload.accountType !== 'student') {
          return next(new PermissionError('Student access required', HttpStatusCodesUtil.FORBIDDEN));
        }
        const studentUserId = Number(payload.sub);
        if (!Number.isFinite(studentUserId) || studentUserId <= 0) {
          return next(new UnauthorizedError('Invalid token subject', HttpStatusCodesUtil.UNAUTHORIZED));
        }

        const row = await BookingService.createFromStudentSlotSelection({
          studentUserId,
          instructorUserId,
          dateIso: body.date,
          slots: body.slots,
          branchId: body.branchId,
        });
        SuccessHandlerUtil.handleAdd(res, next, row);
        return;
      }

      const body = parseBody(createSchema, rawBody);
      const row = await BookingService.createAdmin(body);
      if (!row) {
        return next(new ResourceNotFoundError('Instructor not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      SuccessHandlerUtil.handleAdd(res, next, row);
    } catch (e) {
      next(e);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const body = parseBody(updateSchema, req.body);
      const row = await BookingService.updateAdmin(Number(req.params.id), body);
      if (!row) {
        return next(new ResourceNotFoundError('Booking not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      SuccessHandlerUtil.handleUpdate(res, next, row);
    } catch (e) {
      next(e);
    }
  }

  static async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const ok = await BookingService.remove(Number(req.params.id));
      if (!ok) {
        return next(new ResourceNotFoundError('Booking not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      res.sendStatus(204);
    } catch (e) {
      next(e);
    }
  }
}
