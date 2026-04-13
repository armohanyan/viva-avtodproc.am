import bcrypt from 'bcryptjs';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';
import { signAccessToken } from '../helpers/jwt.helper';
import { User } from '../models';

const { UnauthorizedError, ConflictError } = ErrorsUtil;

export default class AuthService {
  static async login(email: string, password: string): Promise<{ token: string; user: { id: string; email: string; name: string; accountType: string } }> {
    const normalized = email.trim().toLowerCase();
    const user = await User.findOne({ where: { email: normalized } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedError('Invalid email or password', HttpStatusCodesUtil.UNAUTHORIZED);
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedError('Invalid email or password', HttpStatusCodesUtil.UNAUTHORIZED);
    }
    const token = signAccessToken({
      sub: user.id,
      email: user.email,
      accountType: user.accountType,
    });
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        accountType: user.accountType,
      },
    };
  }

  static async register(input: {
    email: string;
    password: string;
    name: string;
    phone?: string;
  }): Promise<{ token: string; user: { id: string; email: string; name: string; accountType: string } }> {
    const email = input.email.trim().toLowerCase();
    const existing = await User.findOne({ where: { email: email } });
    if (existing) {
      throw new ConflictError('Email already registered', HttpStatusCodesUtil.CONFLICT);
    }
    const passwordHash = await bcrypt.hash(input.password, 10);
    const id = `USR-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const user = await User.create({
      id,
      email,
      name: input.name.trim(),
      phone: input.phone?.trim() || null,
      accountType: 'student',
      passwordHash,
    });
    const token = signAccessToken({
      sub: user.id,
      email: user.email,
      accountType: user.accountType,
    });
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        accountType: user.accountType,
      },
    };
  }
}
