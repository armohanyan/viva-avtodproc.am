import type { AccountSessionUser, AccountType } from "./account.types";

const STORAGE_KEY = "viva-account-session-v1";

function isAccountType(v: unknown): v is AccountType {
  return v === "super_admin" || v === "admin" || v === "instructor" || v === "student";
}

export function loadAccountSession(): AccountSessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const o = parsed as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id : "";
    const email = typeof o.email === "string" ? o.email : "";
    const name = typeof o.name === "string" ? o.name : "";
    const accountType = o.accountType;
    if (!id || !email || !isAccountType(accountType)) return null;
    const accessToken = typeof o.accessToken === "string" && o.accessToken ? o.accessToken : undefined;
    return { id, email, name: name || email.split("@")[0] || "User", accountType, accessToken };
  } catch {
    return null;
  }
}

export function saveAccountSession(user: AccountSessionUser) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  window.dispatchEvent(new CustomEvent("viva-account-session-updated"));
}

export function clearAccountSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("viva-account-session-updated"));
}
