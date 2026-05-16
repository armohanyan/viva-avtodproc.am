import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { parseBody, parseParams, parseQuery, resolveBranchIdFilter } from '../helpers';
import type { StaffRequest } from '../middleware/staff-auth.middleware';
import BookingService from '../services/booking.service';
import InstructorAvailabilityService from '../services/instructor-availability.service';
import InstructorService from '../services/instructor.service';
import { SuccessHandlerUtil } from '../utils';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';

const { ResourceNotFoundError, InputValidationError, PermissionError } = ErrorsUtil;

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string(),
  years: z.number().int().nonnegative(),
  hourlyPrice: z.number().int().nonnegative(),
  status: z.enum(['active', 'inactive']),
  imageSrc: z.string(),
  availableBranchIds: z.array(z.coerce.number().int().positive()),
  teachesPractical: z.boolean(),
  teachesTheory: z.boolean(),
  fleetCarIds: z.array(z.number().int().positive()).optional(),
});

const updateSchema = createSchema.partial();

const availabilityCreateSchema = z.object({
  ruleKind: z.enum(['work_hours', 'lunch', 'recurring_busy', 'day_off', 'date_busy']),
  weekday: z.number().int().min(1).max(7).optional().nullable(),
  dateIso: z.string().min(1).optional().nullable(),
  timeStart: z.string().optional().nullable(),
  timeEnd: z.string().optional().nullable(),
  allDay: z.boolean().optional(),
});

const busySlotsQuerySchema = z.object({
  from: z.string().min(10),
  to: z.string().min(10),
  /** When editing a booking, omit that booking’s slot rows so the calendar stays usable. */
  excludeBookingId: z.coerce.number().int().positive().optional(),
});

/** `users.id` for an instructor — path segments are strings; reject slugs like "acc-instructor" with a clear message. */
const instructorPathUserIdSchema = z
  .string()
  .trim()
  .regex(/^\d+$/, 'Must be the instructor numeric user id (from GET /instructors)')
  .transform((s) => Number.parseInt(s, 10))
  .pipe(z.number().int().positive());

const instructorUserIdParamsSchema = z.object({
  id: instructorPathUserIdSchema,
});

const instructorAvailabilityBlockParamsSchema = z.object({
  id: instructorPathUserIdSchema,
  blockId: instructorPathUserIdSchema,
});

