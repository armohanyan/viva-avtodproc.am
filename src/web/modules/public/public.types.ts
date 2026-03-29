import type { TranslationKey } from "@/lib/i18n";

export interface PublicNavigationLink {
  readonly href: string;
  readonly translationKey: TranslationKey;
}
