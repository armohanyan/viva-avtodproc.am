import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { parseBody, parseQuery, verifyAccessToken } from '../helpers';
import { clearRefreshCookie, REFRESH_COOKIE_NAME, attachRefreshCookie } from '../helpers/auth-cookie.helper';
import { assertCookieAuthBrowserOrigin } from '../helpers/cookie-auth-origin.helper';
import AdminMfaService from '../services/admin-mfa.service';
import AuthService from '../services/auth.service';
import StudentInvitationService from '../services/student-invitation.service';
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

const verifyAdminMfaSchema = z.object({
  mfaToken: z.string().min(20),
  code: z.string().regex(/^\d{6}$/),
});

const resendAdminMfaSchema = z.object({
  mfaToken: z.string().min(20),
});

const setupPasswordSchema = z.object({
  token: z.string().min(16),
  password: z.string().min(8),
});

const invitationQuerySchema = z.object({
  token: z.string().min(16),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(16),
  password: z.string().min(8),
});

function readRefreshCookie(req: Request): string | undefined {
  const c = req.cookies?.[REFRESH_COOKIE_NAME];
  return typeof c === 'string' && c ? c : undefined;
}

export default class AuthController {
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const body = parseBody(loginSchema, req.body);
      const outcome = await AuthService.login(body.email, body.password);
      if (outcome.kind === 'mfa_required') {
        SuccessHandlerUtil.handleGet(res, next, { requiresMfa: true, mfaToken: outcome.mfaToken });
        return;
      }
      attachRefreshCookie(res, outcome.tokens.refreshPlain);
      SuccessHandlerUtil.handleGet(res, next, {
        accessToken: outcome.tokens.accessToken,
        user: outcome.tokens.user,
      });
    } catch (e) {
      next(e);
    }
  }

  static async verifyAdminMfa(req: Request, res: Response, next: NextFunction) {
    try {
      const body = parseBody(verifyAdminMfaSchema, req.body);
      const session = await AdminMfaService.verifyAndIssueSession(body.mfaToken, body.code);
      if (!session) {
        return next(new UnauthorizedError('Invalid or expired code', HttpStatusCodesUtil.UNAUTHORIZED));
      }
      attachRefreshCookie(res, session.refreshPlain);
      SuccessHandlerUtil.handleGet(res, next, { accessToken: session.accessToken, user: session.user });
    } catch (e) {
      next(e);
    }
  }

  static async resendAdminMfa(req: Request, res: Response, next: NextFunction) {
    try {
      const body = parseBody(resendAdminMfaSchema, req.body);
      const nextStep = await AdminMfaService.resendForPendingMfa(body.mfaToken);

     if (!nextStep) {
        return next(
          new UnauthorizedError('Invalid or expired sign-in session', HttpStatusCodesUtil.UNAUTHORIZED),
        );
      }

      SuccessHandlerUtil.handleGet(res, next, { mfaToken: nextStep.mfaToken });
    } catch (e) {
      next(e);
    }
  }

  static async studentInvitationMeta(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = parseQuery(invitationQuerySchema, req.query);
      const meta = await StudentInvitationService.validateToken(token);
      if (!meta.valid) {
        return next(new UnauthorizedError('Invalid or expired invitation', HttpStatusCodesUtil.UNAUTHORIZED));
      }
      SuccessHandlerUtil.handleGet(res, next, { valid: true, email: meta.email });
    } catch (e) {
      next(e);
    }
  }

  static async setupPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const body = parseBody(setupPasswordSchema, req.body);
      const result = await StudentInvitationService.completeSetupPassword(body.token, body.password);
      if (!result.ok) {
        return next(new UnauthorizedError(result.message, HttpStatusCodesUtil.UNAUTHORIZED));
      }
      res.sendStatus(HttpStatusCodesUtil.NO_CONTENT);
    } catch (e) {
      next(e);
    }
  }

  static async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const body = parseBody(forgotPasswordSchema, req.body);
      await AuthService.requestPasswordReset(body.email);
      res.sendStatus(HttpStatusCodesUtil.NO_CONTENT);
    } catch (e) {
      next(e);
    }
  }

  static async passwordResetMeta(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = parseQuery(invitationQuerySchema, req.query);
      const meta = await AuthService.validatePasswordResetToken(token);
      if (!meta.valid) {
        return next(new UnauthorizedError('Invalid or expired reset link', HttpStatusCodesUtil.UNAUTHORIZED));
      }
      SuccessHandlerUtil.handleGet(res, next, { valid: true, email: meta.email });
    } catch (e) {
      next(e);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const body = parseBody(resetPasswordSchema, req.body);
      const result = await AuthService.completePasswordReset(body.token, body.password);
      if (!result.ok) {
        return next(new UnauthorizedError(result.message, HttpStatusCodesUtil.UNAUTHORIZED));
      }
      res.sendStatus(HttpStatusCodesUtil.NO_CONTENT);
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
      assertCookieAuthBrowserOrigin(req);
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
      assertCookieAuthBrowserOrigin(req);
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
