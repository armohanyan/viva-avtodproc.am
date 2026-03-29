import { Link, useLocation } from "wouter";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import { Car, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import LangToggle from "src/components/LangToggle";

export default function Register() {
  const [, setLocation] = useLocation();
  const { t } = useLang();
  const { showToast } = useToast();
  
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", password: "" });
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.email || !form.password) { showToast(t("fillRequired"), "error"); return; }
    if (!form.email.includes("@")) { showToast(t("invalidEmail"), "error"); return; }
    if (!agreed) { showToast("Please agree to the Terms of Service.", "error"); return; }
    if (form.password.length < 8) { showToast("Password must be at least 8 characters.", "error"); return; }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      showToast(t("registerSuccess"), "success");
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get("redirect");
      const safe =
        redirect &&
        redirect.startsWith("/") &&
        !redirect.startsWith("//") &&
        !redirect.includes("://");
      setLocation(safe ? redirect : "/dashboard");
    }, 900);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 to-slate-900" />
        <div className="relative">
          <Link href="/src/pages/public" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Car className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl text-white">Viva Drive</span>
          </Link>
        </div>
        <div className="relative space-y-4">
          <h2 className="text-3xl font-bold text-white">Start your journey today</h2>
          <ul className="space-y-3">
            {["Access all lesson materials", "Book sessions anytime", "Track your progress", "Online theory courses"].map((item, i) => (
              <li key={i} className="flex items-center gap-3 text-slate-300">
                <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
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
              <h1 className="text-2xl font-bold text-slate-900">{t("createAccount")}</h1>
              <p className="text-slate-500 text-sm mt-1">{t("joinViva")}</p>
            </div>
            <LangToggle />
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("firstName")} *</label>
                <Input value={form.firstName} onChange={set("firstName")} placeholder="Armen" className="h-11" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("lastName")}</label>
                <Input value={form.lastName} onChange={set("lastName")} placeholder="Petrosyan" className="h-11" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("emailAddress")} *</label>
              <Input type="email" value={form.email} onChange={set("email")} placeholder="armen@example.com" className="h-11" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("phoneNumber")}</label>
              <Input type="tel" value={form.phone} onChange={set("phone")} placeholder="+374 99 123 456" className="h-11" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("password")} *</label>
              <Input type="password" value={form.password} onChange={set("password")} placeholder="Min. 8 characters" className="h-11" />
            </div>
            <div className="flex items-start gap-2 mt-2">
              <input
                type="checkbox"
                id="terms"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300"
              />
              <label htmlFor="terms" className="text-xs text-slate-500 leading-relaxed">
                I agree to the <a href="#" className="text-blue-600 hover:underline">Terms of Service</a> and <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
              </label>
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 mt-2 disabled:opacity-70">
              {loading ? "Creating account..." : t("createAccount")}
            </Button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-5">
            {t("alreadyAccount")}{" "}
            <Link href="/login" className="text-blue-600 font-medium hover:underline">{t("signIn")}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
