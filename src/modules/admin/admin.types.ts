import type { TranslationKey } from "src/lib/i18n";

export interface AdminNavigationLink {
  readonly href: string;
  readonly translationKey: TranslationKey;
}
