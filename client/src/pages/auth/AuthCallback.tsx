import { useEffect, useMemo, useState } from "react";
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

type CallbackStatus = "loading" | "success" | "error";

export default function AuthCallback() {
  const [, setLocation] = useLocation();
  const { t } = useLang();
  const { showToast } = useToast();
  const { signIn } = useAccount();
  const [status, setStatus] = useState<CallbackStatus>("loading");
  const [message, setMessage] = useState("");

  const params = useMemo(() => new URLSearchParams(window.location.search), []);

  useEffect(() => {
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
      let cancelled = false;
      let timer: number | undefined;
      void (async () => {
        const ok = await tryRefreshAccessToken();
        if (cancelled) {
          return;
        }
        if (!ok) {
          setStatus("error");
          setMessage(t("socialAuthMissingPayload"));
          showToast(t("socialAuthFailed"), "error");
          return;
        }
        const session = loadAccountSession();
        if (!session) {
          setStatus("error");
          setMessage(t("socialAuthMissingPayload"));
          showToast(t("socialAuthFailed"), "error");
          return;
        }
        setStatus("success");
        showToast(t("socialAuthSuccess"), "success");
        const fallback = defaultHomePathForAccountType(session.accountType);
        const dest =
          safeRedirectCandidate && isSafePanelRedirect(safeRedirectCandidate, session.accountType)
            ? safeRedirectCandidate
            : fallback;
        timer = window.setTimeout(() => setLocation(dest), 600);
      })();
      return () => {
        cancelled = true;
        if (timer !== undefined) {
          window.clearTimeout(timer);
        }
      };
    }

    if (code || token) {
      if (!emailParam) {
        setStatus("error");
        setMessage(t("socialAuthMissingPayload"));
        showToast(t("socialAuthFailed"), "error");
        return;
      }
      setStatus("success");
      const email = emailParam;
      const name = nameParam || email.split("@")[0] || "User";
      const accountType = inferAccountTypeFromEmail(email);
      signIn({ email, name, accountType });
      showToast(t("socialAuthSuccess"), "success");
      const fallback = defaultHomePathForAccountType(accountType);
      const dest =
        safeRedirectCandidate && isSafePanelRedirect(safeRedirectCandidate, accountType)
          ? safeRedirectCandidate
          : fallback;
      const timer = window.setTimeout(() => setLocation(dest), 900);
      return () => window.clearTimeout(timer);
    }

    setStatus("error");
    setMessage(t("socialAuthMissingPayload"));
    showToast(t("socialAuthFailed"), "error");
    return undefined;
  }, [params, setLocation, showToast, signIn, t]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl border border-border shadow-sm p-8 text-center">
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
