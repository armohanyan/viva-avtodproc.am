import jwt from 'jsonwebtoken';
import config from '../config';
import type { AccountType } from '../models/user.model';
import { parseDurationToSeconds } from '../utils/token-time.util';

export type AccessTokenPayload = {
  sub: string;
  email: string;
  accountType: AccountType;
};

function accessTtlSeconds(): number {
  return parseDurationToSeconds(config.AUTH.ACCESS_TOKEN_ACTIVE_TIME, 15 * 60);
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

export type AdminMfaTokenPayload = { typ: 'admin_mfa'; challengeId: number; sub: string };

export function signAdminMfaToken(payload: AdminMfaTokenPayload): string {
  return jwt.sign(
    { typ: payload.typ, challengeId: payload.challengeId },
    config.AUTH.JWT_ACCESS_SECRET,
    { subject: payload.sub, expiresIn: 15 * 60 },
  );
}

export function verifyAdminMfaToken(token: string): AdminMfaTokenPayload {
  const decoded = jwt.verify(token, config.AUTH.JWT_ACCESS_SECRET) as jwt.JwtPayload;
  if (decoded.typ !== 'admin_mfa') {
    throw new Error('Invalid MFA token type');
  }
  const sub = decoded.sub;
  const rawCid = decoded.challengeId;
  const challengeId = typeof rawCid === 'number' ? rawCid : Number(rawCid);
  if (typeof sub !== 'string' || !Number.isFinite(challengeId) || challengeId <= 0) {
    throw new Error('Invalid MFA token payload');
  }
  return { typ: 'admin_mfa', challengeId, sub };
}
