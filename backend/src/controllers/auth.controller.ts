import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { parseBody, verifyAccessToken } from '../helpers';
import { clearRefreshCookie, REFRESH_COOKIE_NAME, attachRefreshCookie } from '../helpers/auth-cookie.helper';
import AuthService from '../services/auth.service';
import { SuccessHandlerUtil } from '../utils';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';

const { UnauthorizedError } = ErrorsUtil;

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  phone: z.string().optional(),
});

const patchMeSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.union([z.string(), z.literal(''), z.null()]).optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

function readRefreshCookie(req: Request): string | undefined {
  const c = req.cookies?.[REFRESH_COOKIE_NAME];
  return typeof c === 'string' && c ? c : undefined;
}

export default class AuthController {
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const body = parseBody(loginSchema, req.body);
      const data = await AuthService.login(body.email, body.password);
      attachRefreshCookie(res, data.refreshPlain);
      SuccessHandlerUtil.handleGet(res, next, { accessToken: data.accessToken, user: data.user });
    } catch (e) {
      next(e);
    }
  }

  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const body = parseBody(registerSchema, req.body);
      const data = await AuthService.register(body);
      attachRefreshCookie(res, data.refreshPlain);
      SuccessHandlerUtil.handleAdd(res, next, { accessToken: data.accessToken, user: data.user });
    } catch (e) {
      next(e);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const rt = readRefreshCookie(req);
      if (!rt) {
        clearRefreshCookie(res);
        return next(new UnauthorizedError('Session expired', HttpStatusCodesUtil.UNAUTHORIZED));
      }
      const data = await AuthService.refreshWithPlain(rt);
      if (!data) {
        clearRefreshCookie(res);
        return next(new UnauthorizedError('Session expired', HttpStatusCodesUtil.UNAUTHORIZED));
      }
      attachRefreshCookie(res, data.refreshPlain);
      SuccessHandlerUtil.handleGet(res, next, { accessToken: data.accessToken, user: data.user });
    } catch (e) {
      next(e);
    }
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const rt = readRefreshCookie(req);
      await AuthService.logoutPlain(rt);
      clearRefreshCookie(res);
      res.sendStatus(HttpStatusCodesUtil.NO_CONTENT);
    } catch (e) {
      next(e);
    }
  }

  static async me(req: Request, res: Response, next: NextFunction) {
    try {
      const raw = req.headers.authorization;
      const token = raw?.startsWith('Bearer ') ? raw.slice(7).trim() : undefined;
      if (!token) {
        return next(new UnauthorizedError('Authentication required', HttpStatusCodesUtil.UNAUTHORIZED));
      }
      let payload: ReturnType<typeof verifyAccessToken>;
      try {
        payload = verifyAccessToken(token);
      } catch {
        return next(new UnauthorizedError('Invalid or expired token', HttpStatusCodesUtil.UNAUTHORIZED));
      }
      const user = await AuthService.me(payload.sub);
      if (!user) {
        return next(new UnauthorizedError('Invalid or expired token', HttpStatusCodesUtil.UNAUTHORIZED));
      }
      SuccessHandlerUtil.handleGet(res, next, user);
    } catch (e) {
      next(e);
    }
  }

  static async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const raw = req.headers.authorization;
      const token = raw?.startsWith('Bearer ') ? raw.slice(7).trim() : undefined;
      if (!token) {
        return next(new UnauthorizedError('Authentication required', HttpStatusCodesUtil.UNAUTHORIZED));
      }
      let payload: ReturnType<typeof verifyAccessToken>;
      try {
        payload = verifyAccessToken(token);
      } catch {
        return next(new UnauthorizedError('Invalid or expired token', HttpStatusCodesUtil.UNAUTHORIZED));
      }
      const userId = Number(payload.sub);
      if (!Number.isFinite(userId) || userId <= 0) {
        return next(new UnauthorizedError('Invalid token subject', HttpStatusCodesUtil.UNAUTHORIZED));
      }
      const body = parseBody(changePasswordSchema, req.body);
      await AuthService.changePassword(userId, body.currentPassword, body.newPassword);
      res.sendStatus(HttpStatusCodesUtil.NO_CONTENT);
    } catch (e) {
      next(e);
    }
  }

  static async patchMe(req: Request, res: Response, next: NextFunction) {
    try {
      const raw = req.headers.authorization;
      const token = raw?.startsWith('Bearer ') ? raw.slice(7).trim() : undefined;
      if (!token) {
        return next(new UnauthorizedError('Authentication required', HttpStatusCodesUtil.UNAUTHORIZED));
      }
      let payload: ReturnType<typeof verifyAccessToken>;
      try {
        payload = verifyAccessToken(token);
      } catch {
        return next(new UnauthorizedError('Invalid or expired token', HttpStatusCodesUtil.UNAUTHORIZED));
      }
      const body = parseBody(patchMeSchema, req.body);
      const userId = Number(payload.sub);
      if (!Number.isFinite(userId) || userId <= 0) {
        return next(new UnauthorizedError('Invalid token subject', HttpStatusCodesUtil.UNAUTHORIZED));
      }
      const phoneNorm =
        body.phone === undefined ? undefined : body.phone === '' || body.phone === null ? null : body.phone;
      const updated = await AuthService.updateMe(userId, {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.phone !== undefined ? { phone: phoneNorm } : {}),
      });
      if (!updated) {
        return next(new UnauthorizedError('Invalid or expired token', HttpStatusCodesUtil.UNAUTHORIZED));
      }
      SuccessHandlerUtil.handleGet(res, next, updated);
    } catch (e) {
      next(e);
    }
  }
}
