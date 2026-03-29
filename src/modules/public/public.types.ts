import type { TranslationKey } from "src/lib/i18n";

export interface PublicNavigationLink {
  readonly href: string;
  readonly translationKey: TranslationKey;
}
