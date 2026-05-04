import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
  type ReactNode,
} from "react";
import { setAccessTokenInMemory } from "src/lib/accessTokenMemory";
import { clearRefreshCookieBestEffort, tryRefreshAccessToken } from "src/lib/authSession";
import type { AccountSessionUser, AccountType } from "./account.types";
import {
	ACCOUNT_SESSION_STORAGE_KEY,
	clearAccountSession,
	loadAccountSession,
	saveAccountSession,
} from "./account.session";
import { inferAccountTypeFromEmail } from "./inferAccountType";
import { defaultHomePathForAccountType } from "./accountRouting";

export interface AccountContextValue {
  readonly user: AccountSessionUser | null;
  /** True after we've read localStorage (avoids guard flash in SPA). */
  readonly hydrated: boolean;
  readonly signIn: (input: {
    email: string;
    name: string;
    accountType?: AccountType;
    accessToken?: string;
    id?: string | number;
    hasPassword?: boolean;
  }) => void;
  readonly signOut: () => void;
  readonly defaultHomePath: string;
}

const AccountContext = createContext<AccountContextValue | null>(null);

function newSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `u-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function AccountProvider({ children }: PropsWithChildren): ReactNode {
  const [user, setUser] = useState<AccountSessionUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      let u = loadAccountSession();
      if (!u || !u.accessToken) {
        const refreshOutcome = await tryRefreshAccessToken();
        if (!cancelled && refreshOutcome === "ok") {
          u = loadAccountSession();
        }
      }
      if (!cancelled) {
        setUser(u);
        setHydrated(true);
      }
    })();

    const onStorage = (e: StorageEvent) => {
      if (e.key === ACCOUNT_SESSION_STORAGE_KEY && e.newValue === null) {
        setAccessTokenInMemory(null);
      }
      setUser(loadAccountSession());
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("viva-account-session-updated", onStorage);
    return () => {
      cancelled = true;
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("viva-account-session-updated", onStorage);
    };
  }, []);

  const signIn = useCallback(
    (input: {
      email: string;
      name: string;
      accountType?: AccountType;
      accessToken?: string;
      id?: string | number;
      hasPassword?: boolean;
    }) => {
      const accountType = input.accountType ?? inferAccountTypeFromEmail(input.email);
      const idRaw = input.id;
      const idStr = idRaw == null || idRaw === "" ? "" : typeof idRaw === "string" ? idRaw.trim() : String(idRaw).trim();
      const next: AccountSessionUser = {
        id: idStr || newSessionId(),
        email: input.email.trim(),
        name: input.name.trim() || input.email.split("@")[0] || "User",
        accountType,
        ...(input.accessToken ? { accessToken: input.accessToken } : {}),
        ...(typeof input.hasPassword === "boolean" ? { hasPassword: input.hasPassword } : {}),
      };
      saveAccountSession(next);
      setUser(next);
    },
    [],
  );

  const signOut = useCallback(() => {
    clearAccountSession();
    setUser(null);
    clearRefreshCookieBestEffort();
  }, []);

  const defaultHomePath = user ? defaultHomePathForAccountType(user.accountType) : "/dashboard";

  const value = useMemo(
    () => ({ user, hydrated, signIn, signOut, defaultHomePath }),
    [user, hydrated, signIn, signOut, defaultHomePath],
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount(): AccountContextValue {
  const ctx = useContext(AccountContext);
  if (!ctx) {
    throw new Error("useAccount must be used within AccountProvider");
  }
  return ctx;
}
