export const USER_STATUS = {
  active: 'active',
  passive: 'passive',
} as const;

export type UserStatus = (typeof USER_STATUS)[keyof typeof USER_STATUS];
