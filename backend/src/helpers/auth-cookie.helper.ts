import type { Response } from 'express';
import config from '../config';
import { API_VERSION_PREFIX } from '../constants';
import { parseDurationToMs } from '../utils/token-time.util';

export const REFRESH_COOKIE_NAME = 'viva_rt';

const isProduction = config.NODE_ENV === 'production';
const refreshCookiePath = `${API_VERSION_PREFIX}/auth`;

export function refreshCookieMaxAgeMs(): number {
  return parseDurationToMs(config.AUTH.REFRESH_TOKEN_ACTIVE_TIME, 7 * 86_400_000);
}

export function attachRefreshCookie(res: Response, plainRefreshToken: string): void {
  res.cookie(REFRESH_COOKIE_NAME, plainRefreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: refreshCookiePath,
    maxAge: refreshCookieMaxAgeMs(),
  });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: refreshCookiePath,
  });
}
