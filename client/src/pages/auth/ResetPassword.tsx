import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { KeyRound } from "lucide-react";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import { absWouterHref } from "src/lib/wouterFullPath";

function tokenFromSearch(search: string): string {
  const q = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return (q.get("token") ?? "").trim();
}

export default function ResetPassword() {
  const { t } = useLang();
  const { showToast } = useToast();
  const [location, setLocation] = useLocation();
  const search = useMemo(() => {
    const i = location.indexOf("?");
    return i >= 0 ? location.slice(i) : typeof window !== "undefined" ? window.location.search : "";
  }, [location]);

  const token = useMemo(() => tokenFromSearch(search), [search]);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [metaOk, setMetaOk] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoadingMeta(false);
      setMetaOk(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await vivaApiJson<{ valid: boolean; email: string }>(
          `/auth/password-reset?token=${encodeURIComponent(token)}`,
        );
        if (!cancelled && res.valid) {
          setMetaOk(true);
          setMaskedEmail(res.email);
        } else if (!cancelled) {
          setMetaOk(false);
        }
      } catch {
        if (!cancelled) {
          setMetaOk(false);
        }
      } finally {
        if (!cancelled) {
          setLoadingMeta(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!token) {
        showToast(t("resetPasswordTokenMissing"), "error");
        return;
      }
      if (password.length < 8) {
        showToast(t("passwordTooShortError"), "error");
        return;
      }
      if (password !== confirm) {
        showToast(t("passwordsDoNotMatchError"), "error");
        return;
      }
      setSubmitting(true);
      try {
        await vivaApiJson("/auth/reset-password", { method: "POST", body: { token, password } });
        showToast(t("resetPasswordSuccess"), "success");
        setLocation(absWouterHref("/login"));
      } catch (err) {
        showToast(getApiErrorMessage(err) || t("resetPasswordTokenMissing"), "error");
      } finally {
        setSubmitting(false);
      }
    },
    [confirm, password, showToast, t, token, setLocation],
  );

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl border border-border shadow-sm p-8">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
              <img src="/logo.jpg" alt={t("brandName")} className="w-6 h-6 object-contain" />
            </div>
            <span className="font-bold text-lg text-foreground">{t("brandName")}</span>
          </div>

          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
            <KeyRound className="w-7 h-7 text-primary" aria-hidden />
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-2">{t("resetPasswordTitle")}</h1>
          <p className="text-muted-foreground text-sm mb-2">{t("resetPasswordSubtitle")}</p>
          {metaOk && maskedEmail ? (
            <p className="text-xs text-muted-foreground mb-6">
              {t("emailAddress")}: <span className="font-medium text-foreground">{maskedEmail}</span>
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mb-6">&nbsp;</p>
          )}

          {loadingMeta ? (
            <p className="text-sm text-muted-foreground mb-6">{t("loading")}</p>
          ) : null}
          {!loadingMeta && !metaOk ? (
            <p className="text-sm text-destructive mb-6">{t("resetPasswordTokenMissing")}</p>
          ) : null}

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t("password")}</label>
              <Input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("passwordPlaceholderMinChars")}
                className="h-11"
                disabled={!metaOk}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1.5">
                {t("setupPasswordConfirmLabel")}
              </label>
              <Input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder={t("passwordPlaceholderRepeat")}
                className="h-11"
                disabled={!metaOk}
              />
            </div>
            <Button
              type="submit"
              disabled={submitting || !metaOk}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-11 disabled:opacity-70"
            >
              {submitting ? t("loading") : t("resetPasswordSubmit")}
            </Button>
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
