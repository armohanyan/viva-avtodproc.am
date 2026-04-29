import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { parseBody, parseQuery } from '../helpers';
import type { AccountType } from '../models/user.model';
import AccountsService from '../services/accounts.service';
import { SuccessHandlerUtil } from '../utils';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';
import type { StaffRequest } from '../middleware/staff-auth.middleware';

const { PermissionError, ResourceNotFoundError, UnauthorizedError } = ErrorsUtil;

const accountTypeZ = z.enum(['super_admin', 'admin', 'instructor', 'student']);

const createSchema = z.object({
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

const listQuerySchema = z.object({
  roles: z
    .string()
    .optional()
    .transform((value) => {
      if (!value) return undefined;
      const tokens = value
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
      const parsed = z.array(accountTypeZ).safeParse(tokens);
      if (!parsed.success || parsed.data.length === 0) return undefined;
      return Array.from(new Set(parsed.data));
    }),
});

function canManageAccountType(actor: AccountType, target: AccountType): boolean {
  if (actor === 'super_admin') return target === 'super_admin' || target === 'admin';
  if (actor === 'admin') return target === 'admin';
  return false;
}

export default class AccountsController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = (req as StaffRequest).staff?.accountType;
      if (!actor) {
        return next(new UnauthorizedError('Authentication required', HttpStatusCodesUtil.UNAUTHORIZED));
      }
      const { roles } = parseQuery(listQuerySchema, req.query);
      const requestedRoles = roles ?? (actor === 'super_admin' ? ['admin', 'super_admin'] : ['admin']);
      const effectiveRoles = requestedRoles.filter((role) => canManageAccountType(actor, role));
      if (effectiveRoles.length === 0) {
        return SuccessHandlerUtil.handleList(res, next, []);
      }
      const data = await AccountsService.list({ roles: effectiveRoles });
      SuccessHandlerUtil.handleList(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = (req as StaffRequest).staff?.accountType;
      if (!actor) {
        return next(new UnauthorizedError('Authentication required', HttpStatusCodesUtil.UNAUTHORIZED));
      }
      const body = parseBody(createSchema, req.body);
      if (!canManageAccountType(actor, body.accountType)) {
        return next(new PermissionError('Insufficient permissions for this account role', HttpStatusCodesUtil.FORBIDDEN));
      }
      const row = await AccountsService.create({
        name: body.name,
        email: body.email,
        phone: body.phone,
        accountType: body.accountType,
        password: body.password,
        isActive: body.isActive,
        sendInvite: true,
      });
      SuccessHandlerUtil.handleAdd(res, next, row);
    } catch (e) {
      next(e);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const actor = (req as StaffRequest).staff?.accountType;
      if (!actor) {
        return next(new UnauthorizedError('Authentication required', HttpStatusCodesUtil.UNAUTHORIZED));
      }
      const accountId = Number(req.params.id);
      const existing = await AccountsService.getById(accountId);
      if (!existing) {
        return next(new ResourceNotFoundError('Account not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      if (!canManageAccountType(actor, existing.role)) {
        return next(new PermissionError('Insufficient permissions for this account role', HttpStatusCodesUtil.FORBIDDEN));
      }
      const body = parseBody(updateSchema, req.body);
      if (body.accountType && !canManageAccountType(actor, body.accountType)) {
        return next(new PermissionError('Insufficient permissions for this account role', HttpStatusCodesUtil.FORBIDDEN));
      }
      const row = await AccountsService.update(accountId, body);
      if (!row) {
        return next(new ResourceNotFoundError('Account not found', HttpStatusCodesUtil.NOT_FOUND));
      }
      SuccessHandlerUtil.handleUpdate(res, next, row);
    } catch (e) {
      next(e);
    }
  }
}
