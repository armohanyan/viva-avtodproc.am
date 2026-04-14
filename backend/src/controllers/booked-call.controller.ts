import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { parseBody } from '../helpers';
import BookedCallService from '../services/booked-call.service';
import { SuccessHandlerUtil } from '../utils';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';

const { ResourceNotFoundError } = ErrorsUtil;

const createSchema = z.object({
  name: z.string().max(255).optional().nullable(),
  phone: z.string().trim().min(5).max(64),
  preferredTimeSlot: z.string().trim().min(3).max(4000),
  notes: z.string().max(4000).optional().nullable(),
});

const statusSchema = z.object({
  status: z.enum(['pending', 'contacted', 'cancelled']),
});

export default class BookedCallController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const body = parseBody(createSchema, req.body);
      const row = await BookedCallService.create(body);
      SuccessHandlerUtil.handleAdd(res, next, row);
    } catch (e) {
      next(e);
    }
  }

  static async list(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await BookedCallService.listForStaff();
      SuccessHandlerUtil.handleList(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const body = parseBody(statusSchema, req.body);
      const row = await BookedCallService.updateStatus(req.params.id!, body.status);
      if (!row) {
        return next(new ResourceNotFoundError('Callback request not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      SuccessHandlerUtil.handleUpdate(res, next, row);
    } catch (e) {
      next(e);
    }
  }
}
