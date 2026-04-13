import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { parseBody } from '../helpers';
import AccountsService from '../services/accounts.service';
import { SuccessHandlerUtil } from '../utils';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';

const { ResourceNotFoundError } = ErrorsUtil;

const accountTypeZ = z.enum(['super_admin', 'admin', 'instructor', 'student']);

const createSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  accountType: accountTypeZ,
  password: z.string().min(8).optional(),
  isActive: z.boolean().optional(),
});

const updateSchema = z
  .object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional(),
    phone: z.string().nullable().optional(),
    accountType: accountTypeZ.optional(),
    isActive: z.boolean().optional(),
    password: z.string().min(8).optional(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: 'At least one field required' });

export default class AccountsController {
  static async list(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AccountsService.list();
      SuccessHandlerUtil.handleList(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const body = parseBody(createSchema, req.body);
      const row = await AccountsService.create({
        id: body.id,
        name: body.name,
        email: body.email,
        phone: body.phone,
        accountType: body.accountType,
        password: body.password,
        isActive: body.isActive,
      });
      SuccessHandlerUtil.handleAdd(res, next, row);
    } catch (e) {
      next(e);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const body = parseBody(updateSchema, req.body);
      const row = await AccountsService.update(req.params.id!, body);
      if (!row) {
        return next(new ResourceNotFoundError('Account not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      SuccessHandlerUtil.handleUpdate(res, next, row);
    } catch (e) {
      next(e);
    }
  }
}
