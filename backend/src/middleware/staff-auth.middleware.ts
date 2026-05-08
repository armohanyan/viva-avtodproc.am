import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken, type AccessTokenPayload } from '../helpers';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';

const { UnauthorizedError, PermissionError } = ErrorsUtil;

export type StaffRequest = Request & { staff?: AccessTokenPayload };

/** Requires `Authorization: Bearer <access token>` with account type admin or super_admin. */
export function requireStaff(req: Request, _res: Response, next: NextFunction): void {
  const raw = req.headers.authorization;
  const token = raw?.startsWith('Bearer ') ? raw.slice(7).trim() : undefined;

  if (!token) {
    return next(new UnauthorizedError('Authentication required', HttpStatusCodesUtil.UNAUTHORIZED));
  }

  try {
    const payload = verifyAccessToken(token);

    if (payload.accountType !== 'admin' && payload.accountType !== 'super_admin') {
      return next(new PermissionError('Staff access required', HttpStatusCodesUtil.FORBIDDEN));
    }

    (req as StaffRequest).staff = payload;
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired token', HttpStatusCodesUtil.UNAUTHORIZED));
  }
}

/** Requires `Authorization: Bearer <access token>` with account type admin/super_admin/instructor. */
export function requireStaffOrInstructor(req: Request, _res: Response, next: NextFunction): void {
  const raw = req.headers.authorization;
  const token = raw?.startsWith('Bearer ') ? raw.slice(7).trim() : undefined;

  if (!token) {
    return next(new UnauthorizedError('Authentication required', HttpStatusCodesUtil.UNAUTHORIZED));
  }

  try {
    const payload = verifyAccessToken(token);

    if (payload.accountType !== 'admin' && payload.accountType !== 'super_admin' && payload.accountType !== 'instructor') {
      return next(new PermissionError('Staff or instructor access required', HttpStatusCodesUtil.FORBIDDEN));
    }

    (req as StaffRequest).staff = payload;
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired token', HttpStatusCodesUtil.UNAUTHORIZED));
  }
}

/**
 * When `Authorization: Bearer` is present and valid for `admin` / `super_admin`, sets `req.staff`.
 * Invalid or missing tokens are ignored (route still runs). Use on public GET routes that optionally enrich for staff.
 */
export function attachStaffIfPresent(req: Request, _res: Response, next: NextFunction): void {
  const raw = req.headers.authorization;
  const token = raw?.startsWith('Bearer ') ? raw.slice(7).trim() : undefined;

  if (!token) {
    next();
    return;
  }

  try {
    const payload = verifyAccessToken(token);

    if (payload.accountType === 'admin' || payload.accountType === 'super_admin') {
      (req as StaffRequest).staff = payload;
    }
  } catch {
    // ignore invalid/expired token
  }

  next();
}

/** Only `super_admin` may access marketing CMS mutations (stricter than general staff). */
export function requireSuperAdmin(req: Request, _res: Response, next: NextFunction): void {
  const raw = req.headers.authorization;
  const token = raw?.startsWith('Bearer ') ? raw.slice(7).trim() : undefined;

  if (!token) {
    return next(new UnauthorizedError('Authentication required', HttpStatusCodesUtil.UNAUTHORIZED));
  }

  try {
    const payload = verifyAccessToken(token);

    if (payload.accountType !== 'super_admin') {
      return next(new PermissionError('Super admin access required', HttpStatusCodesUtil.FORBIDDEN));
    }

    (req as StaffRequest).staff = payload;

    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired token', HttpStatusCodesUtil.UNAUTHORIZED));
  }
}
