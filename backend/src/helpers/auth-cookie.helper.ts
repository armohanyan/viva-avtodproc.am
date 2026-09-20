import type { Response } from 'express';
import config from '../config';
import { API_VERSION_PREFIX } from '../constants';
import { parseDurationToMs } from '../utils/token-time.util';

export const REFRESH_COOKIE_NAME = 'viva_rt';

/** Narrow path (legacy) + broader `/api` so nginx/Vite proxies always receive the cookie. */
const refreshCookiePaths = [`${API_VERSION_PREFIX}/auth`, '/api'] as const;

function originsDiffer(a: string, b: string): boolean {
  try {
    return new URL(a).origin !== new URL(b).origin;
  } catch {
    return false;
  }
}

function refreshCookieSecurity(): { secure: boolean; sameSite: 'lax' | 'none' } {
  const crossSite =
    config.AUTH.REFRESH_COOKIE_CROSS_SITE ||
    originsDiffer(config.API_PUBLIC_URL, config.PANEL_DEFAULT_ORIGIN);

  if (crossSite) {
    // Required for credentialed cross-origin fetches; browsers require Secure with SameSite=None.
    return { secure: true, sameSite: 'none' };
  }

  // Do not force Secure just because NODE_ENV=production — HTTP docker/staging would silently
  // drop the cookie and every refresh would return "Session expired".
  const apiIsHttps = config.API_PUBLIC_URL.trim().toLowerCase().startsWith('https://');
  const panelIsHttps = config.PANEL_DEFAULT_ORIGIN.trim().toLowerCase().startsWith('https://');
  return { secure: apiIsHttps || panelIsHttps, sameSite: 'lax' };
}

export function refreshCookieMaxAgeMs(): number {
  return parseDurationToMs(config.AUTH.REFRESH_TOKEN_ACTIVE_TIME, 7 * 86_400_000);
}

export function attachRefreshCookie(res: Response, plainRefreshToken: string): void {
  const { secure, sameSite } = refreshCookieSecurity();
  const maxAge = refreshCookieMaxAgeMs();
  for (const path of refreshCookiePaths) {
    res.cookie(REFRESH_COOKIE_NAME, plainRefreshToken, {
      httpOnly: true,
      secure,
      sameSite,
      path,
      maxAge,
    });
  }
}

export function clearRefreshCookie(res: Response): void {
  const { secure, sameSite } = refreshCookieSecurity();
  for (const path of refreshCookiePaths) {
    res.clearCookie(REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure,
      sameSite,
      path,
    });
  }
}
