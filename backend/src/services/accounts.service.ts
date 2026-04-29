import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import type { AccountType } from '../models/user.model';
import { User } from '../models';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';
import StudentInvitationService from './student-invitation.service';

const { ConflictError } = ErrorsUtil;

export type AccountRow = {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: AccountType;
  status: 'active' | 'inactive';
  created: string;
};

function toRow(u: User): AccountRow {
  const createdRaw = (u as unknown as { createdAt?: Date | string }).createdAt;
  const created =
    createdRaw instanceof Date
      ? createdRaw.toISOString().slice(0, 10)
      : typeof createdRaw === 'string'
        ? createdRaw.slice(0, 10)
        : '';
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone ?? '',
    role: u.accountType,
    status: u.isActive ? 'active' : 'inactive',
    created,
  };
}

export default class AccountsService {
  static async list(filters?: { roles?: AccountType[] }): Promise<AccountRow[]> {
    const rows = await User.findAll({
      where: filters?.roles?.length ? { accountType: { [Op.in]: filters.roles } } : undefined,
      order: [['createdAt', 'DESC']],
    });
    return rows.map(toRow);
  }

  static async getById(id: number): Promise<AccountRow | null> {
    const user = await User.findByPk(id);
    if (!user) return null;
    return toRow(user);
  }

  static async create(input: {
    name: string;
    email: string;
    phone?: string;
    accountType: AccountType;
    password?: string;
    isActive?: boolean;
    sendInvite?: boolean;
  }): Promise<AccountRow> {
    const email = input.email.trim().toLowerCase();
    const dup = await User.findOne({ where: { email } });
    if (dup) {
      throw new ConflictError('Email already in use', HttpStatusCodesUtil.CONFLICT);
    }
    let passwordHash: string | null = null;
    if (input.password && input.password.length > 0) {
      passwordHash = await bcrypt.hash(input.password, 10);
    }
    const u = await User.create({
      email,
      name: input.name.trim(),
      phone: input.phone?.trim() || null,
      accountType: input.accountType,
      passwordHash,
      isActive: input.isActive !== false,
    });
    if (input.sendInvite && !input.password) {
      if (input.accountType === 'student') await StudentInvitationService.createAndEmailInvite(u.id);
      if (input.accountType === 'instructor') await StudentInvitationService.createAndEmailInstructorInvite(u.id);
      if (input.accountType === 'admin') await StudentInvitationService.createAndEmailAdminInvite(u.id);
      if (input.accountType === 'super_admin') await StudentInvitationService.createAndEmailSuperAdminInvite(u.id);
    }
    return toRow(u);
  }

  static async update(
    id: number,
    patch: Partial<{
      name: string;
      email: string;
      phone: string | null;
      accountType: AccountType;
      isActive: boolean;
      password: string;
    }>,
  ): Promise<AccountRow | null> {
    const u = await User.findByPk(id);
    if (!u) return null;
    if (patch.email !== undefined) {
      const email = patch.email.trim().toLowerCase();
      const other = await User.findOne({ where: { email, id: { [Op.ne]: id } } });
      if (other) {
        throw new ConflictError('Email already in use', HttpStatusCodesUtil.CONFLICT);
      }
    }
    if (patch.name !== undefined) u.name = patch.name.trim();
    if (patch.email !== undefined) u.email = patch.email.trim().toLowerCase();
    if (patch.phone !== undefined) u.phone = patch.phone;
    if (patch.accountType !== undefined) u.accountType = patch.accountType;
    if (patch.isActive !== undefined) u.isActive = patch.isActive;
    if (patch.password !== undefined && patch.password.length > 0) {
      u.passwordHash = await bcrypt.hash(patch.password, 10);
    }
    await u.save();
    await u.reload();
    return toRow(u);
  }

  static async remove(id: number): Promise<boolean> {
    const n = await User.destroy({ where: { id } });
    return n > 0;
  }
}
