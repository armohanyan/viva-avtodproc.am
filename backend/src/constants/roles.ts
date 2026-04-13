export const ROLES = {
  admin: 'admin',
  primeminister: 'primeminister',
  member: 'member',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
