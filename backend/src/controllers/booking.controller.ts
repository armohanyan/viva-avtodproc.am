import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { parseBody, resolveBranchIdFilter, verifyAccessToken } from '../helpers';
import BookingService from '../services/booking.service';
import { SuccessHandlerUtil } from '../utils';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';

const { ResourceNotFoundError, UnauthorizedError, PermissionError, InputValidationError } = ErrorsUtil;

const bookingStatusSchema = z.enum(['confirmed', 'pending', 'pending_payment', 'cancelled', 'refunded']);

const adminPaymentStatusSchema = z.enum(['paid', 'partial', 'unpaid']);

const createBodySchema = z.object({
  studentId: z.coerce.number().int().positive(),
  instructorName: z.string().optional(),
  instructorUserId: z.coerce.number().int().positive().optional(),
  dateIso: z.string().min(1),
  time: z.string().optional(),
  type: z.enum(['practical', 'theory', 'theory_personal']),
  status: bookingStatusSchema,
  branchId: z.coerce.number().int().positive(),
  slots: z.array(z.string().min(4)).optional(),
  theoryCohortId: z.coerce.number().int().positive().optional(),
  slotEntries: z
    .array(
      z.object({
        dateIso: z.string().min(1),
        time: z.string().min(4),
      }),
    )
    .optional(),
  consumePackageCredits: z.boolean().optional(),
  packageOrderId: z.coerce.number().int().positive().optional(),
  meetLink: z.union([z.string().max(512), z.null(), z.literal('')]).optional(),
  adminPaymentStatus: adminPaymentStatusSchema.optional(),
  paidAmountAmd: z.coerce.number().int().nonnegative().optional(),
  paymentNotes: z.string().max(2000).optional().nullable(),
  paymentReminderDate: z
    .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal(''), z.null()])
    .optional(),
  totalPriceAmd: z.coerce.number().int().nonnegative().optional(),
});

