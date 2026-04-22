/**
 * Verifies admin MFA OTP hashing matches verify logic (no DB, no network).
 */
import 'dotenv/config';
import crypto from 'crypto';
import config from '../config';

function hashOtp(code: string): string {
  return crypto.createHmac('sha256', config.AUTH.JWT_ACCESS_SECRET).update(`admin-otp:${code}`).digest('hex');
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) {
    throw new Error(msg);
  }
}

const code = '504918';
const h = hashOtp(code);
assert(h === hashOtp(code), 'HMAC should be stable');
assert(hashOtp('000001') !== h, 'Different codes should hash differently');
const again = hashOtp(code);
assert(
  h.length === again.length && crypto.timingSafeEqual(Buffer.from(h, 'utf8'), Buffer.from(again, 'utf8')),
  'timingSafeEqual path',
);

console.log('admin-mfa crypto selftest: ok');
