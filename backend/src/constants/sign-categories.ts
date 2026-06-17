/** Armenian category slugs — same order as `questions/client-signs/index.json`. */
export const SIGN_CATEGORY_SLUGS = [
  'nakhazgushacvog-nshanner',
  'arravelutyan-nshanner',
  'argelogh-nshanner',
  'teladrogh-nshanner',
  'hatuk-teladranqi-nshanner',
  'teghekatvutyan-nshanner',
  'spasarkman-nshanner',
  'lracucich-teghekatvutyan',
  'transportayin-mijotsner-chanachman-nshanner',
  'hushumnner',
] as const;

/** English/Russian scrape files use these slugs (index order matches {@link SIGN_CATEGORY_SLUGS}). */
export const SIGN_CATEGORY_EN_SLUGS = [
  'preduprezhdayushchie-znaki',
  'znaki-preimushchestva',
  'zapreshchayushchie-znaki',
  'predpisyvayushchie-znaki',
  'znaki-osobykh-predpisaniy',
  'informatsionnye-znaki',
  'znaki-servisa',
  'dopolnitelnoy-informatsii',
  'znaki-raspoznavaniya-transportnykh-sredstv',
  'napominaniya',
] as const;

export const SIGNS_CARD_COUNT = SIGN_CATEGORY_SLUGS.length;
