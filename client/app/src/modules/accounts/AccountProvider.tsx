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
import { clearRefreshCookieAwait, tryRefreshAccessToken } from "src/lib/authSession";
import { joinAppPath } from "src/lib/navigation/crossApp";
import { resolvedViteMarketingOrigin } from "src/lib/navigation/viteMarketingOrigin";
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
        if (cancelled) return;
        // Re-read after await: login/MFA may have completed while refresh was in flight.
        // Never overwrite a fresh accessToken with the pre-await snapshot (that logs the user out).
        const latest = loadAccountSession();
        if (latest?.accessToken) {
          u = latest;
        } else if (refreshOutcome === "ok") {
          u = latest;
        } else if (refreshOutcome === "failed" && u && !u.accessToken) {
          // Persisted profile but no refresh cookie / invalid session — avoid ghost "logged-in" UI + 401 revoke loop.
          clearAccountSession();
          u = null;
        }
      }
      if (!cancelled) {
        setUser(u);
        setHydrated(true);
      }
    })();

    const applySessionFromBrowser = () => {
      setUser(loadAccountSession());
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === ACCOUNT_SESSION_STORAGE_KEY && e.newValue === null) {
        setAccessTokenInMemory(null);
      }
      applySessionFromBrowser();
    };
    const onCustomSession = () => {
      applySessionFromBrowser();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("viva-account-session-updated", onCustomSession);
    return () => {
      cancelled = true;
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("viva-account-session-updated", onCustomSession);
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
    void (async () => {
      await clearRefreshCookieAwait();
      const marketing = resolvedViteMarketingOrigin();
      if (marketing) {
        window.location.replace(joinAppPath(marketing, "/"));
        return;
      }
      window.location.replace("/login");
    })();
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
