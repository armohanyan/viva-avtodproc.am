import type { TranslationKey } from "src/lib/i18n";

export type DashboardNavigationChild = {
  readonly href: string;
  readonly translationKey: TranslationKey;
};

export interface DashboardNavigationLink {
  readonly href: string;
  readonly translationKey: TranslationKey;
  /** When set, these render as an indented sub-list under this item (sidebar). */
  readonly children?: readonly DashboardNavigationChild[];
}
