/** Platform account kinds — used for routing, invites, and permissions. */
export type AccountType = "super_admin" | "admin" | "instructor" | "student";

export interface AccountSessionUser {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly accountType: AccountType;
  /** Short-lived JWT from `/api/v1/auth/login` | `/register` | `/refresh` (refresh token is httpOnly cookie). */
  readonly accessToken?: string;
  /**
   * From API user payload. When missing (older persisted sessions), profile screens may call `/auth/me` once.
   * `false` means social-only sign-in — no local password to change.
   */
  readonly hasPassword?: boolean;
}
