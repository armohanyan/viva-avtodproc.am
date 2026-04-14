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
