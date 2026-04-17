import type { ComponentType } from "react";
import type { AccountType } from "src/modules/accounts/account.types";

export interface AppRoute {
  readonly path: string;
  readonly component: ComponentType;
  /** When set, only a signed-in user with one of these account types may open the route. */
  readonly allowedAccountTypes?: readonly AccountType[];
  /**
   * When true, this route matches the path prefix and provides a nested router base (wouter `nest`).
   * Child paths are resolved relative to `path` inside the route component (e.g. `/package` under `/dashboard/bookings`).
   */
  readonly nest?: boolean;
}
