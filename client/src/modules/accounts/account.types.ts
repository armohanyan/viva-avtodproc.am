/** Platform account kinds — used for routing, invites, and permissions. */
export type AccountType = "super_admin" | "admin" | "instructor" | "student";

export interface AccountSessionUser {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly accountType: AccountType;
  /** Set after `/api/v1/auth/login` for authenticated API calls. */
  readonly accessToken?: string;
}
