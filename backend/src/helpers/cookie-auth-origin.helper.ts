import type { Request } from 'express';
import config from '../config';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';

const { Forbidden } = ErrorsUtil;

function allowedBrowserOrigins(): string[] {
  const o = config.CORS_ORIGINS;
  if (o === true || !o) {
    return [];
  }
  const list = Array.isArray(o) ? o : [o];
  return list.filter((x): x is string => typeof x === 'string' && x.length > 0);
}

/**
 * CSRF mitigation for credentialed cookie auth (`refresh` / `logout`):
 * require a browser `Origin` or `Referer` that matches the configured CORS allowlist.
 *
 * When `CORS_ORIGINS` is unset or `*` / permissive (`true`), this check is skipped so local
 * tooling (curl, mobile apps) still works — production should always pin `CORS_ORIGINS`.
 */
export function assertCookieAuthBrowserOrigin(req: Request): void {
  const allowed = allowedBrowserOrigins();
  if (allowed.length === 0) {
    return;
  }

  const origin = req.get('origin');
  if (origin && allowed.includes(origin)) {
    return;
  }

  const referer = req.get('referer');
  if (referer) {
    try {
      const u = new URL(referer);
      const base = `${u.protocol}//${u.host}`;
      if (allowed.some((a) => base === a)) {
        return;
      }
    } catch {
      /* ignore malformed referer */
    }
  }

  throw new Forbidden('Invalid origin for cookie-authenticated request', HttpStatusCodesUtil.FORBIDDEN);
}
