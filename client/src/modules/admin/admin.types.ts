import type { TranslationKey } from "src/lib/i18n";
import type { AccountType } from "src/modules/accounts";

export interface AdminNavigationLink {
  readonly href: string;
  readonly translationKey: TranslationKey;
  /** Indented sub-routes (e.g. Learn → Groups, Packages) */
  readonly children?: readonly { href: string; translationKey: TranslationKey }[];
  /** If set, only these account types see this item (e.g. super_admin–only CMS). */
  readonly allowedAccountTypes?: readonly AccountType[];
}
