import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "src/components/ui/button";
import {
  defaultHomePathForAccountType,
  inferAccountTypeFromEmail,
  isSafePanelRedirect,
  useAccount,
} from "src/modules/accounts";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { tryRefreshAccessToken } from "src/lib/authSession";
import { loadAccountSession } from "src/modules/accounts/account.session";
import { absWouterHref } from "src/lib/wouterFullPath";

type CallbackStatus = "loading" | "success" | "error";

function resolveDest(
  accountType: Parameters<typeof defaultHomePathForAccountType>[0],
  safeRedirectCandidate: string | null,
): string {
  const fallback = defaultHomePathForAccountType(accountType);
  if (safeRedirectCandidate && isSafePanelRedirect(safeRedirectCandidate, accountType)) {
    return safeRedirectCandidate;
  }
  return fallback;
}

export default function AuthCallback() {
  const [, setLocation] = useLocation();
  const { t } = useLang();
  const { showToast } = useToast();
  const { signIn } = useAccount();
  const [status, setStatus] = useState<CallbackStatus>("loading");
  const [message, setMessage] = useState("");
  const ranRef = useRef(false);

  const params = useMemo(() => new URLSearchParams(window.location.search), []);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    const authError = params.get("auth_error");
    const from = params.get("from");
    const code = params.get("code");
    const token = params.get("token");
    const redirect = params.get("redirectTo");
    const emailParam = params.get("email")?.trim();
    const nameParam = params.get("name")?.trim();

    const safeRedirectCandidate =
      redirect &&
      redirect.startsWith("/") &&
      !redirect.startsWith("//") &&
      !redirect.includes("://")
        ? redirect
        : null;

    if (authError) {
      setStatus("error");
      setMessage(authError);
      showToast(t("socialAuthFailed"), "error");
      return;
    }

    if (from === "oauth") {
      void (async () => {
        const refreshOutcome = await tryRefreshAccessToken();
        if (refreshOutcome !== "ok") {
          setStatus("error");
          setMessage(t("socialAuthMissingPayload"));
          showToast(t("socialAuthFailed"), "error");
          return;
        }
        const session = loadAccountSession();
        if (!session?.accessToken) {
          setStatus("error");
          setMessage(t("socialAuthMissingPayload"));
          showToast(t("socialAuthFailed"), "error");
          return;
        }
        signIn({
          email: session.email,
          name: session.name,
          accountType: session.accountType,
          accessToken: session.accessToken,
          id: session.id,
          ...(typeof session.hasPassword === "boolean" ? { hasPassword: session.hasPassword } : {}),
        });
        setStatus("success");
        showToast(t("socialAuthSuccess"), "success");
        const dest = resolveDest(session.accountType, safeRedirectCandidate);
        window.setTimeout(() => setLocation(absWouterHref(dest)), 400);
      })();
      return;
    }

    if (code || token) {
      if (!emailParam) {
        setStatus("error");
        setMessage(t("socialAuthMissingPayload"));
        showToast(t("socialAuthFailed"), "error");
        return;
      }
      const email = emailParam;
      const name = nameParam || email.split("@")[0] || "User";
      const accountType = inferAccountTypeFromEmail(email);
      signIn({ email, name, accountType });
      setStatus("success");
      showToast(t("socialAuthSuccess"), "success");
      const dest = resolveDest(accountType, safeRedirectCandidate);
      window.setTimeout(() => setLocation(absWouterHref(dest)), 400);
      return;
    }

    setStatus("error");
    setMessage(t("socialAuthMissingPayload"));
    showToast(t("socialAuthFailed"), "error");
  }, [params, setLocation, showToast, signIn, t]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl border border-border shadow-sm p-5 sm:p-8 text-center">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-5">
            {status === "loading" && <Loader2 className="w-7 h-7 text-primary animate-spin" />}
            {status === "success" && <Loader2 className="w-7 h-7 text-primary animate-spin" />}
            {status === "error" && <ArrowLeft className="w-7 h-7 text-primary" />}
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-2">
            {status === "loading" && t("socialAuthProcessingTitle")}
            {status === "success" && t("socialAuthSuccessTitle")}
            {status === "error" && t("socialAuthErrorTitle")}
          </h1>

          <p className="text-muted-foreground text-sm mb-6">
            {status === "loading" && t("socialAuthProcessingDescription")}
            {status === "success" && t("socialAuthSuccessDescription")}
            {status === "error" && (message || t("socialAuthErrorDescription"))}
          </p>

          {status === "error" && (
            <Button asChild variant="outline" className="w-full border-border">
              <Link href="/login">{t("backToLogin")}</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
