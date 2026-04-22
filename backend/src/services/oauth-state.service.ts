import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import type { CorsOptions } from 'cors';
import config from '../config';
import type { OAuthProvider } from '../models/oauth-account.model';

export type OAuthStatePayload = { t: 'oauth'; v: 1; p: OAuthProvider; next: string; ro?: string; nonce?: string };

function sanitizeNextPath(next: string | undefined): string {
  const raw = (next || '/dashboard').trim();

  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('://')) {
    return '/dashboard';
  }

  return raw.slice(0, 512);
}

function isOriginAllowed(origin: string): boolean {
  const o = config.CORS_ORIGINS as CorsOptions['origin'];
  if (o === true) {
    return /^https?:\/\//i.test(origin);
  }

  if (typeof o === 'string') {
    return o === origin;
  }

  if (Array.isArray(o)) {
    return o.includes(origin);
  }

  if (typeof o === 'function') {
    return /^https?:\/\//i.test(origin);
  }
  return false;
}

/** Browser origin to complete OAuth (panel / marketing). Must match configured CORS when CORS is not `*`. */
export function sanitizeReturnOrigin(raw: string | undefined): string | undefined {
  const s = raw?.trim();
  if (!s) return undefined;

  try {
    const u = new URL(s);

    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return undefined;
    }

    const origin = u.origin;
    if (!isOriginAllowed(origin)) {
      return undefined;
    }

    return origin;
  } catch {
    return undefined;
  }
}

export function signOAuthState(
  provider: OAuthProvider,
  nextPath: string | undefined,
  returnOrigin?: string,
): string {
  const ro = sanitizeReturnOrigin(returnOrigin);
  const nonce = provider === 'apple' ? crypto.randomBytes(16).toString('hex') : undefined;
  const payload: OAuthStatePayload = {
    t: 'oauth',
    v: 1,
    p: provider,
    next: sanitizeNextPath(nextPath),
    ...(ro ? { ro } : {}),
    ...(nonce ? { nonce } : {}),
  };

  return jwt.sign(payload, config.AUTH.JWT_ACCESS_SECRET, { expiresIn: '10m' });
}

/** Read nonce from an unsigned state JWT (only for building the Apple authorize URL). */
export function peekNonceFromState(state: string): string | undefined {
  const dec = jwt.decode(state) as OAuthStatePayload | null;
  return typeof dec?.nonce === 'string' && dec.nonce ? dec.nonce : undefined;
}

export function verifyOAuthState(token: string): OAuthStatePayload {
  const decoded = jwt.verify(token, config.AUTH.JWT_ACCESS_SECRET) as jwt.JwtPayload;

  if (decoded.t !== 'oauth' || decoded.v !== 1 || typeof decoded.p !== 'string' || typeof decoded.next !== 'string') {
    throw new Error('Invalid OAuth state');
  }

  const next = sanitizeNextPath(decoded.next);
  const ro = typeof decoded.ro === 'string' ? sanitizeReturnOrigin(decoded.ro) : undefined;
  const nonce = typeof decoded.nonce === 'string' && decoded.nonce ? decoded.nonce : undefined;

  return { t: 'oauth', v: 1, p: decoded.p as OAuthProvider, next, ...(ro ? { ro } : {}), ...(nonce ? { nonce } : {}) };
}
