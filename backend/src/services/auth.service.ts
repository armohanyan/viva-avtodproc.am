import bcrypt from 'bcryptjs';
import { sequelize } from '../database/sequelize';
import { signAccessToken } from '../helpers';
import { OAuthAccount, User } from '../models';
import type { AccountType } from '../models/user.model';
import type { OAuthProvider } from '../models/oauth-account.model';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';
import RefreshTokenService from './refresh-token.service';

const { UnauthorizedError, ConflictError } = ErrorsUtil;

export type AuthUserDto = { id: number; email: string; name: string; accountType: AccountType; phone: string | null };

export type AuthTokensDto = {
  accessToken: string;
  user: AuthUserDto;
  /** Opaque refresh token — set as httpOnly cookie only; never include in JSON responses. */
  refreshPlain: string;
};

function toDto(user: User): AuthUserDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    accountType: user.accountType,
    phone: user.phone ?? null,
  };
}

export default class AuthService {
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

  static async login(email: string, password: string): Promise<AuthTokensDto> {
    const normalized = email.trim().toLowerCase();
    const user = await User.findOne({ where: { email: normalized } });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password', HttpStatusCodesUtil.UNAUTHORIZED);
    }

    if (!user.passwordHash) {
      throw new UnauthorizedError(
        'This account uses social sign-in. Use Google, Facebook, or Apple to sign in.',
        HttpStatusCodesUtil.UNAUTHORIZED,
      );
    }

    const ok = await bcrypt.compare(password, user.passwordHash);

    if (!ok) {
      throw new UnauthorizedError('Invalid email or password', HttpStatusCodesUtil.UNAUTHORIZED);
    }

    return this.issueTokens(user);
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
}
