import type { AccountType } from "./account.types";

/**
 * Fallback when restoring a session without `accountType` (legacy local data).
 * Prefer JWT-backed sign-in so the role always comes from the API.
 */
export function inferAccountTypeFromEmail(email: string): AccountType {
  const local = email.split("@")[0]?.toLowerCase().trim() ?? "";
  if (local === "superadmin" || local === "super" || local.startsWith("superadmin")) {
    return "super_admin";
  }
  if (local === "admin") {
    return "admin";
  }
  if (local.startsWith("instructor") || local === "armen" || local === "narine" || local === "vardan") {
    return "instructor";
  }
  return "student";
}
