import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import type React from "react";
import { Link, useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Eye, EyeOff, Star } from "lucide-react";

import { resolvePostAuthPanelPath, useAccount } from "src/modules/accounts";
import { storePendingAdminMfaToken } from "src/pages/auth/VerifyAdmin2fa";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import type { AccountType } from "src/modules/accounts";
import { buildSocialAuthUrl } from "src/lib/socialAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "src/components/ui/tabs";
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import { Card, CardContent, CardFooter } from "src/components/ui/card";
import { absWouterHref } from "src/lib/wouterFullPath";
import { useMarketingPublic } from "src/modules/marketing/useMarketingPublic";
import { joinAppPath } from "src/lib/navigation/crossApp";
import { resolvedViteMarketingOrigin } from "src/lib/navigation/viteMarketingOrigin";
import { legalDoc } from "src/lib/legalDocsContent";

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

type AuthTabKey = "login" | "register";

function AuthDivider({ label }: { label: string }) {
  return (
    <div className="relative my-6" role="separator" aria-hidden>
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-border" />
      </div>
      <div className="relative flex justify-center text-xs uppercase tracking-wide">
        <span className="bg-card px-3 text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}

export default function AuthTabs({ initialTab }: { initialTab: AuthTabKey }) {
  const { t, lang } = useLang();
  const marketingBase = resolvedViteMarketingOrigin();
  const termsHref = joinAppPath(marketingBase, "/terms");
  const privacyHref = joinAppPath(marketingBase, "/privacy");
  const termsDoc = legalDoc("terms", lang);
  const privacyDoc = legalDoc("privacy", lang);
  const { showToast } = useToast();
  const { user, hydrated, signIn } = useAccount();
  const { data: mkt } = useMarketingPublic();

  // Keep URL stable: tab switching should update only the form, not the left panel.
  const [activeTab, setActiveTab] = useState<AuthTabKey>(initialTab);

  const [activeTestimonial, setActiveTestimonial] = useState(0);

  const testimonials = useMemo(() => {
    if (!mkt?.testimonials?.length) return [];
    return mkt.testimonials.map((x) => ({
      name: x.authorName.trim() || t("roleStudent"),
      text: x.quote.trim(),
      rating: Math.min(5, Math.max(1, Math.round(Number(x.rating) || 5))),
    }));
  }, [mkt, t]);

  const visibleTestimonials = useMemo(() => testimonials.filter((x) => x.text.length > 0), [testimonials]);

  useEffect(() => {
    if (visibleTestimonials.length === 0) return;
    setActiveTestimonial((i) => i % visibleTestimonials.length);
  }, [visibleTestimonials.length]);

  useEffect(() => {
    if (visibleTestimonials.length === 0) return;

    const timer = window.setTimeout(() => {
      setActiveTestimonial((prev) => (prev + 1) % visibleTestimonials.length);
    }, 5200);
    return () => window.clearTimeout(timer);
  }, [activeTestimonial, visibleTestimonials.length]);

  // --- Login state/handlers ---
  const [pathname, setLocation] = useLocation();

  /** Session restored on /login etc. — leave auth routes as soon as we have a user. */
  useLayoutEffect(() => {
    if (!hydrated || !user) return;
    let p = (pathname.split("?")[0] || "/").trim();
    if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1) || "/";
    const onAuthForm = p === "/login" || p === "/register" || p === "/forgot-password";
    if (!onAuthForm) return;
    const dest = resolvePostAuthPanelPath(user.accountType, window.location.search);
    setLocation(absWouterHref(dest));
  }, [hydrated, user, pathname, setLocation]);

  const [showPass, setShowPass] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginGoogleRedirecting, setLoginGoogleRedirecting] = useState(false);

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
      const data = await vivaApiJson<
        | { requiresMfa: true; mfaToken: string }
        | {
            accessToken: string;
            user: {
              id: string | number;
              email: string;
              name: string;
              accountType: AccountType;
              hasPassword?: boolean;
            };
          }
      >("/auth/login", { method: "POST", body: { email: trimmedEmail, password: loginPassword } });

      if ("requiresMfa" in data) {
        storePendingAdminMfaToken(data.mfaToken);
        setLocation(absWouterHref("/auth/verify-2fa"));
        return;
      }

      const accountType = data.user.accountType;

      signIn({
        email: data.user.email,
        name: data.user.name,
        accountType,
        accessToken: data.accessToken,
        id: data.user.id,
        ...(typeof data.user.hasPassword === "boolean" ? { hasPassword: data.user.hasPassword } : {}),
      });

      showToast(t("loginSuccess"), "success");
      setLocation(absWouterHref(resolvePostAuthPanelPath(accountType, window.location.search)));
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setLoginLoading(false);
    }
  };

  const startGoogleLogin = () => {
    setLoginGoogleRedirecting(true);
    window.location.assign(buildSocialAuthUrl("google", "/auth/callback"));
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
  const [registerGoogleRedirecting, setRegisterGoogleRedirecting] = useState(false);

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
      const data = await vivaApiJson<{
        accessToken: string;
        user: {
          id: string | number;
          email: string;
          name: string;
          accountType: AccountType;
          hasPassword?: boolean;
        };
      }>("/auth/register", {
        method: "POST",
        body: {
          email: form.email.trim(),
          password: form.password,
          name,
          phone: form.phone.trim() || undefined,
        },
      });
      const accountType = data.user.accountType;
      signIn({
        email: data.user.email,
        name: data.user.name,
        accountType,
        accessToken: data.accessToken,
        id: data.user.id,
        ...(typeof data.user.hasPassword === "boolean" ? { hasPassword: data.user.hasPassword } : {}),
      });
      showToast(t("registerSuccess"), "success");
      setLocation(absWouterHref(resolvePostAuthPanelPath(accountType, window.location.search)));
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setRegisterLoading(false);
    }
  };

  const startGoogleRegister = () => {
    setRegisterGoogleRedirecting(true);
    window.location.assign(buildSocialAuthUrl("google", "/auth/callback"));
  };

  return (
    <div className="min-h-screen bg-background flex">
      <div className="hidden lg:flex lg:w-1/2 bg-hero flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-hero to-hero" />
        <div className="relative">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.svg" alt={t("brandName")} className="w-10 h-10 object-contain" />
            <span className="font-bold text-xl text-hero-foreground">{t("brandName")}</span>
          </Link>
        </div>

        <div className="relative">
          <AnimatePresence mode="wait" initial={false}>
            {visibleTestimonials.length > 0 ? (
              <motion.div
                key={activeTestimonial}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
                className="space-y-6"
              >
                <div className="flex gap-1">
                  {Array.from({ length: visibleTestimonials[activeTestimonial]!.rating }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 text-primary fill-primary" />
                  ))}
                </div>

                <blockquote className="text-2xl font-semibold text-hero-foreground leading-relaxed">
                  "{visibleTestimonials[activeTestimonial]!.text}"
                </blockquote>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                    {(visibleTestimonials[activeTestimonial]!.name.trim()[0] ?? "?").toUpperCase()}
                  </div>
                  <div>
                    <p className="text-hero-foreground font-medium text-sm">{visibleTestimonials[activeTestimonial]!.name}</p>
                    <p className="text-hero-foreground/70 text-xs">
                      {t("studentRatingLicensed")} • {t("roleStudent")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {visibleTestimonials.map((_, i) => (
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
            ) : (
              <motion.div
                key="auth-hero-fallback"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
                className="space-y-8"
              >
                <p className="text-sm font-semibold uppercase tracking-wider text-primary">{t("startJourneyTodayLabel")}</p>
                <p className="text-2xl font-semibold text-hero-foreground leading-relaxed">{t("loginHeroQuote")}</p>
                <ul className="space-y-3 text-hero-foreground/90 text-sm">
                  <li className="flex gap-2">
                    <CheckCircle2 className="w-5 h-5 shrink-0 text-primary" aria-hidden />
                    <span>{t("signupBulletBookSessions")}</span>
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle2 className="w-5 h-5 shrink-0 text-primary" aria-hidden />
                    <span>{t("signupBulletTrackProgress")}</span>
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle2 className="w-5 h-5 shrink-0 text-primary" aria-hidden />
                    <span>{t("signupBulletMaterials")}</span>
                  </li>
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative text-hero-foreground/70 text-sm">© 2026 {t("brandName")}</div>
      </div>

      <div className="flex-1 flex flex-col justify-center px-4 py-10 sm:px-6 sm:py-12">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as AuthTabKey)} className="mx-auto w-full max-w-[440px]">
          <Card className="gap-0 overflow-hidden border-border/80 py-0 shadow-md">
            <div className="border-b border-border/60 bg-muted/30 px-5 pt-5 pb-4 sm:px-8 sm:pt-6">
              <div className="flex lg:hidden items-center justify-center gap-2 pb-4">
                <img src="/logo.svg" alt={t("brandName")} className="h-10 w-10 object-contain" />
                <span className="font-semibold text-lg text-foreground">{t("brandName")}</span>
              </div>
              <TabsList className="grid h-11 w-full grid-cols-2 rounded-lg bg-muted/80 p-1">
                <TabsTrigger value="login" className="rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                  {t("login")}
                </TabsTrigger>
                <TabsTrigger value="register" className="rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                  {t("register")}
                </TabsTrigger>
              </TabsList>
            </div>

            <CardContent className="space-y-0 px-0 pb-0 pt-0">
              <TabsContent value="login" className="mt-0 outline-none">
                <div className="space-y-6 px-5 py-6 sm:px-8 sm:py-8">
                  <header className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("welcomeBack")}</h1>
                    <p className="text-sm text-muted-foreground">{t("signInContinue")}</p>
                  </header>

                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground" htmlFor="auth-login-email">
                        {t("emailAddress")}
                      </label>
                      <Input
                        id="auth-login-email"
                        type="email"
                        autoComplete="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder={t("emailAddress")}
                        className="h-11 bg-background"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-sm font-medium text-foreground" htmlFor="auth-login-password">
                          {t("password")}
                        </label>
                        <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                          {t("forgotPassword")}
                        </Link>
                      </div>
                      <div className="relative">
                        <Input
                          id="auth-login-password"
                          type={showPass ? "text" : "password"}
                          autoComplete="current-password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="••••••••"
                          className="h-11 bg-background pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPass(!showPass)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                          aria-label={showPass ? t("authPasswordVisibilityHide") : t("authPasswordVisibilityShow")}
                        >
                          {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={loginLoading || loginGoogleRedirecting}
                      className="h-11 w-full font-semibold disabled:opacity-70"
                    >
                      {loginLoading ? t("authSubmittingLogin") : t("signIn")}
                    </Button>
                  </form>

                  <AuthDivider label={t("orContinueWith")} />

                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full gap-2 border-border bg-background font-medium"
                    disabled={loginLoading || loginGoogleRedirecting}
                    onClick={startGoogleLogin}
                  >
                    <GoogleIcon />
                    {loginGoogleRedirecting ? t("redirecting") : t("continueWithGoogle")}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="register" className="mt-0 outline-none">
                <div className="space-y-6 px-5 py-6 sm:px-8 sm:py-8">
                  <header className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("createAccount")}</h1>
                    {t("joinViva") ? <p className="text-sm text-muted-foreground">{t("joinViva")}</p> : null}
                  </header>

                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground" htmlFor="auth-reg-first">
                          {t("firstName")} <span className="text-destructive">*</span>
                        </label>
                        <Input
                          id="auth-reg-first"
                          value={form.firstName}
                          onChange={set("firstName")}
                          placeholder={t("firstName")}
                          autoComplete="given-name"
                          className="h-11 bg-background"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground" htmlFor="auth-reg-last">
                          {t("lastName")}
                        </label>
                        <Input
                          id="auth-reg-last"
                          value={form.lastName}
                          onChange={set("lastName")}
                          placeholder={t("lastName")}
                          autoComplete="family-name"
                          className="h-11 bg-background"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground" htmlFor="auth-reg-email">
                        {t("emailAddress")} <span className="text-destructive">*</span>
                      </label>
                      <Input
                        id="auth-reg-email"
                        type="email"
                        value={form.email}
                        onChange={set("email")}
                        placeholder={t("emailAddress")}
                        autoComplete="email"
                        className="h-11 bg-background"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground" htmlFor="auth-reg-phone">
                        {t("phoneNumber")}
                      </label>
                      <Input
                        id="auth-reg-phone"
                        type="tel"
                        value={form.phone}
                        onChange={set("phone")}
                        placeholder="+374 99 123 456"
                        autoComplete="tel"
                        className="h-11 bg-background"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground" htmlFor="auth-reg-password">
                        {t("password")} <span className="text-destructive">*</span>
                      </label>
                      <Input
                        id="auth-reg-password"
                        type="password"
                        value={form.password}
                        onChange={set("password")}
                        placeholder={t("passwordPlaceholderMinChars")}
                        autoComplete="new-password"
                        className="h-11 bg-background"
                      />
                    </div>

                    <div className="flex gap-2.5 rounded-lg border border-border/80 bg-muted/20 p-3">
                      <input
                        type="checkbox"
                        id="terms"
                        checked={agreed}
                        onChange={(e) => setAgreed(e.target.checked)}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-border text-primary"
                      />
                      <label htmlFor="terms" className="text-xs leading-relaxed text-muted-foreground">
                        {t("registerLegalAgreePrefix")}{" "}
                        <a href={termsHref} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                          {termsDoc.pageTitle}
                        </a>{" "}
                        {t("registerLegalAgreeConj")}{" "}
                        <a href={privacyHref} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                          {privacyDoc.pageTitle}
                        </a>
                      </label>
                    </div>

                    <Button
                      type="submit"
                      disabled={registerLoading || registerGoogleRedirecting}
                      className="h-11 w-full font-semibold disabled:opacity-70"
                    >
                      {registerLoading ? t("authSubmittingRegister") : t("createAccount")}
                    </Button>
                  </form>

                  <AuthDivider label={t("orContinueWith")} />

                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full gap-2 border-border bg-background font-medium"
                    disabled={registerLoading || registerGoogleRedirecting}
                    onClick={startGoogleRegister}
                  >
                    <GoogleIcon />
                    {registerGoogleRedirecting ? t("redirecting") : t("continueWithGoogle")}
                  </Button>
                </div>
              </TabsContent>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 border-t border-border/60 bg-muted/15 px-5 py-4 sm:px-8">
              {activeTab === "login" ? (
                <p className="text-center text-sm text-muted-foreground">
                  {t("noAccount")}{" "}
                  <button
                    type="button"
                    onClick={() => setActiveTab("register")}
                    className="font-semibold text-primary hover:underline"
                  >
                    {t("signUp")}
                  </button>
                </p>
              ) : (
                <p className="text-center text-sm text-muted-foreground">
                  {t("alreadyAccount")}{" "}
                  <button
                    type="button"
                    onClick={() => setActiveTab("login")}
                    className="font-semibold text-primary hover:underline"
                  >
                    {t("signIn")}
                  </button>
                </p>
              )}
            </CardFooter>
          </Card>
        </Tabs>
      </div>
    </div>
  );
}

