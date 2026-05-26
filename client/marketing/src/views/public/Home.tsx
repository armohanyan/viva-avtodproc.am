"use client";

import { useLang } from "src/lib/i18n";
import { Button } from "src/components/ui/button";
import { Badge } from "src/components/ui/badge";
import { CountUpText, Reveal } from "src/lib/motion";
import InstructorCard from "src/components/InstructorCard";
import { useInstructors } from "src/modules/instructors/useInstructors";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AppModal } from "src/components/AppModal";
import {
  Star,
  ArrowRight,
  CheckCircle2,
  Trophy,
  ChevronRight,
  ChevronLeft,
  Phone,
  Mail,
  MapPin,
  Clock
} from "lucide-react";
import Navbar from "src/components/Navbar";
import Footer from "src/components/Footer";
import { useAppNavigation } from "src/lib/navigation/AppNavigationContext";
import type { Branch } from "src/modules/branches";
import { useBranches } from "src/modules/branches";
import { cityNameById, useCities } from "src/modules/cities";
import { usePackages } from "src/modules/packages/usePackages";
import { useMarketingPublic } from "src/modules/marketing/useMarketingPublic";
import { MARKETING_STAT_LABEL_KEY } from "src/modules/marketing/statLabels";
import type { TranslationKey } from "src/lib/i18n";
import { sameOriginStaffUploadUrl } from "src/lib/sameOriginStaffUploadUrl";
import { HomeServicesBlock } from "src/views/public/Services";

function telHrefFromListedPhone(phone: string): string {
  const compact = phone.replace(/[^\d+]/g, "");
  return compact ? `tel:${compact}` : "tel:";
}

const DEFAULT_HOME_INTRO_DESCRIPTION =
  "Viva ավտոդպրոցը օգնում է ուսանողներին սովորել անվտանգ, վստահ և ժամանակակից մեթոդներով։ Մեր նպատակն է պատրաստել պատասխանատու վարորդներ՝ ապահովելով որակյալ տեսական և գործնական ուսուցում։";

