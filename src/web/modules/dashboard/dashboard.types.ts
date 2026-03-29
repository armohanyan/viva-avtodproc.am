import type { TranslationKey } from "@/lib/i18n";

export interface DashboardNavigationLink {
  readonly href: string;
  readonly translationKey: TranslationKey;
}
