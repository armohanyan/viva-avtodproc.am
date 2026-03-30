import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "src/components/ui/button";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";

type CallbackStatus = "loading" | "success" | "error";

export default function AuthCallback() {
  const [, setLocation] = useLocation();
  const { t } = useLang();
  const { showToast } = useToast();
  const [status, setStatus] = useState<CallbackStatus>("loading");
  const [message, setMessage] = useState("");

  const params = useMemo(() => new URLSearchParams(window.location.search), []);

  useEffect(() => {
    const errorParam = params.get("error");
    const code = params.get("code");
    const token = params.get("token");
    const redirect = params.get("redirectTo");

    const safeRedirect =
      redirect &&
      redirect.startsWith("/") &&
      !redirect.startsWith("//") &&
      !redirect.includes("://")
        ? redirect
        : "/dashboard";

    if (errorParam) {
      const errorDescription = params.get("error_description") || errorParam;
      setStatus("error");
      setMessage(errorDescription);
      showToast(t("socialAuthFailed"), "error");
      return;
    }

    if (code || token) {
      setStatus("success");
      showToast(t("socialAuthSuccess"), "success");
      const timer = window.setTimeout(() => setLocation(safeRedirect), 900);
      return () => window.clearTimeout(timer);
    }

    setStatus("error");
    setMessage(t("socialAuthMissingPayload"));
    showToast(t("socialAuthFailed"), "error");
  }, [params, setLocation, showToast, t]);

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
