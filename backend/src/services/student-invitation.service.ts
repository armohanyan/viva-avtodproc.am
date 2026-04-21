import crypto from 'crypto';
import { Op } from 'sequelize';
import config from '../config';
import { OAuthAccount, StudentInvitation, User } from '../models';
import MailService from './mail.service';
import bcrypt from 'bcryptjs';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function sha256Hex(s: string): string {
  return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
}

function randomUrlToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export default class StudentInvitationService {
  static async createAndEmailInvite(studentUserId: number): Promise<{ ok: true } | { ok: false; message: string }> {
    const user = await User.findByPk(studentUserId);
    if (!user || user.accountType !== 'student') {
      return { ok: false, message: 'Student not found' };
    }

    if (user.passwordHash) {
      return { ok: false, message: 'This student already has a password set' };
    }

    const oauthCount = await OAuthAccount.count({ where: { userId: user.id } });
    if (oauthCount > 0) {
      return { ok: false, message: 'This account uses social sign-in; invitation is not available' };
    }

    const plainToken = randomUrlToken();
    const tokenHash = sha256Hex(plainToken);
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

    await StudentInvitation.update(
      { consumedAt: new Date() },
      {
        where: {
          userId: user.id,
          consumedAt: { [Op.is]: null },
        },
      },
    );

    await StudentInvitation.create({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    const base = config.PANEL_DEFAULT_ORIGIN.replace(/\/+$/, '');
    const setupUrl = `${base}/setup-password?token=${encodeURIComponent(plainToken)}`;

    try {
      await MailService.sendStudentInvitation(user.email, user.name, setupUrl);
    } catch (e) {
      await StudentInvitation.destroy({ where: { tokenHash } });
      const msg = e instanceof Error ? e.message : 'Failed to send email';
      return { ok: false, message: msg };
    }

    return { ok: true };
  }

  static async validateToken(plainToken: string): Promise<{ valid: true; email: string } | { valid: false }> {
    if (!plainToken || plainToken.length < 16) {
      return { valid: false };
    }
    const tokenHash = sha256Hex(plainToken);
    const inv = await StudentInvitation.findOne({ where: { tokenHash, consumedAt: { [Op.is]: null } } });
    if (!inv || new Date(inv.expiresAt).getTime() <= Date.now()) {
      return { valid: false };
    }
    const user = await User.findByPk(inv.userId, { attributes: ['email'] });
    if (!user) {
      return { valid: false };
    }
    const [local] = user.email.split('@');
    const masked = `${local.slice(0, 2)}***@${user.email.split('@')[1] ?? ''}`;
    return { valid: true, email: masked };
  }

  static async completeSetupPassword(
    plainToken: string,
    newPassword: string,
  ): Promise<{ ok: true } | { ok: false; message: string }> {
    if (newPassword.length < 8) {
      return { ok: false, message: 'Password must be at least 8 characters' };
    }
    if (!plainToken || plainToken.length < 16) {
      return { ok: false, message: 'Invalid or expired invitation' };
    }
    const tokenHash = sha256Hex(plainToken);
    const inv = await StudentInvitation.findOne({
      where: { tokenHash, consumedAt: { [Op.is]: null } },
    });
    if (!inv || new Date(inv.expiresAt).getTime() <= Date.now()) {
      return { ok: false, message: 'Invalid or expired invitation' };
    }

    const user = await User.findByPk(inv.userId);
    if (!user || user.accountType !== 'student') {
      return { ok: false, message: 'Invalid invitation' };
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await user.update({ passwordHash, isActive: true });
    await inv.update({ consumedAt: new Date() });

    return { ok: true };
  }
}
