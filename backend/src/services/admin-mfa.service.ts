import crypto from 'crypto';
import { Op } from 'sequelize';
import config from '../config';
import { signAdminMfaToken, verifyAdminMfaToken } from '../helpers';
import { AdminMfaChallenge, User } from '../models';
import MailService from './mail.service';
import AuthService, { type AuthTokensDto } from './auth.service';

const OTP_MS = 10 * 60 * 1000;

function hashOtp(code: string): string {
  return crypto.createHmac('sha256', config.AUTH.JWT_ACCESS_SECRET).update(`admin-otp:${code}`).digest('hex');
}

function randomSixDigitCode(): string {
  const n = crypto.randomInt(0, 1_000_000);
  return String(n).padStart(6, '0');
}

export default class AdminMfaService {
  /** Creates challenge, emails OTP, returns opaque MFA JWT (no refresh/session yet). */
  static async startForUser(user: User): Promise<{ mfaToken: string }> {
    const code = randomSixDigitCode();
    const codeHash = hashOtp(code);
    const expiresAt = new Date(Date.now() + OTP_MS);

    await AdminMfaChallenge.update(
      { consumedAt: new Date() },
      {
        where: {
          userId: user.id,
          consumedAt: { [Op.is]: null },
          expiresAt: { [Op.gt]: new Date(0) },
        },
      },
    );

    const row = await AdminMfaChallenge.create({
      userId: user.id,
      codeHash,
      expiresAt,
    });

    await MailService.sendAdminEmailOtp(user.email, user.name, code);

    const mfaToken = signAdminMfaToken({
      typ: 'admin_mfa',
      challengeId: row.id,
      sub: String(user.id),
    });
    return { mfaToken };
  }

  static async verifyAndIssueSession(mfaToken: string, code: string): Promise<AuthTokensDto | null> {
    let payload: ReturnType<typeof verifyAdminMfaToken>;
    try {
      payload = verifyAdminMfaToken(mfaToken);
    } catch {
      return null;
    }

    const trimmed = code.trim();
    if (!/^\d{6}$/.test(trimmed)) {
      return null;
    }

    const challenge = await AdminMfaChallenge.findOne({
      where: { id: payload.challengeId, userId: Number(payload.sub) },
    });
    if (!challenge || challenge.consumedAt) {
      return null;
    }
    if (new Date(challenge.expiresAt).getTime() <= Date.now()) {
      return null;
    }

    const expected = challenge.codeHash;
    const actual = hashOtp(trimmed);
    if (expected.length !== actual.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual))) {
      return null;
    }

    await challenge.update({ consumedAt: new Date() });

    const user = await User.findByPk(challenge.userId);
    if (!user) {
      return null;
    }

    if (user.accountType !== 'admin' && user.accountType !== 'super_admin') {
      return null;
    }

    return AuthService.issueFullSessionAfterVerification(user);
  }
}
