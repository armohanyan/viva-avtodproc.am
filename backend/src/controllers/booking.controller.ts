import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { parseBody, verifyAccessToken } from '../helpers';
import BookingService from '../services/booking.service';
import { SuccessHandlerUtil } from '../utils';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';

const { ResourceNotFoundError, UnauthorizedError, PermissionError, InputValidationError } = ErrorsUtil;

const bookingStatusSchema = z.enum(['confirmed', 'pending', 'cancelled', 'refunded']);

const createBodySchema = z.object({
  studentId: z.coerce.number().int().positive(),
  instructorName: z.string().optional(),
  dateIso: z.string().min(1),
  time: z.string().optional(),
  type: z.enum(['practical', 'theory', 'theory_personal']),
  status: bookingStatusSchema,
  branchId: z.coerce.number().int().positive(),
  slots: z.array(z.string().min(4)).optional(),
  theoryCohortId: z.coerce.number().int().positive().optional(),
});

const createSchema = createBodySchema.superRefine((data, ctx) => {
    const slots = data.slots ?? [];
    const hasSlots = slots.length > 0;
    if (data.type === 'theory_personal') {
      if (hasSlots) {
        ctx.addIssue({ code: 'custom', path: ['slots'], message: 'Personal theory bookings use a single time, not slots[]' });
      }
      if (!data.instructorName?.trim()) {
        ctx.addIssue({ code: 'custom', path: ['instructorName'], message: 'Required' });
      }
      if (!data.time?.trim()) {
        ctx.addIssue({ code: 'custom', path: ['time'], message: 'Required' });
      }
      return;
    }
    if (hasSlots) {
      if (data.type === 'practical' && !data.instructorName?.trim()) {
        ctx.addIssue({ code: 'custom', path: ['instructorName'], message: 'Required for practical bookings with slots' });
      }
      if (data.type === 'theory' && (data.theoryCohortId == null || !Number.isFinite(data.theoryCohortId))) {
        ctx.addIssue({ code: 'custom', path: ['theoryCohortId'], message: 'Required for theory group bookings with slots' });
      }
      return;
    }
    if (!data.time?.trim()) {
      ctx.addIssue({ code: 'custom', path: ['time'], message: 'Required' });
    }
    if (!data.instructorName?.trim()) {
      ctx.addIssue({ code: 'custom', path: ['instructorName'], message: 'Required' });
    }
  });

const updateSchema = createBodySchema.partial();

const studentMultiSlotSchema = z
  .object({
    instructorId: z.coerce.number().int().positive().optional(),
    instructor_id: z.coerce.number().int().positive().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    slots: z.array(z.string().min(4)).min(1),
    branchId: z.coerce.number().int().positive(),
    /** When the lesson is more than one calendar month away: start the 10-minute payment hold immediately. */
    payNow: z.boolean().optional(),
  })
  .refine((v) => v.instructorId != null || v.instructor_id != null, {
    message: 'instructorId or instructor_id is required',
    path: ['instructorId'],
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

function parseBookingRouteId(req: Request, next: NextFunction): number | undefined {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    next(new InputValidationError('Invalid booking id', HttpStatusCodesUtil.BAD_REQUEST));
    return undefined;
  }
  return id;
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
        const adminStudentRaw = rawBody.studentId;
        const adminStudentId =
          typeof adminStudentRaw === 'number'
            ? adminStudentRaw
            : typeof adminStudentRaw === 'string'
              ? Number(adminStudentRaw)
              : NaN;
        if (Number.isFinite(adminStudentId) && adminStudentId > 0) {
          const body = parseBody(createSchema, rawBody);
          const row = await BookingService.createAdmin({
            studentId: body.studentId,
            instructorName: body.instructorName?.trim() ?? '',
            dateIso: body.dateIso,
            time: body.time?.trim() ?? (body.slots?.[0] ?? ''),
            type: body.type,
            status: body.status,
            branchId: body.branchId,
            slots: body.slots,
            theoryCohortId: body.theoryCohortId,
          });
          if (!row) {
            return next(new ResourceNotFoundError('Instructor not found', HttpStatusCodesUtil.NOT_FOUND));
          }
          SuccessHandlerUtil.handleAdd(res, next, row);
          return;
        }

        const body = parseBody(studentMultiSlotSchema, rawBody);
        const instructorUserId = body.instructorId ?? body.instructor_id;
        if (instructorUserId == null || !Number.isFinite(instructorUserId)) {
          return next(
            new InputValidationError('instructorId or instructor_id is required', HttpStatusCodesUtil.BAD_REQUEST),
          );
        }

        const studentUserId = requireStudentUserId(req, next);
        if (studentUserId === undefined) return;

        const row = await BookingService.createFromStudentSlotSelection({
          studentUserId,
          instructorUserId,
          dateIso: body.date,
          slots: body.slots,
          branchId: body.branchId,
          /** Omitted = no preference (horizon rules apply); only explicit `false` means “defer if allowed”. */
          payNow: typeof body.payNow === 'boolean' ? body.payNow : undefined,
        });
        SuccessHandlerUtil.handleAdd(res, next, row);
        return;
      }

      const body = parseBody(createSchema, rawBody);
      const row = await BookingService.createAdmin({
        studentId: body.studentId,
        instructorName: body.instructorName?.trim() ?? '',
        dateIso: body.dateIso,
        time: body.time?.trim() ?? '',
        type: body.type,
        status: body.status,
        branchId: body.branchId,
        slots: body.slots,
        theoryCohortId: body.theoryCohortId,
      });
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
      const body = parseBody(updateSchema, req.body) as Partial<{
        studentId: number;
        instructorName: string;
        dateIso: string;
        time: string;
        type: 'practical' | 'theory' | 'theory_personal';
        status: string;
        branchId: number;
        slots: string[];
        theoryCohortId: number;
      }>;
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

  static async extendPaymentHold(req: Request, res: Response, next: NextFunction) {
    try {
      const studentUserId = requireStudentUserId(req, next);
      if (studentUserId === undefined) return;
      const id = parseBookingRouteId(req, next);
      if (id === undefined) return;
      const data = await BookingService.extendPracticalPaymentHold(id, studentUserId);
      SuccessHandlerUtil.handleGet(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async startPaymentWindow(req: Request, res: Response, next: NextFunction) {
    try {
      const studentUserId = requireStudentUserId(req, next);
      if (studentUserId === undefined) return;
      const id = parseBookingRouteId(req, next);
      if (id === undefined) return;
      const data = await BookingService.startPracticalPaymentWindow(id, studentUserId);
      SuccessHandlerUtil.handleGet(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async completeStudentPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const studentUserId = requireStudentUserId(req, next);
      if (studentUserId === undefined) return;
      const id = parseBookingRouteId(req, next);
      if (id === undefined) return;
      const data = await BookingService.completePracticalStudentPayment(id, studentUserId);
      SuccessHandlerUtil.handleGet(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async cancelStudentBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const studentUserId = requireStudentUserId(req, next);
      if (studentUserId === undefined) return;
      const id = parseBookingRouteId(req, next);
      if (id === undefined) return;
      const data = await BookingService.cancelPracticalStudentBooking(id, studentUserId);
      SuccessHandlerUtil.handleGet(res, next, data);
    } catch (e) {
      next(e);
    }
  }
}
