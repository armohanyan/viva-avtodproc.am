import { Link } from "wouter";
import { useLang } from "@/lib/i18n";
import { useToast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Car, ArrowLeft, Mail } from "lucide-react";
import { useState } from "react";

export default function ForgotPassword() {
  const { t } = useLang();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) { showToast(t("invalidEmail"), "error"); return; }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSent(true);
      showToast(t("resetSent"), "success");
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
              <Car className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-slate-900">Viva Drive</span>
          </div>

          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
            <Mail className="w-7 h-7 text-blue-600" />
          </div>

          {sent ? (
            <div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Check your inbox</h1>
              <p className="text-slate-500 text-sm mb-6">
                We've sent a reset link to <strong>{email}</strong>. Check your inbox and follow the instructions.
              </p>
              <Button
                onClick={() => { setSent(false); setEmail(""); }}
                variant="outline"
                className="w-full border-slate-200"
              >
                Send again
              </Button>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">{t("resetPassword")}</h1>
              <p className="text-slate-500 text-sm mb-8">{t("enterEmailReset")}</p>
              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("emailAddress")}</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="armen@example.com"
                    className="h-11"
                  />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 disabled:opacity-70">
                  {loading ? "Sending..." : t("sendResetLink")}
                </Button>
              </form>
            </>
          )}

          <div className="mt-6 text-center">
            <Link href="/login" className="flex items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
              <ArrowLeft className="w-4 h-4" />
              {t("backToLogin")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