export default class InstructorController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const staff = (req as StaffRequest).staff;
      const enrichInvite = Boolean(staff);
      const branchId = await resolveBranchIdFilter(req);
      const data = await InstructorService.list(enrichInvite, branchId);

      SuccessHandlerUtil.handleList(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const body = parseBody(createSchema, req.body);
      if (body.availableBranchIds.length > 0) {
        const staff = (req as StaffRequest).staff;
        if (!staff || staff.accountType !== 'super_admin') {
          return next(
            new PermissionError(
              'Only a super administrator can assign instructor branches.',
              HttpStatusCodesUtil.FORBIDDEN,
            ),
          );
        }
      }
      const row = await InstructorService.create(body);

      SuccessHandlerUtil.handleAdd(res, next, row);
    } catch (e) {
      next(e);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const body = parseBody(updateSchema, req.body);
      const actor = (req as StaffRequest).staff;
      const { id } = parseParams(instructorUserIdParamsSchema, req.params);

      if (!actor) {
        return next(new PermissionError('Authentication required', HttpStatusCodesUtil.FORBIDDEN));
      }

      if (actor.accountType === 'instructor') {
        const actorUserId = Number(actor.sub);

        if (!Number.isFinite(actorUserId) || actorUserId <= 0 || actorUserId !== id) {
          return next(
            new PermissionError('You can only update your own profile image.', HttpStatusCodesUtil.FORBIDDEN),
          );
        }

        const bodyKeys = Object.keys(body);
        const invalidInstructorKeys = bodyKeys.filter((k) => k !== 'imageSrc');

        if (invalidInstructorKeys.length > 0) {
          return next(
            new PermissionError(
              'Instructors can only update their profile image.',
              HttpStatusCodesUtil.FORBIDDEN,
            ),
          );
        }
      }

      if ('availableBranchIds' in body) {
        if (actor.accountType !== 'super_admin') {
          return next(
            new PermissionError(
              'Only a super administrator can change instructor branches.',
              HttpStatusCodesUtil.FORBIDDEN,
            ),
          );
        }
      }
      const row = await InstructorService.update(id, body);

      if (!row) {
        return next(new ResourceNotFoundError('Instructor not found', HttpStatusCodesUtil.NOT_FOUND));
      }

      SuccessHandlerUtil.handleUpdate(res, next, row);
    } catch (e) {
      next(e);
    }
  }

  static async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = parseParams(instructorUserIdParamsSchema, req.params);
      const ok = await InstructorService.remove(id);

      if (!ok) {
        return next(new ResourceNotFoundError('Instructor not found', HttpStatusCodesUtil.NOT_FOUND));
      }

      res.sendStatus(204);
    } catch (e) {
      next(e);
    }
  }

  /** Public read — occupied lesson slots for calendar (includes student id for “mine” styling). */
  static async listBusySlots(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: instructorUserId } = parseParams(instructorUserIdParamsSchema, req.params);
      const exists = await InstructorAvailabilityService.instructorExists(instructorUserId);

      if (!exists) {
        return next(new ResourceNotFoundError('Instructor not found', HttpStatusCodesUtil.NOT_FOUND));
      }

      const q = parseQuery(busySlotsQuerySchema, {
        from: req.query.from,
        to: req.query.to,
        excludeBookingId: req.query.excludeBookingId,
      });
      const data = await BookingService.listBusySlotsForInstructor(
        instructorUserId,
        q.from.slice(0, 10),
        q.to.slice(0, 10),
        q.excludeBookingId,
      );

      SuccessHandlerUtil.handleList(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  /** Public read — used by booking UI to hide busy/break slots. */
  static async listAvailabilityBlocks(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: instructorUserId } = parseParams(instructorUserIdParamsSchema, req.params);
      const exists = await InstructorAvailabilityService.instructorExists(instructorUserId);

      if (!exists) {
        return next(new ResourceNotFoundError('Instructor not found', HttpStatusCodesUtil.NOT_FOUND));
      }

      const data = await InstructorAvailabilityService.listForInstructor(instructorUserId);

      SuccessHandlerUtil.handleList(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async createAvailabilityBlock(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: instructorUserId } = parseParams(instructorUserIdParamsSchema, req.params);
      const exists = await InstructorAvailabilityService.instructorExists(instructorUserId);

      if (!exists) {
        return next(new ResourceNotFoundError('Instructor not found', HttpStatusCodesUtil.NOT_FOUND));
      }

      const body = parseBody(availabilityCreateSchema, req.body);
      try {
        const row = await InstructorAvailabilityService.create({
          ...body,
          instructorUserId,
        });

        if (!row) {
          return next(new ResourceNotFoundError('Instructor not found', HttpStatusCodesUtil.NOT_FOUND));
        }

        SuccessHandlerUtil.handleAdd(res, next, row);
      } catch (err) {
        if (err instanceof Error) {
          return next(new InputValidationError(err.message, HttpStatusCodesUtil.BAD_REQUEST));
        }

        throw err;
      }
    } catch (e) {
      next(e);
    }
  }

  static async removeAvailabilityBlock(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: instructorUserId, blockId } = parseParams(
        instructorAvailabilityBlockParamsSchema,
        req.params,
      );
      const ok = await InstructorAvailabilityService.remove(instructorUserId, blockId);

      if (!ok) {
        return next(new ResourceNotFoundError('Block not found', HttpStatusCodesUtil.NOT_FOUND));
      }

      res.sendStatus(204);
    } catch (e) {
      next(e);
    }
  }
}
