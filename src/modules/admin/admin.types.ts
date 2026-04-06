import type { TranslationKey } from "src/lib/i18n";

export interface AdminNavigationLink {
  readonly href: string;
  readonly translationKey: TranslationKey;
  /** Indented sub-routes (e.g. Learn → Groups, Packages) */
  readonly children?: readonly { href: string; translationKey: TranslationKey }[];
}
