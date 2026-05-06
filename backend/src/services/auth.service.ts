import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import config from '../config';
import { sequelize } from '../database/sequelize';
import { signAccessToken } from '../helpers';
import { Branch, OAuthAccount, StudentProfile, User } from '../models';
import type { AccountType } from '../models/user.model';
import type { OAuthProvider } from '../models/oauth-account.model';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';
import LoggerUtil from '../utils/logger.util';
import MailService, { isTransactionalMailConfigured } from './mail.service';
import RefreshTokenService from './refresh-token.service';

const { UnauthorizedError, ConflictError } = ErrorsUtil;

export type AuthUserDto = {
  id: number;
  email: string;
  name: string;
  accountType: AccountType;
  phone: string | null;
  /** False for OAuth-only accounts (`passwordHash` unset). */
  hasPassword: boolean;
};

export type AuthTokensDto = {
  accessToken: string;
  user: AuthUserDto;
  /** Opaque refresh token — set as httpOnly cookie only; never include in JSON responses. */
  refreshPlain: string;
};

export type LoginOutcome =
  | { kind: 'session'; tokens: AuthTokensDto }
  | { kind: 'mfa_required'; mfaToken: string };

function sha256Hex(s: string): string {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
}

function randomUrlToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

function toDto(user: User): AuthUserDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    accountType: user.accountType,
    phone: user.phone ?? null,
    hasPassword: Boolean(user.passwordHash),
  };
}

export default class AuthService {
  private static async ensureStudentProfile(userId: number): Promise<void> {
    const existing = await StudentProfile.findOne({ where: { userId } });
    if (existing) {
      return;
    }
    const branch = await Branch.findOne({ order: [['id', 'ASC']] });
    if (!branch) {
      return;
    }
    await StudentProfile.create({
      userId,
      branchId: branch.id,
      packageId: null,
      instructorUserId: null,
      lessonsCompleted: 0,
      lessonsTotal: 0,
      theoryLessonsCompleted: 0,
      theoryLessonsTotal: 0,
      enrollmentStatus: 'active',
      skillRating: 0,
      licenseAchieved: false,
      joinedAt: new Date().toISOString().slice(0, 10),
    });
  }

  private static async assertActive(user: User): Promise<void> {
    if (!user.isActive) {
      throw new UnauthorizedError('Account is disabled', HttpStatusCodesUtil.UNAUTHORIZED);
    }
  }

  private static async issueTokens(user: User): Promise<AuthTokensDto> {
    await this.assertActive(user);

    const accessToken = signAccessToken({
      sub: String(user.id),
      email: user.email,
      accountType: user.accountType,
    });
    const { plain } = await RefreshTokenService.createForUser(user.id);

    return { accessToken, user: toDto(user), refreshPlain: plain };
  }

  /** Used after email MFA or invitation password setup — same as a successful login. */
  static async issueFullSessionAfterVerification(user: User): Promise<AuthTokensDto> {
    return this.issueTokens(user);
  }

  static async login(email: string, password: string): Promise<LoginOutcome> {
    const normalized = email.trim().toLowerCase();
    const user = await User.findOne({ where: { email: normalized } });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password', HttpStatusCodesUtil.UNAUTHORIZED);
    }

    if (!user.passwordHash) {
      throw new UnauthorizedError(
        'This account uses social sign-in. Use Google or Facebook to sign in.',
        HttpStatusCodesUtil.UNAUTHORIZED,
      );
    }

    const ok = await bcrypt.compare(password, user.passwordHash);

    if (!ok) {
      throw new UnauthorizedError('Invalid email or password', HttpStatusCodesUtil.UNAUTHORIZED);
    }

    if (user.accountType === 'admin' || user.accountType === 'super_admin') {
      const { default: AdminMfaService } = await import('./admin-mfa.service');
      const { mfaToken } = await AdminMfaService.startForUser(user);
      return { kind: 'mfa_required', mfaToken };
    }

