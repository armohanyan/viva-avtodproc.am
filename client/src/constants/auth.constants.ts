import type { AccountType } from "src/types/auth.types";

/** Ordered list for selects and policy checks that need a stable iteration order. */
export const ACCOUNT_TYPES: readonly AccountType[] = ["super_admin", "admin", "instructor", "student"];
