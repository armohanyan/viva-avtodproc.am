import type { TranslationKey } from "src/lib/i18n";
import type { AccountType } from "src/modules/accounts";

export interface AdminNavigationChildLink {
  readonly href: string;
  readonly translationKey: TranslationKey;
  /** If set, only these account types see this sub-item. */
  readonly allowedAccountTypes?: readonly AccountType[];
}

export interface AdminNavigationLink {
  readonly href: string;
  readonly translationKey: TranslationKey;
  /** Indented sub-routes (e.g. Learn → practical, theory). */
  readonly children?: readonly AdminNavigationChildLink[];
  /** Sub-items stay hidden until the user expands this row (parent is a toggle, not a link). */
  readonly collapsible?: boolean;
  /** If set, only these account types see this item (e.g. super_admin–only CMS). */
  readonly allowedAccountTypes?: readonly AccountType[];
}