    const tokens = await this.issueTokens(user);
    return { kind: 'session', tokens };
  }

  static async register(input: {
    email: string;
    password: string;
    name: string;
    phone?: string;
  }): Promise<AuthTokensDto> {
    const email = input.email.trim().toLowerCase();
    const existing = await User.findOne({ where: { email } });

    if (existing) {
      throw new ConflictError('Email already registered', HttpStatusCodesUtil.CONFLICT);
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    const user = await User.create({
      email,
      name: input.name.trim(),
      phone: input.phone?.trim() || null,
      accountType: 'student',
      passwordHash,
    });

    await this.ensureStudentProfile(user.id);

    return this.issueTokens(user);
  }

  /** Returns new access + rotated refresh, or null if refresh is invalid. */
  static async refreshWithPlain(refreshPlain: string): Promise<AuthTokensDto | null> {
    const rotated = await RefreshTokenService.rotate(refreshPlain);
    if (!rotated) {
      return null;
    }

    const user = await User.findByPk(rotated.userId);
    if (!user) {
      return null;
    }

    try {
      await this.assertActive(user);
    } catch {
      return null;
    }

    const accessToken = signAccessToken({
      sub: String(user.id),
      email: user.email,
      accountType: user.accountType,
    });

    return { accessToken, user: toDto(user), refreshPlain: rotated.plain };
  }

  static async logoutPlain(refreshPlain: string | undefined): Promise<void> {
    if (refreshPlain) {
      await RefreshTokenService.revokeByPlain(refreshPlain);
    }
  }

  static async findOrCreateOAuthUser(input: {
    provider: OAuthProvider;
    providerUserId: string;
    email: string;
    name: string;
  }): Promise<AuthTokensDto> {
    const email = input.email.trim().toLowerCase();
    const nameTrim = input.name.trim() || email.split('@')[0] || 'User';

    const user = await sequelize.transaction(async (t) => {
      const existingLink = await OAuthAccount.findOne({
        where: { provider: input.provider, providerUserId: input.providerUserId },
        transaction: t,
      });

      if (existingLink) {
        const u = await User.findByPk(existingLink.userId, { transaction: t });

        if (!u) {
          throw new UnauthorizedError('Account not found', HttpStatusCodesUtil.UNAUTHORIZED);
        }

        return u;
      }

      let u = await User.findOne({ where: { email }, transaction: t });
      if (!u) {
        u = await User.create(
          {
            email,
            name: nameTrim,
            phone: null,
            accountType: 'student',
            passwordHash: null,
          },
          { transaction: t },
        );
        await this.ensureStudentProfile(u.id);
      }

      await OAuthAccount.create(
        {
          userId: u.id,
          provider: input.provider,
          providerUserId: input.providerUserId,
        },
        { transaction: t },
      );

      return u;
    });

    return this.issueTokens(user);
  }

  static async me(userId: string): Promise<AuthUserDto | null> {
    const user = await User.findByPk(userId);

    if (!user || !user.isActive) {
      return null;
    }

    return toDto(user);
  }

  static async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new UnauthorizedError('Invalid or expired token', HttpStatusCodesUtil.UNAUTHORIZED);
    }

    await this.assertActive(user);

    if (!user.passwordHash) {
      throw new UnauthorizedError(
        'This account uses social sign-in; password cannot be changed here.',
        HttpStatusCodesUtil.UNAUTHORIZED,
      );
    }

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedError('Current password is incorrect', HttpStatusCodesUtil.UNAUTHORIZED);
    }

    await user.update({ passwordHash: await bcrypt.hash(newPassword, 10) });
  }

  static async updateMe(
    userId: number,
    patch: { name?: string; phone?: string | null },
  ): Promise<AuthUserDto | null> {
    const user = await User.findByPk(userId);

    if (!user || !user.isActive) {
      return null;
    }

    await user.update({
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.phone !== undefined
        ? { phone: patch.phone === null || patch.phone === '' ? null : String(patch.phone).trim() }
        : {}),
    });

    return toDto(user);
  }

  /**
   * Issues a reset link by email when the account exists and has a password.
   * Always completes without throwing (no email enumeration); logs mail misconfiguration / send failures.
   */
  static async requestPasswordReset(email: string): Promise<void> {
    if (!isTransactionalMailConfigured()) {
      LoggerUtil.warn('Password reset skipped: set BREVO_API_KEY and SENDER_EMAIL');
      return;
    }

    const normalized = email.trim().toLowerCase();

    const user = await User.findOne({ where: { email: normalized } });

    if (!user || !user.isActive || !user.passwordHash) {
      return;
    }

    const plainToken = randomUrlToken();
    const tokenHash = sha256Hex(plainToken);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

    await user.update({ passwordResetTokenHash: tokenHash, passwordResetExpiresAt: expiresAt });

    const base = config.PANEL_DEFAULT_ORIGIN.replace(/\/+$/, '');
    const resetUrl = `${base}/reset-password?token=${encodeURIComponent(plainToken)}`;

    try {
      await MailService.sendPasswordReset(user.email, user.name, resetUrl);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);

      LoggerUtil.error(`Password reset email failed for user ${user.id}: ${msg}`);

      await user.update({ passwordResetTokenHash: null, passwordResetExpiresAt: null });
    }
  }

  static async validatePasswordResetToken(
    plainToken: string,
  ): Promise<{ valid: true; email: string } | { valid: false }> {
    if (!plainToken || plainToken.length < 16) {
      return { valid: false };
    }
    const tokenHash = sha256Hex(plainToken);
    const user = await User.findOne({
      where: {
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: { [Op.gt]: new Date() },
      },
      attributes: ['email'],
    });
    if (!user) {
      return { valid: false };
    }
    const [local, domain = ''] = user.email.split('@');
    const masked = `${local.slice(0, 2)}***@${domain}`;
    return { valid: true, email: masked };
  }

  static async completePasswordReset(
    plainToken: string,
    newPassword: string,
  ): Promise<{ ok: true } | { ok: false; message: string }> {
    if (newPassword.length < 8) {
      return { ok: false, message: 'Password must be at least 8 characters' };
    }

    if (!plainToken || plainToken.length < 16) {
      return { ok: false, message: 'Invalid or expired reset link' };
    }

    const tokenHash = sha256Hex(plainToken);
    const user = await User.findOne({
      where: {
        passwordResetTokenHash: tokenHash,
        passwordResetExpiresAt: { [Op.gt]: new Date() },
      },
    });

    if (!user || !user.isActive) {
      return { ok: false, message: 'Invalid or expired reset link' };
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await user.update({
      passwordHash,
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
    });

    await RefreshTokenService.revokeAllForUser(user.id);

    return { ok: true };
  }
}
