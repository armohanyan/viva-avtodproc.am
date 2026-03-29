import { Link, useLocation } from "wouter";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import { Car, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import LangToggle from "src/components/LangToggle";

export default function Login() {
  const [, setLocation] = useLocation();
  const { t } = useLang();
  const { showToast } = useToast();
  
  const [showPass, setShowPass] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { showToast(t("fillRequired"), "error"); return; }
    if (!email.includes("@")) { showToast(t("invalidEmail"), "error"); return; }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      showToast(t("loginSuccess"), "success");
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get("redirect");
      const safe =
        redirect &&
        redirect.startsWith("/") &&
        !redirect.startsWith("//") &&
        !redirect.includes("://");
      setLocation(safe ? redirect : "/dashboard");
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 via-slate-900 to-slate-900" />
        <div className="relative">
          <Link href="/src/pages/public" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Car className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl text-white">Viva Drive</span>
          </Link>
        </div>
        <div className="relative">
          <blockquote className="text-2xl font-semibold text-white leading-relaxed mb-6">
            "The road to your license starts with the right instructor."
          </blockquote>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">A</div>
            <div>
              <p className="text-white font-medium text-sm">Ani K.</p>
              <p className="text-slate-400 text-xs">Licensed 2023 • Student</p>
            </div>
          </div>
        </div>
        <div className="relative text-slate-500 text-sm">© 2024 Viva Driving School</div>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
              <Car className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-slate-900">Viva Drive</span>
          </div>

          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{t("welcomeBack")}</h1>
              <p className="text-slate-500 text-sm mt-1">{t("signInContinue")}</p>
            </div>
            <LangToggle />
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("emailAddress")}</label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="h-11" />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm font-medium text-slate-700">{t("password")}</label>
                <Link href="/forgot-password" className="text-xs text-blue-600 hover:underline">{t("forgotPassword")}</Link>
              </div>
              <div className="relative">
                <Input type={showPass ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="h-11 pr-10" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 mt-2 disabled:opacity-70">
              {loading ? "Signing in..." : t("signIn")}
            </Button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-4">
            {t("noAccount")}{" "}
            <Link href="/register" className="text-blue-600 font-medium hover:underline">{t("signUp")}</Link>
          </p>

          <div className="mt-8 pt-6 border-t border-slate-200">
            <p className="text-xs text-slate-400 text-center mb-4">Or sign in as</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { showToast(t("loginSuccess"), "success"); setLocation("/admin/dashboard"); }}
                className="px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Admin Demo
              </button>
              <button
                onClick={() => { showToast(t("loginSuccess"), "success"); setLocation("/dashboard"); }}
                className="px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Student Demo
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