export default function Home() {
  const { t, lang } = useLang();
  const { MarketingLink, panelHref } = useAppNavigation();
  const { branches } = useBranches();
  const { cities } = useCities();
  const { instructors } = useInstructors();
  const { packages: apiPackages, loading: packagesLoading } = usePackages();
  const { data: mkt } = useMarketingPublic();
  const displayPackages = useMemo(
    () => [...apiPackages].sort((a, b) => a.lessons - b.lessons),
    [apiPackages],
  );
  const visibleInstructors = instructors.filter((ins) => ins.status === "active");
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  const stats = useMemo(() => {
    const rows = mkt?.stats ?? [];
    return rows.map((s) => ({
      value: s.value,
      label: t((MARKETING_STAT_LABEL_KEY[s.key] ?? "yearsExp") as TranslationKey),
    }));
  }, [mkt, t]);

  const testimonials = useMemo(() => {
    if (!mkt?.testimonials?.length) return [];

    return mkt.testimonials.map((x) => ({
      name: x.authorName[lang] || x.authorName.am || x.authorName.ru || x.authorName.en || "",
      text: x.quote[lang] || x.quote.am || x.quote.ru || x.quote.en || "",
      rating: x.rating,
    }));
  }, [mkt, lang]);
  const siteContent = mkt?.siteContent;
  const heroBackgroundImage = sameOriginStaffUploadUrl(siteContent?.homeHeroBackgroundImage) ?? "/home-hero-2.svg";
  const ownerPhoto = sameOriginStaffUploadUrl(siteContent?.ownerPhoto);
  const introTitle = siteContent?.homeIntroTitle?.[lang]?.trim() || t("homeIntroDefaultTitle");
  const introDescription = siteContent?.homeIntroDescription?.[lang]?.trim() || DEFAULT_HOME_INTRO_DESCRIPTION;
  const ownerName = siteContent?.ownerName?.[lang]?.trim() || "";
  const ownerPosition = siteContent?.ownerPosition?.[lang]?.trim() || "";

  type ContactTabKey = "phone" | "email" | "address" | "hours";
  const contactTabs = useMemo(() => {
    const c = mkt?.contact;
    const tabs: {
      key: ContactTabKey;
      icon: typeof Phone;
      label: string;
      lines: string[];
      primaryAction: { label: string; href: string };
    }[] = [];

    if (c?.phones?.length) {
      const first = c.phones[0]!.trim();
      tabs.push({
        key: "phone",
        icon: Phone,
        label: t("phone"),
        lines: c.phones,
        primaryAction: {
          label: t("phone"),
          href: c.primaryTelHref?.trim() || telHrefFromListedPhone(first),
        },
      });
    }
    if (c?.emails?.length) {
      const first = c.emails[0]!.trim();
      tabs.push({
        key: "email",
        icon: Mail,
        label: t("email"),
        lines: c.emails,
        primaryAction: {
          label: t("email"),
          href: c.primaryMailtoHref?.trim() || `mailto:${first}`,
        },
      });
    }
    if (branches.length > 0) {
      tabs.push({
        key: "address",
        icon: MapPin,
        label: t("address"),
        lines: [],
        primaryAction: { label: t("address"), href: "/contact" },
      });
    }
    const hourLines: string[] = [];
    if (c?.hoursWeekdays?.trim()) hourLines.push(c.hoursWeekdays.trim());
    if (c?.hoursSaturday?.trim()) hourLines.push(c.hoursSaturday.trim());
    if (hourLines.length > 0) {
      tabs.push({
        key: "hours",
        icon: Clock,
        label: t("workHours"),
        lines: hourLines,
        primaryAction: { label: t("workHours"), href: "/contact" },
      });
    }
    return tabs;
  }, [mkt, t, branches]);

  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

  const [activeContactTab, setActiveContactTab] = useState<ContactTabKey>("phone");

  useEffect(() => {
    if (testimonials.length === 0) return;
    setActiveTestimonial((i) => i % testimonials.length);
  }, [testimonials.length]);

  useEffect(() => {
    if (testimonials.length === 0) return;

    const timer = window.setTimeout(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [activeTestimonial, testimonials.length]);

  useEffect(() => {
    if (contactTabs.length === 0) return;
    if (!contactTabs.some((tab) => tab.key === activeContactTab)) {
      setActiveContactTab(contactTabs[0]!.key);
    }

  }, [contactTabs, activeContactTab]);

  useEffect(() => {
    if (activeContactTab !== "address") setSelectedBranch(null);
  }, [activeContactTab]);

  const goToPrevTestimonial = () => {
    setActiveTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const goToNextTestimonial = () => {
    setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
  };

  return (
    <div className="min-h-screen">
      <Navbar />

      <section className="relative bg-hero text-hero-foreground overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${heroBackgroundImage}')` }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-hero/40 to-hero/90" />
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #f48633 0%, transparent 50%), radial-gradient(circle at 80% 50%, #e28d51 0%, transparent 50%)" }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-28 lg:py-36">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              {t("heroTitle")}
            </h1>
            <p className="text-lg sm:text-xl text-hero-foreground/80 mb-10 max-w-2xl leading-relaxed">
              {t("heroSub")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a href={panelHref("/register")}>
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 h-12 text-base">
                  {t("getStarted")} <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </a>
              <MarketingLink href="/packages">
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-transparent border-border/60 text-hero-foreground hover:bg-hero-foreground/10 hover:text-hero-foreground h-12 text-base"
                >
                  {t("learnMore")}
                </Button>
              </MarketingLink>
            </div>
          </div>
        </div>

        {stats.length > 0 ? (
          <div className="relative border-t border-border/40 bg-hero/80 backdrop-blur">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {stats.map((s, i) => (
                  <Reveal key={i} className="text-center" delay={i * 0.05}>
                    <div className="text-3xl font-bold text-hero-foreground">
                      <CountUpText value={s.value} />
                    </div>
                    <div className="text-sm text-hero-foreground/70 mt-1">{s.label}</div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section className="py-14 bg-accent/35 border-y border-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 lg:items-start">
            <div className="lg:col-span-7">
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">{introTitle}</h2>
              <p className="text-muted-foreground leading-relaxed">{introDescription}</p>
            </div>
            <div className="lg:col-span-5 max-w-md mx-auto lg:max-w-none lg:mx-0 w-full">
              <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                <div className="relative aspect-[4/5] sm:aspect-[3/4] lg:aspect-auto lg:min-h-[22rem] xl:min-h-[26rem] w-full bg-muted">
                  {ownerPhoto ? (
                    <img
                      src={ownerPhoto}
                      alt={ownerName || "Owner"}
                      className="absolute inset-0 w-full h-full object-cover object-top"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center border-b border-dashed border-border bg-muted/40 text-xs text-muted-foreground text-center px-4">
                      Owner photo
                    </div>
                  )}
                </div>
                <div className="p-5 sm:p-6">
                  <p className="font-semibold text-lg text-foreground">{ownerName || "Viva Autoschool"}</p>
                  {ownerPosition ? <p className="text-sm text-muted-foreground mt-1">{ownerPosition}</p> : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-10">
            <p className="text-primary font-semibold text-sm uppercase tracking-wider mb-3">
              {t("servicesEyebrow")}
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">{t("servicesTitle")}</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">{t("servicesSub")}</p>
          </div>

          <HomeServicesBlock />
        </div>
      </section>

      {(packagesLoading || displayPackages.length > 0) && (
        <section className="py-20 bg-accent">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <p className="text-primary font-semibold text-sm uppercase tracking-wider mb-3">
                {t("packagesEyebrow")}
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">{t("packagesTitle")}</h2>
              <p className="text-muted-foreground text-lg">{t("packagesSub")}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {packagesLoading ? (
                <p className="text-center text-muted-foreground md:col-span-3 py-6">{t("loading")}</p>
              ) : (
                displayPackages.map((pkg) => {
                  const popular = pkg.id === "PKG-002";
                  const borderClass = popular ? "border-primary" : "border-border";
                  return (
                    <div
                      key={pkg.id}
                      className={`relative bg-card rounded-2xl border-2 ${borderClass} overflow-hidden p-0 ${popular ? "shadow-xl" : "shadow-sm"} transition-shadow hover:shadow-xl flex flex-col h-full`}
                    >
                      {popular && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                          <Badge className="bg-primary text-primary-foreground px-4 py-1">{t("mostPopular")}</Badge>
                        </div>
                      )}
                      {pkg.imageUrl ? (
                        <div className="relative w-full aspect-[16/10] overflow-hidden bg-muted shrink-0">
                          <img src={pkg.imageUrl} alt={pkg.name} className="absolute inset-0 w-full h-full object-cover" />
                        </div>
                      ) : null}
                      <div className="p-6 sm:p-8 flex flex-col flex-1 min-h-0">
                        <div className="mb-6">
                          <h3 className="font-bold text-xl text-foreground mb-2">{pkg.name}</h3>
                          <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-bold text-foreground">{pkg.price}</span>
                            <span className="text-lg text-muted-foreground">֏</span>
                          </div>
                          <p className="text-muted-foreground text-sm mt-1">
                            {pkg.lessons} {t("lessonTypePractical").toLowerCase()} · {pkg.theoryLessons}{" "}
                            {t("lessonTypeTheory").toLowerCase()}
                          </p>
                        </div>
                        <ul className="space-y-3 mb-8">
                          {pkg.features.map((f, j) => (
                            <li key={j} className="flex items-center gap-2 text-sm text-muted-foreground">
                              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                              {f}
                            </li>
                          ))}
                        </ul>
                        <div className="mt-auto">
                          <a href={panelHref("/register")}>
                            <Button
                              className={`w-full ${
                                popular
                                  ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                                  : "bg-background hover:bg-accent text-foreground"
                              }`}
                            >
                              {t("choosePackage")}
                            </Button>
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>
      )}

      {visibleInstructors.length > 0 ? (
        <section className="py-20 bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <p className="text-primary font-semibold text-sm uppercase tracking-wider mb-3">
                {t("instructorsEyebrow")}
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">{t("instructorsTitle")}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {visibleInstructors.map((ins, i) => (
                <InstructorCard key={i} instructor={ins} showBookButton={true} />
              ))}
            </div>
            <div className="text-center mt-10">
              <MarketingLink href="/instructors">
                <Button variant="outline" className="border-border">
                  {t("viewAll")} <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </MarketingLink>
            </div>
          </div>
        </section>
      ) : null}

      {testimonials.length > 0 ? (
        <section className="py-20 bg-hero text-hero-foreground">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <p className="text-primary font-semibold text-sm uppercase tracking-wider mb-3">
                {t("testimonialsEyebrow")}
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t("testimonialsTitle")}</h2>
            </div>
            <div className="mx-auto max-w-3xl">
              <div className="bg-secondary rounded-2xl p-8 border border-border min-h-[220px]">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: testimonials[activeTestimonial]!.rating }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 text-primary fill-primary" />
                  ))}
                </div>
                <p className="text-foreground/80 text-sm leading-relaxed mb-6">
                  &ldquo;{testimonials[activeTestimonial]!.text}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-semibold">
                    {testimonials[activeTestimonial]!.name[0]}
                  </div>
                  <span className="font-medium text-foreground text-sm">{testimonials[activeTestimonial]!.name}</span>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="border-border bg-secondary text-foreground hover:bg-secondary/80 hover:text-foreground"
                  onClick={goToPrevTestimonial}
                  aria-label="Previous testimonial"
                >
                  <ChevronLeft className="w-4 h-4 text-foreground" />
                </Button>
                <div className="flex items-center gap-2">
                  {testimonials.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setActiveTestimonial(i)}
                      className={`h-2.5 w-2.5 rounded-full transition-colors ${
                        i === activeTestimonial ? "bg-primary" : "bg-border"
                      }`}
                      aria-label={`Go to testimonial ${i + 1}`}
                    />
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="border-border bg-secondary text-foreground hover:bg-secondary/80 hover:text-foreground"
                  onClick={goToNextTestimonial}
                  aria-label="Next testimonial"
                >
                  <ChevronRight className="w-4 h-4 text-foreground" />
                </Button>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {contactTabs.length > 0 ? (
        <section className="py-20 bg-accent/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {(() => {
              const activeContact =
                contactTabs.find((tab) => tab.key === activeContactTab) ?? contactTabs[0]!;
              const ActiveIcon = activeContact.icon;
            return (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                <div>
                  <p className="text-primary font-semibold text-sm uppercase tracking-wider mb-3">
                    {t("contact")}
                  </p>
                  <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
                    {t("contactTitle")}
                  </h2>
                  <p className="text-muted-foreground text-lg leading-relaxed max-w-md">
                    {t("contactSub")}
                  </p>

                  <div className="mt-7 flex flex-wrap gap-3 items-center">
                    <MarketingLink href="/contact">
                      <Button
                        size="lg"
                        variant="outline"
                        className="border-primary/40 text-primary hover:bg-primary/5"
                      >
                        {t("contactSendMessageTitle")} <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </MarketingLink>
                  </div>

                  <div className="mt-8 rounded-2xl border border-border/70 bg-card/60 p-2">
                    <div className="flex flex-wrap gap-2">
                      {contactTabs.map((tab) => {
                        const isActive = tab.key === activeContactTab;
                        const TabIcon = tab.icon;
                        return (
                          <button
                            key={tab.key}
                            type="button"
                            onClick={() => setActiveContactTab(tab.key)}
                            className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                              isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                            }`}
                            aria-pressed={isActive}
                          >
                            <span
                              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                isActive ? "bg-primary/15 text-primary" : "bg-accent/40 text-muted-foreground"
                              }`}
                            >
                              <TabIcon className="w-4 h-4" />
                            </span>
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <div
                    className="absolute inset-0 -z-10 rounded-3xl"
                    style={{
                      background:
                        "radial-gradient(circle at 20% 20%, rgba(244,134,51,0.25) 0%, transparent 45%), radial-gradient(circle at 80% 30%, rgba(226,141,81,0.20) 0%, transparent 50%), linear-gradient(180deg, rgba(0,0,0,0.02), rgba(0,0,0,0.06))",
                    }}
                  />

                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={activeContact.key}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="rounded-3xl border border-border/70 bg-background/70 p-7 shadow-sm"
                    >
                      <div className="flex items-start gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <ActiveIcon className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-primary">{activeContact.label}</p>
                        {activeContact.key !== "address" ? (
                          <div className="mt-3 space-y-1">
                            {activeContact.lines.map((line, idx) => (
                              <p key={idx} className="text-foreground text-lg font-semibold leading-relaxed">
                                {line}
                              </p>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-3">
                            <h3 className="text-sm font-semibold text-primary mb-3">{t("branches")}</h3>
                            <div className="space-y-3">
                              {branches.map((branch) => (
                                <div
                                  key={branch.id}
                                  className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between rounded-lg border border-border bg-background px-3 py-2.5"
                                >
                                  <div className="min-w-0 space-y-1">
                                    <p className="text-sm font-medium text-foreground">{branch.name}</p>
                                    <p className="text-xs text-muted-foreground/90">{cityNameById(cities, branch.cityId)}</p>
                                    {branch.phone && <p className="text-xs text-muted-foreground">{branch.phone}</p>}
                                    {branch.email && <p className="text-xs text-muted-foreground">{branch.email}</p>}
                                    {branch.workHours && <p className="text-xs text-muted-foreground">{branch.workHours}</p>}
                                  </div>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="shrink-0"
                                    onClick={() => setSelectedBranch(branch)}
                                    aria-label={`Open map for ${branch.name}`}
                                  >
                                    <MapPin className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                          <div className="mt-5 flex flex-wrap gap-3 items-center">
                            {activeContact.key === "phone" && (
                              <Button
                                asChild
                                size="lg"
                                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                              >
                                <a href={activeContact.primaryAction.href}>{t("phone")}</a>
                              </Button>
                            )}
                            {activeContact.key === "email" && (
                              <Button
                                asChild
                                size="lg"
                                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                              >
                                <a href={activeContact.primaryAction.href}>{t("email")}</a>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            );
            })()}
          </div>
        </section>
      ) : null}

      {selectedBranch ? (
        <AppModal
          open={!!selectedBranch}
          onOpenChange={(open) => !open && setSelectedBranch(null)}
          title={selectedBranch.name}
          contentClassName="max-w-4xl"
          bodyClassName="px-6 pb-6 pt-0"
        >
          <iframe
            title={`Map for ${selectedBranch.name}`}
            src={selectedBranch.mapUrl}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="w-full h-[420px] rounded-xl border border-border"
          />
        </AppModal>
      ) : null}

      <section className="py-20 bg-primary">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Trophy className="w-12 h-12 text-primary-foreground/80 mx-auto mb-6" />
          <h2 className="text-3xl sm:text-4xl font-bold text-primary-foreground mb-4">
            {t("ctaReadyLicenseTitle")}
          </h2>
          <p className="text-primary-foreground/80 text-lg mb-10 max-w-xl mx-auto">
            {t("ctaReadyLicenseSub")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={panelHref("/register")}>
              <Button
                size="lg"
                className="bg-hero text-hero-foreground hover:bg-hero/90 px-8 h-12 text-base font-semibold"
              >
                {t("getStarted")} <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </a>
            <MarketingLink href="/contact">
              <Button
                size="lg"
                variant="outline"
                className="bg-transparent border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground h-12 text-base"
              >
                {t("contact")}
              </Button>
            </MarketingLink>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
