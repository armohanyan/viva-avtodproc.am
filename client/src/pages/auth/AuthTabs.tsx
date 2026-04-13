import { useEffect, useState } from "react";
import type React from "react";
import { Link, useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff, Star } from "lucide-react";

import { defaultHomePathForAccountType, isSafePanelRedirect, useAccount } from "src/modules/accounts";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import type { AccountType } from "src/modules/accounts";
import { buildSocialAuthUrl, type SocialProvider } from "src/lib/socialAuth";
import { Tabs, TabsList, TabsTrigger } from "src/components/ui/tabs";
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";

const STUDENT_TESTIMONIALS = [
  {
    name: "Ani K.",
    text: "Passed my exam on the first try! The instructors are incredibly patient and professional.",
    rating: 5,
  },
  {
    name: "Tigran M.",
    text: "Great experience from start to finish. The booking system made it so easy to schedule lessons.",
    rating: 5,
  },
  {
    name: "Mariam S.",
    text: "I was terrified of driving but Viva helped me become confident behind the wheel.",
    rating: 5,
  },
] as const;

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="w-4 h-4">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.4c-.2 1.2-.9 2.3-1.9 3.1l3.1 2.4c1.8-1.7 2.9-4.2 2.9-7.1 0-.7-.1-1.4-.2-2H12z"
      />
      <path
        fill="#34A853"
        d="M12 21c2.6 0 4.8-.9 6.4-2.4l-3.1-2.4c-.9.6-2 .9-3.3.9-2.5 0-4.6-1.7-5.3-4H3.5v2.5C5.1 18.8 8.3 21 12 21z"
      />
      <path
        fill="#FBBC05"
        d="M6.7 13.1c-.2-.6-.3-1.2-.3-1.9s.1-1.3.3-1.9V6.8H3.5A9 9 0 0 0 2.6 11c0 1.5.3 2.9.9 4.2l3.2-2.1z"
      />
      <path
        fill="#4285F4"
        d="M12 5.1c1.4 0 2.6.5 3.6 1.4l2.7-2.7C16.8 2.4 14.6 1.5 12 1.5c-3.7 0-6.9 2.1-8.5 5.3l3.2 2.5c.7-2.3 2.8-4.2 5.3-4.2z"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="w-4 h-4 fill-[#1877F2]">
      <path d="M24 12.1C24 5.4 18.6 0 12 0S0 5.4 0 12.1c0 6 4.4 11 10.1 11.9v-8.4H7.1V12h3V9.3c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 1-2 2v2.2h3.4l-.5 3.6h-2.9V24C19.6 23.1 24 18.1 24 12.1z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 shrink-0 fill-current">
      <path d="M16.37 1.43c0 1.14-.43 2.26-1.27 3.36-.99 1.3-2.2 2.05-3.5 1.94-.04-1.1.35-2.26 1.13-3.3.8-1.06 2.08-1.87 3.64-2z" />
      <path d="M20.78 17.53c-.39.9-.85 1.73-1.39 2.49-.73 1.04-1.34 1.75-1.8 2.14-.72.64-1.49.97-2.31.97-.59 0-1.3-.17-2.13-.51-.84-.34-1.6-.51-2.3-.51-.73 0-1.52.17-2.36.51-.84.34-1.52.52-2.04.53-.78.03-1.57-.3-2.35-1-.5-.43-1.13-1.17-1.86-2.22-.8-1.12-1.45-2.43-1.96-3.91-.55-1.61-.82-3.16-.82-4.66 0-1.71.37-3.19 1.11-4.43.58-1 1.36-1.79 2.33-2.37.97-.58 2.02-.88 3.14-.9.62 0 1.43.19 2.43.57 1 .38 1.64.57 1.93.57.21 0 .93-.22 2.15-.67 1.16-.42 2.13-.59 2.92-.52 2.14.17 3.75 1.02 4.83 2.55-1.91 1.16-2.86 2.78-2.84 4.86.02 1.62.61 2.97 1.76 4.04.52.49 1.11.88 1.76 1.15-.14.41-.29.8-.45 1.2z" />
    </svg>
  );
}

type AuthTabKey = "login" | "register";