const createSchema = createBodySchema.superRefine((data, ctx) => {
    const slotEntries = data.slotEntries ?? [];
    if (slotEntries.length > 0 && (data.type === 'practical' || data.type === 'theory_personal')) {
      if (!data.instructorName?.trim()) {
        ctx.addIssue({
          code: 'custom',
          path: ['instructorName'],
          message: 'Required when slotEntries is set',
        });
      }
      return;
    }
    const slots = data.slots ?? [];
    const hasSlots = slots.length > 0;
    if (data.type === 'theory_personal') {
      if (hasSlots) {
        if (!data.instructorName?.trim()) {
          ctx.addIssue({
            code: 'custom',
            path: ['instructorName'],
            message: 'Required for personal theory bookings with multiple hours',
          });
        }
        return;
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

const lessonPassedBodySchema = z.object({
  lessonPassedSuccessfully: z.boolean().nullable(),
});

const studentMultiSlotSchema = z
  .object({
    instructorId: z.coerce.number().int().positive().optional(),
    instructor_id: z.coerce.number().int().positive().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    slots: z.array(z.string().min(4)).min(1),
    branchId: z.coerce.number().int().positive(),
    /** When the lesson is more than one calendar month away: start the 10-minute payment hold immediately. */
    payNow: z.boolean().optional(),
    bookingType: z.enum(['practical', 'theory_personal']).optional(),
  })
  .refine((v) => v.instructorId != null || v.instructor_id != null, {
    message: 'instructorId or instructor_id is required',
    path: ['instructorId'],
  });

const adminPackageAtomicSchema = z.object({
  studentId: z.coerce.number().int().positive(),
  packageId: z.coerce.number().int().positive(),
  branchId: z.coerce.number().int().positive(),
  status: bookingStatusSchema,
  packageOrderId: z.coerce.number().int().positive().optional(),
  practical: z
    .object({
      instructorName: z.string().min(1),
      instructorUserId: z.coerce.number().int().positive().optional(),
      dateIso: z.string().min(1),
      slots: z.array(z.string().min(4)).optional(),
      slotEntries: z.array(z.object({ dateIso: z.string().min(1), time: z.string().min(4) })).optional(),
    })
    .optional(),
  theoryPersonal: z
    .object({
      instructorName: z.string().min(1),
      instructorUserId: z.coerce.number().int().positive().optional(),
      dateIso: z.string().min(1),
      slots: z.array(z.string().min(4)).optional(),
      slotEntries: z.array(z.object({ dateIso: z.string().min(1), time: z.string().min(4) })).optional(),
    })
    .optional(),
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
  static async createAdminPackageAtomic(req: Request, res: Response, next: NextFunction) {
    try {
      const body = parseBody(adminPackageAtomicSchema, req.body);
      const data = await BookingService.createAdminPackageAtomic({
        studentId: body.studentId,
        packageId: body.packageId,
        branchId: body.branchId,
        status: body.status,
        packageOrderId: body.packageOrderId,
        practical: body.practical,
        theoryPersonal: body.theoryPersonal,
      });
      SuccessHandlerUtil.handleAdd(res, next, data);
    } catch (e) {
      next(e);
    }
  }

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
        const summaryOnly =
          String(req.query.summary ?? '').trim().toLowerCase() === 'payment' ||
          String(req.query.paymentSummary ?? '').trim() === '1';
        if (summaryOnly) {
          const summary = await BookingService.getStudentPaymentSummary(studentUserId);
          SuccessHandlerUtil.handleGet(res, next, summary);
          return;
        }
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

      const branchId = await resolveBranchIdFilter(req);
      const data = await BookingService.listAdmin(branchId);
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
            instructorUserId: body.instructorUserId,
            dateIso: body.dateIso,
            time: body.time?.trim() ?? (body.slots?.[0] ?? ''),
            type: body.type,
            status: body.status,
            branchId: body.branchId,
            slots: body.slots,
            theoryCohortId: body.theoryCohortId,
            slotEntries: body.slotEntries,
            consumePackageCredits: body.consumePackageCredits,
            packageOrderId: body.packageOrderId,
            adminPaymentStatus: body.adminPaymentStatus,
            paidAmountAmd: body.paidAmountAmd,
            paymentNotes: body.paymentNotes,
            paymentReminderDate: body.paymentReminderDate,
            totalPriceAmd: body.totalPriceAmd,
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

        if (body.bookingType === 'theory_personal') {
          return next(
            new InputValidationError(
              'Personal theory lessons must be requested through the lesson request flow.',
              HttpStatusCodesUtil.BAD_REQUEST,
            ),
          );
        }

        const rowResult = await BookingService.createFromStudentSlotSelection({
                studentUserId,
                instructorUserId,
                dateIso: body.date,
                slots: body.slots,
                branchId: body.branchId,
                /** Omitted = no preference (horizon rules apply); only explicit `false` means “defer if allowed”. */
                payNow: typeof body.payNow === 'boolean' ? body.payNow : undefined,
              });
        SuccessHandlerUtil.handleAdd(res, next, rowResult);
        return;
      }

      const body = parseBody(createSchema, rawBody);
      const row = await BookingService.createAdmin({
        studentId: body.studentId,
        instructorName: body.instructorName?.trim() ?? '',
        instructorUserId: body.instructorUserId,
        dateIso: body.dateIso,
        time: body.time?.trim() ?? '',
        type: body.type,
        status: body.status,
        branchId: body.branchId,
        slots: body.slots,
        theoryCohortId: body.theoryCohortId,
        slotEntries: body.slotEntries,
        consumePackageCredits: body.consumePackageCredits,
        packageOrderId: body.packageOrderId,
        meetLink: body.meetLink,
        adminPaymentStatus: body.adminPaymentStatus,
        paidAmountAmd: body.paidAmountAmd,
        paymentNotes: body.paymentNotes,
        paymentReminderDate: body.paymentReminderDate,
        totalPriceAmd: body.totalPriceAmd,
      });
      if (!row) {
        return next(new ResourceNotFoundError('Instructor not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      SuccessHandlerUtil.handleAdd(res, next, row);
    } catch (e) {
      next(e);
    }
  }

  static async createTheoryGroupStudentBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const cohortId = Number(req.params.cohortId);
      if (!Number.isFinite(cohortId) || cohortId <= 0) {
        return next(new InputValidationError('Invalid cohort id', HttpStatusCodesUtil.BAD_REQUEST));
      }
      const studentUserId = requireStudentUserId(req, next);
      if (studentUserId === undefined) return;
      const row = await BookingService.createTheoryGroupFromStudentSelection({ studentUserId, cohortId });
      SuccessHandlerUtil.handleAdd(res, next, row);
    } catch (e) {
      next(e);
    }
  }

  /** Instructor (own booking) or staff (admin / super_admin): single `lessonPassedSuccessfully` flag. */
  static async patchLessonPassed(req: Request, res: Response, next: NextFunction) {
    try {
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
      const id = parseBookingRouteId(req, next);
      if (id === undefined) return;
      const body = parseBody(lessonPassedBodySchema, req.body);

      let row;
      if (payload.accountType === 'admin' || payload.accountType === 'super_admin') {
        row = await BookingService.setLessonPassedSuccessfully(id, body.lessonPassedSuccessfully, { kind: 'staff' });
      } else if (payload.accountType === 'instructor') {
        const instructorUserId = Number(payload.sub);
        if (!Number.isFinite(instructorUserId) || instructorUserId <= 0) {
          return next(new UnauthorizedError('Invalid token subject', HttpStatusCodesUtil.UNAUTHORIZED));
        }
        row = await BookingService.setLessonPassedSuccessfully(id, body.lessonPassedSuccessfully, {
          kind: 'instructor',
          instructorUserId,
        });
      } else {
        return next(new PermissionError('Instructor or staff access required', HttpStatusCodesUtil.FORBIDDEN));
      }

      if (!row) {
        return next(new ResourceNotFoundError('Booking not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      SuccessHandlerUtil.handleUpdate(res, next, row);
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

  static async approveStudentCancellation(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseBookingRouteId(req, next);
      if (id === undefined) return;
      const data = await BookingService.staffApprovePracticalCancellation(id);
      SuccessHandlerUtil.handleGet(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async rejectStudentCancellation(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseBookingRouteId(req, next);
      if (id === undefined) return;
      const data = await BookingService.staffRejectPracticalCancellation(id);
      SuccessHandlerUtil.handleGet(res, next, data);
    } catch (e) {
      next(e);
    }
  }
}
