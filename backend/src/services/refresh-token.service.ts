import crypto from 'crypto';
import { Op } from 'sequelize';
import config from '../config';
import { RefreshToken } from '../models';
import { parseDurationToMs } from '../utils/token-time.util';

function pepper(): string {
  return config.AUTH.JWT_REFRESH_SECRET || config.AUTH.JWT_ACCESS_SECRET;
}

export function hashRefreshToken(plain: string): string {
  return crypto.createHash('sha256').update(`${plain}:${pepper()}`, 'utf8').digest('hex');
}

function newPlainRefresh(): string {
  return crypto.randomBytes(48).toString('base64url');
}

function refreshExpiresAt(): Date {
  const ms = parseDurationToMs(config.AUTH.REFRESH_TOKEN_ACTIVE_TIME, 7 * 86_400_000);
  return new Date(Date.now() + ms);
}

export type RefreshRedeemResult =
  | { status: 'ok'; plain: string; userId: number }
  | { status: 'invalid' };

export default class RefreshTokenService {
  static async createForUser(userId: number): Promise<{ plain: string; expiresAt: Date }> {
    const plain = newPlainRefresh();
    const tokenHash = hashRefreshToken(plain);
    const expiresAt = refreshExpiresAt();
    await RefreshToken.create({
      userId,
      tokenHash,
      expiresAt,
    });
    return { plain, expiresAt };
  }

  /**
   * Validates the refresh cookie and returns the same plain token.
   * Does not rotate - parallel tabs / Strict Mode double-refresh used to revoke the whole
   * session via reuse detection when two clients presented the same rotating token.
   */
  static async redeem(plain: string): Promise<RefreshRedeemResult> {
    const tokenHash = hashRefreshToken(plain);
    const row = await RefreshToken.findOne({ where: { tokenHash } });
    if (!row) {
      return { status: 'invalid' };
    }
    if (row.revokedAt) {
      return { status: 'invalid' };
    }
    if (row.expiresAt.getTime() <= Date.now()) {
      return { status: 'invalid' };
    }
    return { status: 'ok', plain, userId: row.userId };
  }

  static async revokeByPlain(plain: string): Promise<void> {
    const tokenHash = hashRefreshToken(plain);
    await RefreshToken.update({ revokedAt: new Date() }, { where: { tokenHash, revokedAt: { [Op.is]: null } } });
  }

  static async revokeAllForUser(userId: number): Promise<void> {
    await RefreshToken.update({ revokedAt: new Date() }, { where: { userId, revokedAt: { [Op.is]: null } } });
  }
}
