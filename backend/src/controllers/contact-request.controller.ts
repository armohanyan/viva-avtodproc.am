import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { parseBody } from '../helpers';
import ContactRequestService from '../services/contact-request.service';
import { SuccessHandlerUtil } from '../utils';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';

const { ResourceNotFoundError } = ErrorsUtil;

const createSchema = z.object({
  firstName: z.string().trim().min(1).max(255),
  lastName: z.string().max(255).optional().nullable(),
  email: z.string().trim().email().max(255),
  phone: z.string().max(64).optional().nullable(),
  subject: z.string().max(255).optional().nullable(),
  message: z.string().trim().min(3).max(4000),
});

const statusSchema = z.object({
  status: z.enum(['active', 'archived']),
});

export default class ContactRequestController {
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const body = parseBody(createSchema, req.body);
      const row = await ContactRequestService.create(body);
      SuccessHandlerUtil.handleAdd(res, next, row);
    } catch (e) {
      next(e);
    }
  }

  static async list(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await ContactRequestService.listForStaff();
      SuccessHandlerUtil.handleList(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const body = parseBody(statusSchema, req.body);
      const row = await ContactRequestService.updateStatus(Number(req.params.id), body.status);
      if (!row) {
        return next(new ResourceNotFoundError('Contact request not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      SuccessHandlerUtil.handleUpdate(res, next, row);
    } catch (e) {
      next(e);
    }
  }
}
