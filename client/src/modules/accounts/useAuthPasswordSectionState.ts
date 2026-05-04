import { useEffect, useState } from "react";
import { vivaApiJson } from "src/lib/vivaApi";
import { useAccount } from "./AccountProvider";

export type AuthPasswordSectionState = "loading" | "change_password" | "social_only";

/**
 * Resolves whether to show "change password" vs social-only copy.
 * Uses `user.hasPassword` from the session when present; otherwise fetches `/auth/me` once.
 */
export function useAuthPasswordSectionState(): AuthPasswordSectionState {
  const { user } = useAccount();
  const [resolved, setResolved] = useState<"change_password" | "social_only" | null>(null);

  useEffect(() => {
    if (!user) {
      setResolved(null);
      return;
    }
    if (user.hasPassword === true) {
      setResolved("change_password");
      return;
    }
    if (user.hasPassword === false) {
      setResolved("social_only");
      return;
    }

    let cancelled = false;
    setResolved(null);
    void vivaApiJson<{ hasPassword: boolean }>("/auth/me").then((m) => {
      if (cancelled) return;
      setResolved(m.hasPassword ? "change_password" : "social_only");
    }).catch(() => {
      if (!cancelled) setResolved("change_password");
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.hasPassword, user?.email]);

  if (!user || resolved === null) return "loading";
  return resolved === "change_password" ? "change_password" : "social_only";
}
