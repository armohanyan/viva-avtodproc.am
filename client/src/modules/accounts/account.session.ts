import { getAccessTokenInMemory, setAccessTokenInMemory } from "src/lib/accessTokenMemory";
import type { AccountSessionUser, AccountType } from "./account.types";

export const ACCOUNT_SESSION_STORAGE_KEY = "viva-account-session-v1";
const STORAGE_KEY = ACCOUNT_SESSION_STORAGE_KEY;

function isAccountType(v: unknown): v is AccountType {
  return v === "super_admin" || v === "admin" || v === "instructor" || v === "student";
}

export function loadAccountSession(): AccountSessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const mem = getAccessTokenInMemory();
    if (!raw) {
      if (mem) {
        setAccessTokenInMemory(null);
      }
      return null;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const o = parsed as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id : "";
    const email = typeof o.email === "string" ? o.email : "";
    const name = typeof o.name === "string" ? o.name : "";
    const accountType = o.accountType;
    if (!id || !email || !isAccountType(accountType)) return null;
    const legacyStored =
      typeof o.accessToken === "string" && o.accessToken.length > 0 ? o.accessToken : undefined;
    if (legacyStored && !mem) {
      setAccessTokenInMemory(legacyStored);
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          id,
          email,
          name: name || email.split("@")[0] || "User",
          accountType,
        }),
      );
    }
    const accessToken = getAccessTokenInMemory() ?? undefined;
    return { id, email, name: name || email.split("@")[0] || "User", accountType, ...(accessToken ? { accessToken } : {}) };
  } catch {
    return null;
  }
}

export function saveAccountSession(user: AccountSessionUser) {
  if (typeof window === "undefined") return;
  if (user.accessToken) {
    setAccessTokenInMemory(user.accessToken);
  }
  const persisted = {
    id: user.id,
    email: user.email,
    name: user.name,
    accountType: user.accountType,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  window.dispatchEvent(new CustomEvent("viva-account-session-updated"));
}

export function clearAccountSession() {
  if (typeof window === "undefined") return;
  setAccessTokenInMemory(null);
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("viva-account-session-updated"));
}
