export const DIRECTOR_OPTION_CATEGORIES = [
  'exp_type',
  'sal_role',
  'cash_type',
  'fuel_type',
] as const;

export type DirectorOptionCategory = (typeof DIRECTOR_OPTION_CATEGORIES)[number];

export const DIRECTOR_OPTION_DEFAULTS: Record<DirectorOptionCategory, readonly string[]> = {
  exp_type: [
    'Վարձակալություն',
    'Կոմունալ',
    'Մեքենայի վերանորոգում',
    'Գովազդ',
    'Գրասենյակային',
    'Աշխատավարձ',
    'Ինկասացիա',
    'Սարքավորում',
    'Այլ',
  ],
  sal_role: ['Հրահանգիչ', 'Տեսության ուսուցիչ', 'Մենեջեր', 'Այլ'],
  cash_type: ['Ինկասացիա', 'Կանխիկ մուտք', 'Այլ'],
  fuel_type: ['Գազ', 'Բենզին', 'Դիզել'],
};
