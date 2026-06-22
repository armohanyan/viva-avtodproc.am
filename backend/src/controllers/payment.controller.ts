import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { parseBody, verifyAccessToken } from '../helpers';
import VposPaymentService from '../services/vpos-payment.service';
import { SuccessHandlerUtil } from '../utils';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';

const { UnauthorizedError, PermissionError } = ErrorsUtil;

function readBearerToken(req: Request): string | undefined {
  const raw = req.headers.authorization;
  return raw?.startsWith('Bearer ') ? raw.slice(7).trim() : undefined;
}

function requireStudentUserId(req: Request, next: NextFunction): number | undefined {
  const token = readBearerToken(req);
  if (!token) {
    next(new UnauthorizedError('Authentication required.', HttpStatusCodesUtil.UNAUTHORIZED));
    return undefined;
  }
  let payload: ReturnType<typeof verifyAccessToken>;
  try {
    payload = verifyAccessToken(token);
  } catch {
    next(new UnauthorizedError('Invalid or expired token.', HttpStatusCodesUtil.UNAUTHORIZED));
    return undefined;
  }
  if (payload.accountType !== 'student' || !Number.isFinite(Number(payload.sub))) {
    next(new PermissionError('Student access required.', HttpStatusCodesUtil.FORBIDDEN));
    return undefined;
  }
  const studentUserId = Number(payload.sub);
  if (studentUserId <= 0) {
    next(new UnauthorizedError('Invalid token subject.', HttpStatusCodesUtil.UNAUTHORIZED));
    return undefined;
  }
  return studentUserId;
}

const initiateSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('booking'),
    bookingId: z.coerce.number().int().positive(),
    language: z.string().max(8).optional(),
  }),
  z.object({
    kind: z.literal('package'),
    packageId: z.coerce.number().int().positive(),
    language: z.string().max(8).optional(),
  }),
  z.object({
    kind: z.literal('extra_practical'),
    practicalTotal: z.coerce.number().int().positive().optional(),
    language: z.string().max(8).optional(),
  }),
]);

export default class PaymentController {
  static async config(req: Request, res: Response, next: NextFunction) {
    try {
      const studentUserId = requireStudentUserId(req, next);
      if (studentUserId === undefined) return;
      SuccessHandlerUtil.handleGet(res, next, VposPaymentService.getPublicConfig());
    } catch (e) {
      next(e);
    }
  }

  static async initiate(req: Request, res: Response, next: NextFunction) {
    try {
      const studentUserId = requireStudentUserId(req, next);
      if (studentUserId === undefined) return;
      const body = parseBody(initiateSchema, req.body);
      const data = await VposPaymentService.initiate(studentUserId, body);
      SuccessHandlerUtil.handleAdd(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async return(req: Request, res: Response, next: NextFunction) {
    try {
      const orderId = typeof req.query.orderId === 'string' ? req.query.orderId : undefined;
      const orderNumber = typeof req.query.orderNumber === 'string' ? req.query.orderNumber : undefined;
      const redirectUrl = await VposPaymentService.handleReturn(orderId, orderNumber);
      res.redirect(302, redirectUrl);
    } catch (e) {
      next(e);
    }
  }

  static async fail(req: Request, res: Response, next: NextFunction) {
    try {
      const orderId = typeof req.query.orderId === 'string' ? req.query.orderId : undefined;
      const orderNumber = typeof req.query.orderNumber === 'string' ? req.query.orderNumber : undefined;
      const redirectUrl = await VposPaymentService.handleFail(orderId, orderNumber);
      res.redirect(302, redirectUrl);
    } catch (e) {
      next(e);
    }
  }
}
