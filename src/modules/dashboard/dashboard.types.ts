import type { TranslationKey } from "src/lib/i18n";

export interface DashboardNavigationLink {
  readonly href: string;
  readonly translationKey: TranslationKey;
}
