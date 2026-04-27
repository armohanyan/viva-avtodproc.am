import bcrypt from 'bcryptjs';
import { User } from '../models';

const DEMO_PASSWORD = 'demo1234';

const SUPER_ADMIN_SEED = {
  email: 'vivaaftodproc@gmail.com',
  name: 'Super Admin',
  accountType: 'super_admin' as const,
};

async function hashDemo(): Promise<string> {
  return bcrypt.hash(DEMO_PASSWORD, 10);
}

/** Inserts the initial super admin when the `users` table is empty. */
export async function seedDatabaseIfEmpty(): Promise<void> {
  if ((await User.count()) > 0) {
    return;
  }
  const passwordHash = await hashDemo();
  await User.create({
    ...SUPER_ADMIN_SEED,
    passwordHash,
  });
}
