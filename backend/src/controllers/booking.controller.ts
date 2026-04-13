import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { parseBody } from '../helpers';
import BookingService from '../services/booking.service';
import { SuccessHandlerUtil } from '../utils';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';

const { ResourceNotFoundError } = ErrorsUtil;

const createSchema = z.object({
  id: z.string().optional(),
  studentId: z.string().min(1),
  instructorName: z.string().min(1),
  dateIso: z.string().min(1),
  time: z.string().min(1),
  type: z.enum(['practical', 'theory']),
  status: z.string().min(1),
  branchId: z.string().min(1),
});

const updateSchema = createSchema.partial().omit({ id: true });

export default class BookingController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const raw = req.query.studentUserId;
      const studentUserId =
        typeof raw === 'string' ? raw : Array.isArray(raw) && typeof raw[0] === 'string' ? raw[0] : undefined;
      if (studentUserId) {
        const data = await BookingService.listForStudent(studentUserId);
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
      const body = parseBody(createSchema, req.body);
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
      const row = await BookingService.updateAdmin(req.params.id!, body);
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
      const ok = await BookingService.remove(req.params.id!);
      if (!ok) {
        return next(new ResourceNotFoundError('Booking not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      res.sendStatus(204);
    } catch (e) {
      next(e);
    }
  }
}
