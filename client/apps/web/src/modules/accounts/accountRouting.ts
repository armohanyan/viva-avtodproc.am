import type { AccountType } from "./account.types";

export function defaultHomePathForAccountType(accountType: AccountType): string {
  switch (accountType) {
    case "super_admin":
    case "admin":
      return "/admin/dashboard";
    case "instructor":
      return "/instructor/dashboard";
    case "student":
    default:
      return "/dashboard";
  }
}

export function staffAccountTypes(): readonly AccountType[] {
  return ["super_admin", "admin", "instructor"];
}

export function isStaffAccountType(accountType: AccountType): boolean {
  return accountType === "super_admin" || accountType === "admin" || accountType === "instructor";
}

/** After login, only follow `redirect` when it matches the signed-in account's panel. */
export function isSafePanelRedirect(path: string, accountType: AccountType): boolean {
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("://")) return false;
  if (path.startsWith("/admin")) return accountType === "super_admin" || accountType === "admin";
  if (path.startsWith("/instructor")) return accountType === "instructor";
  if (path.startsWith("/dashboard")) return accountType === "student";
  return false;
}

/** Where to send the user after auth, using optional `?redirect=` when it is panel-safe for this account. */
export function resolvePostAuthPanelPath(accountType: AccountType, search: string): string {
  const q = search.startsWith("?") ? search.slice(1) : search;
  const redirect = new URLSearchParams(q).get("redirect");
  if (redirect && isSafePanelRedirect(redirect, accountType)) return redirect;
  return defaultHomePathForAccountType(accountType);
}

export function canInviteAccountType(
  inviter: AccountType,
  target: AccountType,
): boolean {
  if (inviter !== "super_admin" && inviter !== "admin") return false;
  if (target === "admin") return true;
  if (target === "super_admin") return inviter === "super_admin";
  return false;
}
