import { Link } from "wouter";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import { ArrowLeft, Mail } from "lucide-react";
import { useState } from "react";

export default function ForgotPassword() {
  const { t } = useLang();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      showToast(t("invalidEmail"), "error");
      return;
    }
    setLoading(true);
    try {
      await vivaApiJson("/auth/forgot-password", {
        method: "POST",
        body: { email: email.trim() },
      });
      setSent(true);
      showToast(t("resetSent"), "success");
    } catch (err) {
      showToast(getApiErrorMessage(err) || t("resetSent"), "error");
    } finally {
      setLoading(false);
    }
  };

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
            <Mail className="w-7 h-7 text-primary" />
          </div>

          {sent ? (
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">{t("checkInboxTitle")}</h1>
              <p className="text-muted-foreground text-sm mb-6">
                {t("resetSentPrefix")}
                <strong>{email}</strong>
                {t("resetSentSuffix")}
              </p>
              <Button
                onClick={() => { setSent(false); setEmail(""); }}
                variant="outline"
                className="w-full border-border"
              >
                {t("sendAgainLabel")}
              </Button>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-foreground mb-2">{t("resetPassword")}</h1>
              <p className="text-muted-foreground text-sm mb-8">{t("enterEmailReset")}</p>
              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t("emailAddress")}</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={t("emailAddress")}
                    className="h-11"
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-11 disabled:opacity-70">
                  {loading ? t("sendingResetLink") : t("sendResetLink")}
                </Button>
              </form>
            </>
          )}

          <div className="mt-6 text-center">
            <Link href="/login" className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />
              {t("backToLogin")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
