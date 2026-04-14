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

function newTokenId(): string {
  return `RT-${Date.now().toString(36)}-${crypto.randomBytes(8).toString('hex')}`;
}

function newPlainRefresh(): string {
  return crypto.randomBytes(48).toString('base64url');
}

function refreshExpiresAt(): Date {
  const ms = parseDurationToMs(config.AUTH.REFRESH_TOKEN_ACTIVE_TIME, 7 * 86_400_000);
  return new Date(Date.now() + ms);
}

export default class RefreshTokenService {
  static async createForUser(userId: string): Promise<{ plain: string; expiresAt: Date }> {
    const plain = newPlainRefresh();
    const tokenHash = hashRefreshToken(plain);
    const expiresAt = refreshExpiresAt();
    await RefreshToken.create({
      id: newTokenId(),
      userId,
      tokenHash,
      expiresAt,
    });
    return { plain, expiresAt };
  }

  static async findValidByPlain(plain: string): Promise<RefreshToken | null> {
    const tokenHash = hashRefreshToken(plain);
    const row = await RefreshToken.findOne({ where: { tokenHash } });
    if (!row || row.revokedAt) {
      return null;
    }
    if (row.expiresAt.getTime() <= Date.now()) {
      return null;
    }
    return row;
  }

  /** Rotates refresh token: revokes the current row and returns a new plain token persisted for the same user. */
  static async rotate(plain: string): Promise<{ plain: string; userId: string } | null> {
    const row = await this.findValidByPlain(plain);
    if (!row) {
      return null;
    }
    const plainNext = newPlainRefresh();
    const tokenHashNext = hashRefreshToken(plainNext);
    const nextId = newTokenId();
    const expiresAt = refreshExpiresAt();

    await RefreshToken.sequelize!.transaction(async (t) => {
      await row.update({ revokedAt: new Date() }, { transaction: t });
      await RefreshToken.create(
        {
          id: nextId,
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

  static async revokeAllForUser(userId: string): Promise<void> {
    await RefreshToken.update({ revokedAt: new Date() }, { where: { userId, revokedAt: { [Op.is]: null } } });
  }
}
