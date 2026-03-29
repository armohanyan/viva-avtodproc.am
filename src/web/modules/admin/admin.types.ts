import type { TranslationKey } from "@/lib/i18n";

export interface AdminNavigationLink {
  readonly href: string;
  readonly translationKey: TranslationKey;
}
