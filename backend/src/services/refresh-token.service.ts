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

/**
 * Parallel refresh requests often present a just-rotated token within a short window.
 * Treat that as a race, not theft. Delayed reuse (stolen token) still revokes all sessions.
 */
const REFRESH_REUSE_GRACE_MS = 30_000;

export type RefreshRotateResult =
  | { status: 'ok'; plain: string; userId: number }
  /** Another request already rotated this token; caller's cookie may already be stale in-flight. */
  | { status: 'conflict' }
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
   * Rotates refresh token: revokes the current row and returns a new plain token persisted for the same user.
   * Uses a conditional update so concurrent rotators do not both "win" and then trip reuse detection.
   */
  static async rotate(plain: string): Promise<RefreshRotateResult> {
    const tokenHash = hashRefreshToken(plain);
    const row = await RefreshToken.findOne({ where: { tokenHash } });
    if (!row) {
      return { status: 'invalid' };
    }

    if (row.expiresAt.getTime() <= Date.now()) {
      return { status: 'invalid' };
    }

    if (row.revokedAt) {
      const revokedAgoMs = Date.now() - row.revokedAt.getTime();
      if (revokedAgoMs > REFRESH_REUSE_GRACE_MS) {
        await this.revokeAllForUser(row.userId);
        return { status: 'invalid' };
      }
      // Likely a concurrent refresh race (or a login that replaced the cookie mid-flight).
      return { status: 'conflict' };
    }

    const plainNext = newPlainRefresh();
    const tokenHashNext = hashRefreshToken(plainNext);
    const expiresAt = refreshExpiresAt();

    const won = await RefreshToken.sequelize!.transaction(async (t) => {
      const [affected] = await RefreshToken.update(
        { revokedAt: new Date() },
        {
          where: { id: row.id, revokedAt: { [Op.is]: null } },
          transaction: t,
        },
      );
      if (affected === 0) {
        return false;
      }
      await RefreshToken.create(
        {
          userId: row.userId,
          tokenHash: tokenHashNext,
          expiresAt,
        },
        { transaction: t },
      );
      return true;
    });

    if (!won) {
      return { status: 'conflict' };
    }

    return { status: 'ok', plain: plainNext, userId: row.userId };
  }

  static async revokeByPlain(plain: string): Promise<void> {
    const tokenHash = hashRefreshToken(plain);
    await RefreshToken.update({ revokedAt: new Date() }, { where: { tokenHash, revokedAt: { [Op.is]: null } } });
  }

  static async revokeAllForUser(userId: number): Promise<void> {
    await RefreshToken.update({ revokedAt: new Date() }, { where: { userId, revokedAt: { [Op.is]: null } } });
  }
}
