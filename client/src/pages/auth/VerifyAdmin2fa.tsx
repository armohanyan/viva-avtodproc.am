import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { ShieldCheck } from "lucide-react";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { resolvePostAuthPanelPath, useAccount, type AccountType } from "src/modules/accounts";
import { absWouterHref } from "src/lib/wouterFullPath";
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";

const MFA_TOKEN_KEY = "viva-admin-mfa-token";

export function readPendingAdminMfaToken(): string | null {
  try {
    return sessionStorage.getItem(MFA_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function clearPendingAdminMfaToken(): void {
  try {
    sessionStorage.removeItem(MFA_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export function storePendingAdminMfaToken(token: string): void {
  try {
    sessionStorage.setItem(MFA_TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}

export default function VerifyAdmin2fa() {
  const { t } = useLang();
  const { showToast } = useToast();
  const { signIn } = useAccount();
  const [, setLocation] = useLocation();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldownSec, setResendCooldownSec] = useState(0);
  const [missingToken, setMissingToken] = useState(false);

  useEffect(() => {
    const tok = readPendingAdminMfaToken();
    if (!tok) {
      setMissingToken(true);
    }
  }, []);

  useEffect(() => {
    if (resendCooldownSec <= 0) {
      return;
    }
    const t = window.setInterval(() => {
      setResendCooldownSec((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, [resendCooldownSec]);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const mfaToken = readPendingAdminMfaToken();
      if (!mfaToken) {
        showToast(t("adminMfaNoSession"), "error");
        setMissingToken(true);
        return;
      }
      const digits = code.replace(/\D/g, "").slice(0, 6);
      if (digits.length !== 6) {
        showToast(t("fillRequired"), "error");
        return;
      }
      setLoading(true);
      try {
        const data = await vivaApiJson<{
          accessToken: string;
          user: {
            id: string | number;
            email: string;
            name: string;
            accountType: AccountType;
            hasPassword?: boolean;
          };
        }>("/auth/verify-admin-mfa", { method: "POST", body: { mfaToken, code: digits } });
        clearPendingAdminMfaToken();
        signIn({
          email: data.user.email,
          name: data.user.name,
          accountType: data.user.accountType,
          accessToken: data.accessToken,
          id: data.user.id,
          ...(typeof data.user.hasPassword === "boolean" ? { hasPassword: data.user.hasPassword } : {}),
        });
        showToast(t("loginSuccess"), "success");
        setLocation(absWouterHref(resolvePostAuthPanelPath(data.user.accountType, window.location.search)));
      } catch (err) {
        showToast(getApiErrorMessage(err) || t("adminMfaInvalidCode"), "error");
      } finally {
        setLoading(false);
      }
    },
    [code, showToast, signIn, setLocation, t],
  );

  const onResend = useCallback(async () => {
    const mfaToken = readPendingAdminMfaToken();
    if (!mfaToken || missingToken || resendCooldownSec > 0) {
      return;
    }
    setResendLoading(true);
    try {
      const data = await vivaApiJson<{ mfaToken: string }>("/auth/resend-admin-mfa", {
        method: "POST",
        body: { mfaToken },
      });
      storePendingAdminMfaToken(data.mfaToken);
      setCode("");
      showToast(t("adminMfaCodeSent"), "success");
      setResendCooldownSec(60);
    } catch (err) {
      showToast(getApiErrorMessage(err) || t("adminMfaInvalidCode"), "error");
    } finally {
      setResendLoading(false);
    }
  }, [missingToken, resendCooldownSec, showToast, t]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl border border-border shadow-sm p-8">
          <div className="flex items-center gap-2 mb-8">
            <img src="/logo.svg" alt={t("brandName")} className="w-9 h-9 object-contain" />
            <span className="font-bold text-lg text-foreground">{t("brandName")}</span>
          </div>

          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
            <ShieldCheck className="w-7 h-7 text-primary" aria-hidden />
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-2">{t("adminMfaTitle")}</h1>
          <p className="text-muted-foreground text-sm mb-8">{t("adminMfaSubtitle")}</p>

          {missingToken ? (
            <p className="text-sm text-destructive mb-6">{t("adminMfaNoSession")}</p>
          ) : null}

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5" htmlFor="mfa-code">
                {t("adminMfaCodeLabel")}
              </label>
              <Input
                id="mfa-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="h-11 text-center text-lg tracking-[0.35em] font-mono"
                disabled={missingToken}
              />
            </div>
            <Button
              type="submit"
              disabled={loading || missingToken || code.replace(/\D/g, "").length !== 6}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-11 disabled:opacity-70"
            >
              {loading ? t("loading") : t("adminMfaVerify")}
            </Button>
            <div className="pt-1">
              <Button
                type="button"
                variant="ghost"
                className="w-full text-muted-foreground hover:text-foreground"
                disabled={missingToken || resendLoading || resendCooldownSec > 0}
                onClick={() => void onResend()}
              >
                {resendLoading
                  ? t("loading")
                  : resendCooldownSec > 0
                    ? t("adminMfaResendWait").replace("%s", String(resendCooldownSec))
                    : t("adminMfaResendCode")}
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <Link href="/login" className="text-primary hover:underline">
              {t("login")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
