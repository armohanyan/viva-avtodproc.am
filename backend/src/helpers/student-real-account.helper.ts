import { Op, type WhereOptions } from 'sequelize';
import type { User } from '../models/user.model';

export const INTERNAL_NO_LOGIN_EMAIL_DOMAIN = 'no-login.local';

export function isInternalNoLoginEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(`@${INTERNAL_NO_LOGIN_EMAIL_DOMAIN}`);
}

/** Sequelize filter for student users with a real contact email (excludes office placeholders). */
export function realStudentUserWhere(): WhereOptions<User> {
  return {
    accountType: 'student',
    email: { [Op.notLike]: `%@${INTERNAL_NO_LOGIN_EMAIL_DOMAIN}` },
  };
}

export function studentHasPortalAccess(user: { passwordHash?: string | null }, oauthUserIds: ReadonlySet<number>, userId: number): boolean {
  if (user.passwordHash) return true;
  return oauthUserIds.has(userId);
}