export default function AuthTabs({ initialTab }: { initialTab: AuthTabKey }) {
  const { t } = useLang();
  const { showToast } = useToast();
  const { user, hydrated, signIn, defaultHomePath } = useAccount();

  // Keep URL stable: tab switching should update only the form, not the left panel.
  const [activeTab, setActiveTab] = useState<AuthTabKey>(initialTab);

  const [activeTestimonial, setActiveTestimonial] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setActiveTestimonial((prev) => (prev + 1) % STUDENT_TESTIMONIALS.length);
    }, 5200);
    return () => window.clearTimeout(timer);
  }, [activeTestimonial]);

  // --- Login state/handlers ---
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!hydrated || !user) return;
    setLocation(defaultHomePath);
  }, [hydrated, user, defaultHomePath, setLocation]);

  const [showPass, setShowPass] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginSocialLoading, setLoginSocialLoading] = useState<SocialProvider | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      showToast(t("fillRequired"), "error");
      return;
    }
    if (!loginEmail.includes("@")) {
      showToast(t("invalidEmail"), "error");
      return;
    }
    const trimmedEmail = loginEmail.trim();
    setLoginLoading(true);
    try {
      const data = await vivaApiJson<{ token: string; user: { id: string; email: string; name: string; accountType: AccountType } }>(
        "/auth/login",
        { method: "POST", body: { email: trimmedEmail, password: loginPassword } },
      );
      const accountType = data.user.accountType;
      signIn({
        email: data.user.email,
        name: data.user.name,
        accountType,
        accessToken: data.token,
        id: data.user.id,
      });
      showToast(t("loginSuccess"), "success");
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get("redirect");
      const safe =
        redirect &&
        redirect.startsWith("/") &&
        !redirect.startsWith("//") &&
        !redirect.includes("://")
          ? redirect
          : null;
      const fallback = defaultHomePathForAccountType(accountType);
      const dest = safe && isSafePanelRedirect(safe, accountType) ? safe : fallback;
      setLocation(dest);
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSocialAuthLogin = (provider: SocialProvider) => {
    const authUrl = buildSocialAuthUrl(provider);
    if (!authUrl) {
      showToast(t("socialAuthNotConfigured"), "error");
      return;
    }
    setLoginSocialLoading(provider);
    window.location.assign(authUrl);
  };

  // --- Register state/handlers ---
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
  });
  const [agreed, setAgreed] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerSocialLoading, setRegisterSocialLoading] = useState<SocialProvider | null>(null);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.email || !form.password) {
      showToast(t("fillRequired"), "error");
      return;
    }
    if (!form.email.includes("@")) {
      showToast(t("invalidEmail"), "error");
      return;
    }
    if (!agreed) {
      showToast(t("pleaseAgreeTermsError"), "error");
      return;
    }
    if (form.password.length < 8) {
      showToast(t("passwordTooShortError"), "error");
      return;
    }
    const name = [form.firstName, form.lastName].filter(Boolean).join(" ").trim() || form.firstName.trim();
    setRegisterLoading(true);
    try {
      const data = await vivaApiJson<{ token: string; user: { id: string; email: string; name: string; accountType: AccountType } }>(
        "/auth/register",
        {
          method: "POST",
          body: {
            email: form.email.trim(),
            password: form.password,
            name,
            phone: form.phone.trim() || undefined,
          },
        },
      );
      signIn({
        email: data.user.email,
        name: data.user.name,
        accountType: "student",
        accessToken: data.token,
        id: data.user.id,
      });
      showToast(t("registerSuccess"), "success");
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get("redirect");
      const safe =
        redirect &&
        redirect.startsWith("/") &&
        !redirect.startsWith("//") &&
        !redirect.includes("://")
          ? redirect
          : null;
      const dest = safe && isSafePanelRedirect(safe, "student") ? safe : "/dashboard";
      setLocation(dest);
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleSocialAuthRegister = (provider: SocialProvider) => {
    const authUrl = buildSocialAuthUrl(provider);
    if (!authUrl) {
      showToast(t("socialAuthNotConfigured"), "error");
      return;
    }
    setRegisterSocialLoading(provider);
    window.location.assign(authUrl);
  };

  return (
    <div className="min-h-screen bg-background flex">
      <div className="hidden lg:flex lg:w-1/2 bg-hero flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-hero to-hero" />
        <div className="relative">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <img src="/logo.jpg" alt={t("brandName")} className="w-7 h-7 object-contain" />
            </div>
            <span className="font-bold text-xl text-hero-foreground">{t("brandName")}</span>
          </Link>
        </div>

        <div className="relative">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeTestimonial}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="space-y-6"
            >
              <div className="flex gap-1">
                {Array.from({ length: STUDENT_TESTIMONIALS[activeTestimonial].rating }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 text-primary fill-primary" />
                ))}
              </div>

              <blockquote className="text-2xl font-semibold text-hero-foreground leading-relaxed">
                "{STUDENT_TESTIMONIALS[activeTestimonial].text}"
              </blockquote>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                  {STUDENT_TESTIMONIALS[activeTestimonial].name[0]}
                </div>
                <div>
                  <p className="text-hero-foreground font-medium text-sm">{STUDENT_TESTIMONIALS[activeTestimonial].name}</p>
                  <p className="text-hero-foreground/70 text-xs">Licensed • Student</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {STUDENT_TESTIMONIALS.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveTestimonial(i)}
                    className={`h-2.5 w-2.5 rounded-full transition-colors ${
                      i === activeTestimonial ? "bg-primary" : "bg-hero-foreground/35"
                    }`}
                    aria-label={`Show testimonial ${i + 1}`}
                  />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="relative text-hero-foreground/70 text-sm">© 2026 {t("brandName")}</div>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
              <img src="/logo.jpg" alt={t("brandName")} className="w-6 h-6 object-contain" />
            </div>
            <span className="font-bold text-lg text-foreground">{t("brandName")}</span>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as AuthTabKey)}
          >
            <TabsList className="w-full mb-8">
              <TabsTrigger
                value="login"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                {t("login")}
              </TabsTrigger>
              <TabsTrigger
                value="register"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                {t("register")}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {activeTab === "login" ? (
            <>
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">{t("welcomeBack")}</h1>
                  <p className="text-muted-foreground text-sm mt-1">{t("signInContinue")}</p>
                </div>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t("emailAddress")}</label>
                  <Input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder={t("emailAddress")}
                    className="h-11"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-sm font-medium text-muted-foreground">{t("password")}</label>
                    <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                      {t("forgotPassword")}
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      type={showPass ? "text" : "password"}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-11 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-11 mt-2 disabled:opacity-70"
                >
                  {loginLoading ? "Signing in..." : t("signIn")}
                </Button>
              </form>

              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">{t("orContinueWith")}</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10"
                  disabled={loginSocialLoading !== null}
                  onClick={() => handleSocialAuthLogin("google")}
                >
                  <GoogleIcon />
                  {loginSocialLoading === "google" ? t("redirecting") : t("continueWithGoogle")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10"
                  disabled={loginSocialLoading !== null}
                  onClick={() => handleSocialAuthLogin("facebook")}
                >
                  <FacebookIcon />
                  {loginSocialLoading === "facebook" ? t("redirecting") : t("continueWithFacebook")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10"
                  disabled={loginSocialLoading !== null}
                  onClick={() => handleSocialAuthLogin("apple")}
                >
                  <AppleIcon />
                  {loginSocialLoading === "apple" ? t("redirecting") : t("continueWithAppleCloud")}
                </Button>
              </div>

              <p className="text-center text-sm text-muted-foreground mt-4">
                {t("noAccount")}{" "}
                <button
                  type="button"
                  onClick={() => setActiveTab("register")}
                  className="text-primary font-medium hover:underline bg-transparent border-0 p-0"
                >
                  {t("signUp")}
                </button>
              </p>
            </>
          ) : (
            <>
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">{t("createAccount")}</h1>
                  {t("joinViva") && <p className="text-muted-foreground text-sm mt-1">{t("joinViva")}</p>}
                </div>
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t("firstName")} *</label>
                    <Input value={form.firstName} onChange={set("firstName")} placeholder={t("firstName")} className="h-11" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t("lastName")}</label>
                    <Input value={form.lastName} onChange={set("lastName")} placeholder={t("lastName")} className="h-11" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t("emailAddress")} *</label>
                  <Input type="email" value={form.email} onChange={set("email")} placeholder={t("emailAddress")} className="h-11" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t("phoneNumber")}</label>
                  <Input type="tel" value={form.phone} onChange={set("phone")} placeholder="+374 99 123 456" className="h-11" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t("password")} *</label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={set("password")}
                    placeholder="Min. 8 characters"
                    className="h-11"
                  />
                </div>

                <div className="flex items-start gap-2 mt-2">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-primary rounded border-border"
                  />
                  <label htmlFor="terms" className="text-xs text-muted-foreground leading-relaxed">
                    I agree to the{" "}
                    <a href="#" className="text-primary hover:underline">
                      Terms of Service
                    </a>{" "}
                    and{" "}
                    <a href="#" className="text-primary hover:underline">
                      Privacy Policy
                    </a>
                  </label>
                </div>

                <Button
                  type="submit"
                  disabled={registerLoading}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-11 mt-2 disabled:opacity-70"
                >
                  {registerLoading ? "Creating account..." : t("createAccount")}
                </Button>
              </form>

              <div className="my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">{t("orContinueWith")}</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10"
                  disabled={registerSocialLoading !== null}
                  onClick={() => handleSocialAuthRegister("google")}
                >
                  <GoogleIcon />
                  {registerSocialLoading === "google" ? t("redirecting") : t("continueWithGoogle")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10"
                  disabled={registerSocialLoading !== null}
                  onClick={() => handleSocialAuthRegister("facebook")}
                >
                  <FacebookIcon />
                  {registerSocialLoading === "facebook" ? t("redirecting") : t("continueWithFacebook")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10"
                  disabled={registerSocialLoading !== null}
                  onClick={() => handleSocialAuthRegister("apple")}
                >
                  <AppleIcon />
                  {registerSocialLoading === "apple" ? t("redirecting") : t("continueWithAppleCloud")}
                </Button>
              </div>

              <p className="text-center text-sm text-muted-foreground mt-5">
                {t("alreadyAccount")}{" "}
                <button
                  type="button"
                  onClick={() => setActiveTab("login")}
                  className="text-primary font-medium hover:underline bg-transparent border-0 p-0"
                >
                  {t("signIn")}
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

