"use client";

import { useLang } from "src/lib/i18n";
import { Button } from "src/components/ui/button";
import { Card } from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import { CountUpText, Reveal } from "src/lib/motion";
import InstructorCard from "src/components/InstructorCard";
import { useInstructors } from "src/modules/instructors/useInstructors";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "src/components/ui/dialog";
import {
  Car,
  BookOpen,
  Award,
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

const FALLBACK_STATS: { key: string; value: string }[] = [
  { key: "years_exp", value: "14+" },
  { key: "students", value: "3,200+" },
  { key: "instructors", value: "18" },
  { key: "success_rate", value: "94%" },
];

const FALLBACK_TESTIMONIALS = [
  { name: "Anahit K.", text: "Passed my exam on the first try! The instructors are incredibly patient and professional.", rating: 5 },
  { name: "Tigran M.", text: "Great experience from start to finish. The booking system made it so easy to schedule lessons.", rating: 5 },
  { name: "Mariam S.", text: "I was terrified of driving but Viva helped me become confident behind the wheel.", rating: 5 },
];

export default function Home() {
  const { t } = useLang();
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
    const rows = mkt?.stats?.length ? mkt.stats : FALLBACK_STATS;
    return rows.map((s) => ({
      value: s.value,
      label: t((MARKETING_STAT_LABEL_KEY[s.key] ?? "yearsExp") as TranslationKey),
    }));
  }, [mkt, t]);

  const testimonials = useMemo(() => {
    if (mkt?.testimonials?.length) {
      return mkt.testimonials.map((x) => ({ name: x.authorName, text: x.quote, rating: x.rating }));
    }
    return FALLBACK_TESTIMONIALS;
  }, [mkt]);

  type ContactTabKey = "phone" | "email" | "address" | "hours";
  const contactTabs = useMemo(
    () => {
      const c = mkt?.contact;
      const phones = c?.phones?.length ? c.phones : ["+374 10 123 456", "+374 99 123 456"];
      const emails = c?.emails?.length ? c.emails : ["info@vivadrive.am", "support@vivadrive.am"];
      const hoursW = c?.hoursWeekdays?.trim() ? c.hoursWeekdays : t("monFri");
      const hoursS = c?.hoursSaturday?.trim() ? c.hoursSaturday : t("sat");
      return [
        {
          key: "phone" as const,
          icon: Phone,
          label: t("phone"),
          lines: phones,
          primaryAction: { label: t("phone"), href: c?.primaryTelHref?.trim() || "tel:+37410123456" },
        },
        {
          key: "email" as const,
          icon: Mail,
          label: t("email"),
          lines: emails,
          primaryAction: { label: t("email"), href: c?.primaryMailtoHref?.trim() || "mailto:info@vivadrive.am" },
        },
        {
          key: "address" as const,
          icon: MapPin,
          label: t("address"),
          lines: [] as string[],
          primaryAction: { label: "Open map", href: "#" },
        },
        {
          key: "hours" as const,
          icon: Clock,
          label: t("workHours"),
          lines: [hoursW, hoursS],
          primaryAction: { label: t("workHours"), href: "/contact" },
        },
      ];
    },
    [mkt, t],
  );

  const services = [
    { icon: Car, title: t("practicalLessons"), desc: t("practicalDesc"), color: "text-primary", bg: "bg-primary/10", href: "/services" },
    { icon: BookOpen, title: t("theoryCourses"), desc: t("theoryDesc"), color: "text-primary", bg: "bg-primary/10", href: "/services" },
    { icon: Award, title: t("licensePrep"), desc: t("licensePrepDesc"), color: "text-primary", bg: "bg-primary/10", href: "/services" },
  ];

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
    // Keep the address map dialog scoped to the Address tab.
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

      {/* Hero */}
      <section className="relative bg-hero text-hero-foreground overflow-hidden">
        {/* Background photo */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/home-hero-2.svg')" }}
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

        {/* Stats bar */}
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
      </section>

      {/* Services */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="text-primary font-semibold text-sm uppercase tracking-wider mb-3">
              {t("servicesEyebrow")}
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">{t("servicesTitle")}</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">{t("servicesSub")}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((s, i) => (
              <MarketingLink key={i} href={s.href} className="block">
                <Card className="p-6 hover:shadow-lg transition-shadow border-border group cursor-pointer flex flex-col h-full">
                  <div className={`w-12 h-12 ${s.bg} rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                    <s.icon className={`w-6 h-6 ${s.color}`} />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                  <div className={`flex items-center gap-1 mt-auto text-sm font-medium ${s.color}`}>
                    {t("learnMore")} <ChevronRight className="w-4 h-4" />
                  </div>
                </Card>
              </MarketingLink>
            ))}
          </div>
        </div>
      </section>

      {/* Packages */}
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
            ) : displayPackages.length === 0 ? (
              <p className="text-center text-muted-foreground md:col-span-3 py-6">{t("packagesSub")}</p>
            ) : (
              displayPackages.map((pkg) => {
                const popular = pkg.id === "PKG-002";
                const borderClass = popular ? "border-primary" : "border-border";
                return (
                  <div
                    key={pkg.id}
                    className={`relative bg-card rounded-2xl border-2 ${borderClass} p-6 sm:p-8 ${popular ? "shadow-xl" : "shadow-sm"} transition-shadow hover:shadow-xl flex flex-col h-full`}
                  >
                    {popular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground px-4 py-1">{t("mostPopular")}</Badge>
                      </div>
                    )}
                    <div className="mb-6">
                      <h3 className="font-bold text-xl text-foreground mb-2">{pkg.name}</h3>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-foreground">{pkg.price}</span>
                        <span className="text-lg text-muted-foreground">֏</span>
                      </div>
                      <p className="text-muted-foreground text-sm mt-1">
                        {pkg.lessons} {t("lessons")}
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
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* Instructors */}
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
              <InstructorCard
                key={i}
                instructor={ins}
                showBookButton={true}
                imageHeightClassName="h-64"
              />
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

      {/* Testimonials */}
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
                  "{testimonials[activeTestimonial]!.text}"
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

      {/* Contact overview */}
      <section className="py-20 bg-accent/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {(() => {
            const activeContact = contactTabs.find((tab) => tab.key === activeContactTab)!;
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
                    <div className="text-xs text-muted-foreground">
                      Select info below
                    </div>
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

      <Dialog open={!!selectedBranch} onOpenChange={(open) => !open && setSelectedBranch(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          {selectedBranch && (
            <>
              <DialogHeader className="px-6 pt-6 pb-3">
                <DialogTitle>{selectedBranch.name}</DialogTitle>
              </DialogHeader>
              <div className="px-6 pb-6">
                <iframe
                  title={`Map for ${selectedBranch.name}`}
                  src={selectedBranch.mapUrl}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="w-full h-[420px] rounded-xl border border-border"
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* CTA */}
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
