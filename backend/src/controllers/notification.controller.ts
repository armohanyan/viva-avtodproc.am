import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { parseBody, verifyAccessToken } from '../helpers';
import NotificationService from '../services/notification.service';
import { SuccessHandlerUtil } from '../utils';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';
import type { NotificationType } from '../models/notification.model';

const { UnauthorizedError, InputValidationError } = ErrorsUtil;

const readSchema = z.object({ isRead: z.literal(true).optional() });

function readBearerToken(req: Request): string | undefined {
  const raw = req.headers.authorization;
  return raw?.startsWith('Bearer ') ? raw.slice(7).trim() : undefined;
}

function requireAuthUser(req: Request, next: NextFunction): { userId: number } | undefined {
  const token = readBearerToken(req);
  if (!token) {
    next(new UnauthorizedError('Authentication required', HttpStatusCodesUtil.UNAUTHORIZED));
    return undefined;
  }
  try {
    const payload = verifyAccessToken(token);
    const userId = Number(payload.sub);
    if (!Number.isFinite(userId) || userId <= 0) {
      next(new UnauthorizedError('Invalid token subject', HttpStatusCodesUtil.UNAUTHORIZED));
      return undefined;
    }
    return { userId };
  } catch {
    next(new UnauthorizedError('Invalid or expired token', HttpStatusCodesUtil.UNAUTHORIZED));
    return undefined;
  }
}

function parseBoolQuery(raw: unknown): boolean | undefined {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return undefined;
}

export default class NotificationController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const auth = requireAuthUser(req, next);
      if (!auth) return;
      const q = req.query;
      const data = await NotificationService.listForUser({
        userId: auth.userId,
        page: q.page ? Number(q.page) : undefined,
        pageSize: q.pageSize ? Number(q.pageSize) : undefined,
        isRead: parseBoolQuery(q.isRead),
        type: (typeof q.type === 'string' ? q.type : undefined) as NotificationType | undefined,
        createdFrom: typeof q.createdFrom === 'string' ? q.createdFrom : undefined,
        createdTo: typeof q.createdTo === 'string' ? q.createdTo : undefined,
      });
      SuccessHandlerUtil.handleGet(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async unreadCount(req: Request, res: Response, next: NextFunction) {
    try {
      const auth = requireAuthUser(req, next);
      if (!auth) return;
      const unread = await NotificationService.unreadCount(auth.userId);
      SuccessHandlerUtil.handleGet(res, next, { unread });
    } catch (e) {
      next(e);
    }
  }

  static async markRead(req: Request, res: Response, next: NextFunction) {
    try {
      const auth = requireAuthUser(req, next);
      if (!auth) return;
      parseBody(readSchema, req.body ?? {});
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
        return next(new InputValidationError('Invalid notification id', HttpStatusCodesUtil.BAD_REQUEST));
      }
      const data = await NotificationService.markRead(auth.userId, id);
      SuccessHandlerUtil.handleUpdate(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async markAllRead(req: Request, res: Response, next: NextFunction) {
    try {
      const auth = requireAuthUser(req, next);
      if (!auth) return;
      const data = await NotificationService.markAllRead(auth.userId);
      SuccessHandlerUtil.handleUpdate(res, next, data);
    } catch (e) {
      next(e);
    }
  }

  static async remove(req: Request, res: Response, next: NextFunction) {
    try {
      const auth = requireAuthUser(req, next);
      if (!auth) return;
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
        return next(new InputValidationError('Invalid notification id', HttpStatusCodesUtil.BAD_REQUEST));
      }
      const data = await NotificationService.remove(auth.userId, id);
      SuccessHandlerUtil.handleUpdate(res, next, data);
    } catch (e) {
      next(e);
    }
  }
}
