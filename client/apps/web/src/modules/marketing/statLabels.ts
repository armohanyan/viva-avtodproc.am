import type { TranslationKey } from "src/lib/i18n";

/** Maps API stat keys to i18n labels on the marketing site. */
export const MARKETING_STAT_LABEL_KEY: Record<string, TranslationKey> = {
  years_exp: "yearsExp",
  students: "students",
  instructors: "instructors",
  success_rate: "successRate",
};

/** About page orange card: same API keys, About-specific copy. */
export const ABOUT_MARKETING_STAT_LABEL_KEY: Record<string, TranslationKey> = {
  students: "aboutStatGraduates",
  success_rate: "aboutStatPassRate",
  instructors: "aboutStatInstructors",
  years_exp: "aboutStatYearsActive",
};

/** Display order on About (independent of `sortOrder` on the home hero bar). */
export const ABOUT_MARKETING_STATS_ORDER = ["students", "success_rate", "instructors", "years_exp"] as const;
