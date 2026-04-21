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

  /** Rotates refresh token: revokes the current row and returns a new plain token persisted for the same user. */
  static async rotate(plain: string): Promise<{ plain: string; userId: number } | null> {
    const tokenHash = hashRefreshToken(plain);
    const row = await RefreshToken.findOne({ where: { tokenHash } });
    if (!row) {
      return null;
    }
    // Refresh token reuse: presenting a rotated (revoked) token invalidates all sessions for that user.
    if (row.revokedAt) {
      await this.revokeAllForUser(row.userId);
      return null;
    }
    if (row.expiresAt.getTime() <= Date.now()) {
      return null;
    }
    const plainNext = newPlainRefresh();
    const tokenHashNext = hashRefreshToken(plainNext);
    const expiresAt = refreshExpiresAt();

    await RefreshToken.sequelize!.transaction(async (t) => {
      await row.update({ revokedAt: new Date() }, { transaction: t });
      await RefreshToken.create(
        {
          userId: row.userId,
          tokenHash: tokenHashNext,
          expiresAt,
        },
        { transaction: t },
      );
    });

    return { plain: plainNext, userId: row.userId };
  }

  static async revokeByPlain(plain: string): Promise<void> {
    const tokenHash = hashRefreshToken(plain);
    await RefreshToken.update({ revokedAt: new Date() }, { where: { tokenHash, revokedAt: { [Op.is]: null } } });
  }

  static async revokeAllForUser(userId: number): Promise<void> {
    await RefreshToken.update({ revokedAt: new Date() }, { where: { userId, revokedAt: { [Op.is]: null } } });
  }
}
