import type { Response } from 'express';
import config from '../config';
import { API_VERSION_PREFIX } from '../constants';
import { parseDurationToMs } from '../utils/token-time.util';

export const REFRESH_COOKIE_NAME = 'viva_rt';

const isProduction = config.NODE_ENV === 'production';
const refreshCookiePath = `${API_VERSION_PREFIX}/auth`;

function refreshCookieSecurity(): { secure: boolean; sameSite: 'lax' | 'none' } {
  if (config.AUTH.REFRESH_COOKIE_CROSS_SITE) {
    return { secure: true, sameSite: 'none' };
  }
  return { secure: isProduction, sameSite: 'lax' };
}

export function refreshCookieMaxAgeMs(): number {
  return parseDurationToMs(config.AUTH.REFRESH_TOKEN_ACTIVE_TIME, 7 * 86_400_000);
}

export function attachRefreshCookie(res: Response, plainRefreshToken: string): void {
  const { secure, sameSite } = refreshCookieSecurity();
  res.cookie(REFRESH_COOKIE_NAME, plainRefreshToken, {
    httpOnly: true,
    secure,
    sameSite,
    path: refreshCookiePath,
    maxAge: refreshCookieMaxAgeMs(),
  });
}

export function clearRefreshCookie(res: Response): void {
  const { secure, sameSite } = refreshCookieSecurity();
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure,
    sameSite,
    path: refreshCookiePath,
  });
}
