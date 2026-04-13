import jwt from 'jsonwebtoken';
import config from '../config';
import type { AccountType } from '../models/user.model';

export type AccessTokenPayload = {
  sub: string;
  email: string;
  accountType: AccountType;
};

/** Parse `15m`-style duration to seconds for JWT (fallback 15 minutes). */
function accessTtlSeconds(): number {
  const raw = config.AUTH.ACCESS_TOKEN_ACTIVE_TIME.trim();
  const m = /^(\d+)\s*([smhd])$/i.exec(raw);
  if (!m) return 15 * 60;
  const n = Number(m[1]);
  const u = m[2]!.toLowerCase();
  const mult = u === 's' ? 1 : u === 'm' ? 60 : u === 'h' ? 3600 : 86400;
  return n * mult;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(
    { email: payload.email, accountType: payload.accountType },
    config.AUTH.JWT_ACCESS_SECRET,
    { subject: payload.sub, expiresIn: accessTtlSeconds() },
  );
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, config.AUTH.JWT_ACCESS_SECRET) as jwt.JwtPayload;
  const sub = decoded.sub;
  const email = decoded.email;
  const accountType = decoded.accountType;
  if (typeof sub !== 'string' || typeof email !== 'string' || typeof accountType !== 'string') {
    throw new Error('Invalid token payload');
  }
  return { sub, email, accountType: accountType as AccessTokenPayload['accountType'] };
}
