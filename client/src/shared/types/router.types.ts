import type { ComponentType } from "react";
import type { AccountType } from "src/modules/accounts/account.types";

export interface AppRoute {
  readonly path: string;
  readonly component: ComponentType;
  /** When set, only a signed-in user with one of these account types may open the route. */
  readonly allowedAccountTypes?: readonly AccountType[];
}
