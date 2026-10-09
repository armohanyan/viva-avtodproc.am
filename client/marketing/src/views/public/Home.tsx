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
  ArrowRight,
  CheckCircle2,
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
import PackagePromoImage from "src/components/PackagePromoImage";

const HOME_INSTRUCTORS_LIMIT = 8;

function telHrefFromListedPhone(phone: string): string {
  const compact = phone.replace(/[^\d+]/g, "");
  return compact ? `tel:${compact}` : "tel:";
}

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
  const homeInstructors = visibleInstructors.slice(0, HOME_INSTRUCTORS_LIMIT);
  const hasMoreInstructors = visibleInstructors.length > HOME_INSTRUCTORS_LIMIT;
  const stats = useMemo(() => {
    const rows = mkt?.stats ?? [];
    return rows.map((s) => ({
      value: s.value,
      label: t((MARKETING_STAT_LABEL_KEY[s.key] ?? "yearsExp") as TranslationKey),
    }));
  }, [mkt, t]);

  const siteContent = mkt?.siteContent;
  const heroBackgroundImage = sameOriginStaffUploadUrl(siteContent?.homeHeroBackgroundImage) ?? "/home-hero-2.svg";

  const heroContact = useMemo(() => {
    const contactPhones = (mkt?.contact?.phones ?? []).map((p) => p.trim()).filter(Boolean);
    const branchPhones = branches.map((b) => b.phone?.trim()).filter((p): p is string => !!p);
    const phones = [...new Set([...contactPhones, ...branchPhones])];

    const contactEmails = (mkt?.contact?.emails ?? []).map((e) => e.trim()).filter(Boolean);
    const branchEmails = branches.map((b) => b.email?.trim()).filter((e): e is string => !!e);
    const emails = [...new Set([...contactEmails, ...branchEmails])];

    const locations: string[] = [];
    if (branches.length > 0) {
      for (const branch of branches) {
        const city = cityNameById(cities, branch.cityId);
        const line = [city, branch.name].filter(Boolean).join(", ");
        if (line) locations.push(line);
      }
    } else {
      const addr1 = mkt?.footer?.addressLine1?.trim() || "";
      const addr2 = mkt?.footer?.addressLine2?.trim() || "";
      const footerLocation = [addr1, addr2].filter(Boolean).join(", ");
      if (footerLocation) locations.push(footerLocation);
    }

    return { phones, emails, locations };
  }, [mkt, branches, cities]);
  const heroLocationLabel =
    heroContact.locations.length > 1
      ? t("heroBranchesCount").replace("{n}", String(heroContact.locations.length))
      : heroContact.locations[0] ?? "";
  const heroPhone = heroContact.phones[0] ?? "";

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
    if (contactTabs.length === 0) return;
    if (!contactTabs.some((tab) => tab.key === activeContactTab)) {
      setActiveContactTab(contactTabs[0]!.key);
    }

  }, [contactTabs, activeContactTab]);

  useEffect(() => {
    if (activeContactTab !== "address") setSelectedBranch(null);
  }, [activeContactTab]);

  return (
    <div className="min-h-screen">
      <Navbar />

      <section className="relative flex flex-col min-h-[calc(100svh-4rem-1px)] bg-hero text-hero-foreground overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${heroBackgroundImage}')` }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #f48633 0%, transparent 50%), radial-gradient(circle at 80% 50%, #e28d51 0%, transparent 50%)" }}
        />
        <div className="relative flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-10 lg:pt-24 lg:pb-14 flex flex-col">
          <h1 className="sr-only">{t("heroTitle")}</h1>
          <div className="mt-auto pt-12">
            <p className="mb-4 text-xl sm:text-2xl font-semibold text-neutral-900">{t("heroCta")}</p>
            {heroLocationLabel || heroPhone ? (
              <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-neutral-800">
                {heroLocationLabel ? (
                  <MarketingLink
                    href="/contact"
                    className="inline-flex items-center gap-2 hover:text-neutral-950 transition-colors"
                  >
                    <MapPin className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                    <span className="underline-offset-4 hover:underline">{heroLocationLabel}</span>
                  </MarketingLink>
                ) : null}
                {heroLocationLabel && heroPhone ? (
                  <span className="text-neutral-500" aria-hidden="true">·</span>
                ) : null}
                {heroPhone ? (
                  <a
                    href={telHrefFromListedPhone(heroPhone)}
                    className="inline-flex items-center gap-2 hover:text-neutral-950 transition-colors"
                  >
                    <Phone className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                    <span>{heroPhone}</span>
                  </a>
                ) : null}
              </div>
            ) : null}
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
                  className="bg-white/40 border-neutral-900/30 text-neutral-900 hover:bg-white/70 hover:text-neutral-900 h-12 text-base"
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

      <section className="py-16 sm:py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">{t("servicesTitle")}</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">{t("servicesSub")}</p>
          </div>

          <HomeServicesBlock />
        </div>
      </section>

      {(packagesLoading || displayPackages.length > 0) && (
        <section className="py-14 sm:py-20 bg-accent">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">{t("packagesTitle")}</h2>
              <p className="text-muted-foreground text-lg">{t("packagesSub")}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {packagesLoading ? (
                <p className="text-center text-muted-foreground sm:col-span-2 lg:col-span-4 py-6">{t("loading")}</p>
              ) : (
                displayPackages.map((pkg) => {
                  const popular = pkg.id === "PKG-002";
                  const borderClass = popular ? "border-primary" : "border-border";
                  return (
                    <div
                      key={pkg.id}
                      className={`relative bg-card rounded-xl border ${borderClass} overflow-visible p-0 ${popular ? "shadow-lg" : "shadow-sm"} transition-shadow hover:shadow-lg flex flex-col h-full`}
                    >
                      {popular && (
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10">
                          <Badge className="bg-primary text-primary-foreground px-3 py-0.5 text-xs">{t("mostPopular")}</Badge>
                        </div>
                      )}
                      <PackagePromoImage src={pkg.imageUrl} alt={pkg.name} className="rounded-t-xl" compact />
                      <div className="p-4 flex flex-col flex-1 min-h-0">
                        <div className="mb-3">
                          <h3 className="font-semibold text-base text-foreground leading-snug line-clamp-2 mb-1.5" title={pkg.name}>
                            {pkg.name}
                          </h3>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold text-foreground">{pkg.price}</span>
                            <span className="text-sm text-muted-foreground">֏</span>
                          </div>
                          <p className="text-muted-foreground text-xs mt-0.5">
                            {pkg.lessons} {t("lessonTypePractical").toLowerCase()} · {pkg.theoryLessons}{" "}
                            {t("lessonTypeTheory").toLowerCase()}
                          </p>
                        </div>
                        {pkg.features.length > 0 ? (
                          <ul className="space-y-1.5 mb-4">
                            {pkg.features.map((f, j) => (
                              <li key={j} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                <CheckCircle2 className="w-3.5 h-3.5 mt-px text-primary shrink-0" />
                                {f}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        <div className="mt-auto">
                          <a href={panelHref("/register")}>
                            <Button
                              size="sm"
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

      {homeInstructors.length > 0 ? (
        <section className="py-14 sm:py-20 bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">{t("instructorsTitle")}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {homeInstructors.map((ins, i) => (
                <InstructorCard
                  key={i}
                  instructor={ins}
                  showBookButton={true}
                  imageObjectFit="cover"
                />
              ))}
            </div>
            {hasMoreInstructors ? (
              <div className="text-center mt-10">
                <MarketingLink href="/instructors">
                  <Button variant="outline" className="border-border">
                    {t("viewAll")} <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </MarketingLink>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {contactTabs.length > 0 ? (
        <section className="py-14 sm:py-20 bg-accent/40">
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
                      {activeContact.key === "address" ? (
                        <div>
                          <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                              <ActiveIcon className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground">{t("branches")}</h3>
                            <span className="ml-auto rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                              {branches.length}
                            </span>
                          </div>
                          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {branches.map((branch) => {
                              const city = cityNameById(cities, branch.cityId);
                              return (
                                <li key={branch.id}>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedBranch(branch)}
                                    disabled={!branch.mapUrl}
                                    className="group flex h-full w-full flex-col rounded-xl border border-border bg-background p-3.5 text-left transition-colors hover:border-primary/50 hover:bg-primary/5 disabled:cursor-default disabled:hover:border-border disabled:hover:bg-background"
                                  >
                                    {city ? (
                                      <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                                        {city}
                                      </span>
                                    ) : null}
                                    <span className="mt-0.5 text-sm font-semibold leading-snug text-foreground">
                                      {branch.name}
                                    </span>
                                    <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                      {branch.workHours ? (
                                        <span className="inline-flex items-center gap-1">
                                          <Clock className="w-3 h-3" aria-hidden="true" />
                                          {branch.workHours}
                                        </span>
                                      ) : null}
                                      {branch.phone ? (
                                        <span className="inline-flex items-center gap-1">
                                          <Phone className="w-3 h-3" aria-hidden="true" />
                                          {branch.phone}
                                        </span>
                                      ) : null}
                                    </span>
                                    {branch.mapUrl ? (
                                      <span className="mt-auto pt-2.5 inline-flex items-center gap-1 text-xs font-medium text-primary/80 group-hover:text-primary">
                                        <MapPin className="w-3 h-3" aria-hidden="true" />
                                        {t("branchViewOnMap")}
                                        <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                                      </span>
                                    ) : null}
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ) : (
                      <div className="flex items-start gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <ActiveIcon className="w-6 h-6" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-primary">{activeContact.label}</p>
                          <div className="mt-3 space-y-1">
                            {activeContact.lines.map((line, idx) => (
                              <p key={idx} className="text-foreground text-lg font-semibold leading-relaxed">
                                {line}
                              </p>
                            ))}
                          </div>

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
                      )}
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

      <Footer />
    </div>
  );
}
