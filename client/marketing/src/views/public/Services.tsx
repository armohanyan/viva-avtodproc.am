"use client";

import Navbar from "src/components/Navbar";
import Footer from "src/components/Footer";
import { useLang } from "src/lib/i18n";
import { Car, BookOpen, CheckCircle2, ChevronDown } from "lucide-react";
import { Button } from "src/components/ui/button";
import { Reveal } from "src/lib/motion";
import { useAppNavigation } from "src/lib/navigation/AppNavigationContext";
import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "src/lib/utils";

export type ServiceItem = {
  icon: LucideIcon;
  title: string;
  desc: string;
  color: string;
  bg: string;
  border: string;
  details: string[];
};

function useMarketingServices(): ServiceItem[] {
  const { t } = useLang();
  return useMemo(
    () => [
      {
        icon: Car,
        title: t("practicalLessons"),
        desc: t("practicalDesc"),
        color: "text-primary",
        bg: "bg-primary/10",
        border: "border-primary/20",
        details: [
          t("servicesCardPracticalDetail1"),
          t("servicesCardPracticalDetail2"),
          t("servicesCardPracticalDetail3"),
          t("servicesCardPracticalDetail4"),
        ],
      },
      {
        icon: BookOpen,
        title: t("theoryGroupCourses"),
        desc: t("theoryDesc"),
        color: "text-primary",
        bg: "bg-primary/10",
        border: "border-primary/20",
        details: [
          t("servicesCardTheoryDetail1"),
          t("servicesCardTheoryDetail2"),
          t("servicesCardTheoryDetail3"),
          t("servicesCardTheoryDetail4"),
        ],
      },
      {
        icon: BookOpen,
        title: t("theoryIndividualCourses"),
        desc: t("theoryDesc"),
        color: "text-primary",
        bg: "bg-primary/10",
        border: "border-primary/20",
        details: [
          t("servicesCardTheoryDetail1"),
          t("servicesCardTheoryDetail2"),
          t("servicesCardTheoryDetail3"),
          t("servicesCardTheoryDetail4"),
        ],
      },
    ],
    [t],
  );
}

function ServiceCardBody({
  s,
  heading,
  density,
}: {
  s: ServiceItem;
  heading: "h2" | "h3";
  density: "comfortable" | "compact";
}) {
  const { t } = useLang();
  const { MarketingLink } = useAppNavigation();
  const TitleTag = heading;
  const padding = density === "comfortable" ? "p-6 sm:p-8 md:p-10" : "p-5 sm:p-6 md:p-8";
  const titleClass =
    heading === "h2"
      ? "text-2xl font-bold text-foreground mb-3"
      : "text-xl sm:text-2xl font-bold text-foreground mb-2 sm:mb-3";
  const iconWrap = density === "compact" ? "w-12 h-12 mb-4" : "w-14 h-14 mb-5";
  const iconSize = density === "compact" ? "w-6 h-6" : "w-7 h-7";
  const detailsGrid =
    density === "compact"
      ? "grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3"
      : "grid grid-cols-1 sm:grid-cols-2 gap-3";
  const innerPad = density === "compact" ? "p-4 sm:p-5" : "p-6";

  return (
    <div className={padding}>
      <div className="flex flex-col md:flex-row gap-6 md:gap-8">
        <div className="md:w-1/3 shrink-0">
          <div className={`${iconWrap} ${s.bg} rounded-2xl flex items-center justify-center`}>
            <s.icon className={`${iconSize} ${s.color}`} />
          </div>
          <TitleTag className={titleClass}>{s.title}</TitleTag>
          <p className="text-muted-foreground leading-relaxed">{s.desc}</p>
        </div>
        <div className="md:w-2/3 min-w-0">
          <div className={`${s.bg} rounded-xl ${innerPad}`}>
            <h4 className="font-semibold text-foreground mb-4">{t("servicesIncludedTitle")}</h4>
            <ul className={detailsGrid}>
              {s.details.map((d, j) => (
                <li key={j} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className={`w-4 h-4 ${s.color} shrink-0`} />
                  {d}
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <MarketingLink href="/packages">
                <Button
                  className={`w-full sm:w-auto ${s.bg} ${s.color} border border-current/50 hover:opacity-80`}
                  variant="outline"
                >
                  {t("servicesViewPackagesCta")}
                </Button>
              </MarketingLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Home page: low vertical footprint on mobile (accordion); md+ uses a 3-column compact grid. */
export function HomeServicesBlock() {
  const { t } = useLang();
  const { MarketingLink } = useAppNavigation();
  const services = useMarketingServices();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (i: number) => setOpenIndex((prev) => (prev === i ? null : i));

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="space-y-2 md:hidden">
        {services.map((s, i) => {
          const open = openIndex === i;
          return (
            <div key={i} className={cn("rounded-2xl border bg-card shadow-sm", s.border)}>
              <button
                type="button"
                onClick={() => toggle(i)}
                className="flex w-full items-start gap-3 p-4 text-left touch-manipulation"
                aria-expanded={open}
              >
                <div
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                    s.bg,
                  )}
                >
                  <s.icon className={cn("h-5 w-5", s.color)} />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <h3 className="font-semibold text-foreground leading-snug">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground leading-snug line-clamp-2">{s.desc}</p>
                </div>
                <ChevronDown
                  className={cn(
                    "mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200",
                    open && "rotate-180",
                  )}
                  aria-hidden
                />
              </button>
              {open ? (
                <div className="border-t border-border/70 px-4 pb-4 pt-1">
                  <div className={cn("rounded-xl p-4", s.bg)}>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground/90">
                      {t("servicesIncludedTitle")}
                    </p>
                    <ul className="space-y-2.5">
                      {s.details.map((d, j) => (
                        <li key={j} className="flex gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className={cn("mt-0.5 h-4 w-4 shrink-0", s.color)} />
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4">
                      <MarketingLink href="/packages" className="block">
                        <Button
                          className={cn(
                            "w-full min-h-11 touch-manipulation",
                            s.bg,
                            s.color,
                            "border border-current/50 hover:opacity-90",
                          )}
                          variant="outline"
                          size="sm"
                        >
                          {t("servicesViewPackagesCta")}
                        </Button>
                      </MarketingLink>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="hidden md:grid md:grid-cols-3 md:gap-5 lg:gap-6">
        {services.map((s, i) => (
          <div
            key={i}
            className={cn(
              "flex h-full flex-col rounded-2xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md",
              s.border,
            )}
          >
            <div className={cn("mb-4 flex h-12 w-12 items-center justify-center rounded-xl", s.bg)}>
              <s.icon className={cn("h-6 w-6", s.color)} />
            </div>
            <h3 className="font-semibold text-foreground leading-snug">{s.title}</h3>
            <p className="mt-2 flex-1 text-sm text-muted-foreground leading-relaxed line-clamp-4">{s.desc}</p>
            <ul className="mt-4 space-y-2 border-t border-border/60 pt-4">
              {s.details.map((d, j) => (
                <li key={j} className="flex gap-2 text-xs text-muted-foreground leading-snug">
                  <CheckCircle2 className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", s.color)} />
                  <span>{d}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5">
              <MarketingLink href="/packages" className="block">
                <Button
                  className={cn(
                    "w-full min-h-10 text-xs sm:text-sm",
                    s.bg,
                    s.color,
                    "border border-current/50 hover:opacity-90",
                  )}
                  variant="outline"
                  size="sm"
                >
                  {t("servicesViewPackagesCta")}
                </Button>
              </MarketingLink>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 text-center">
        <MarketingLink
          href="/services"
          className="text-sm font-medium text-primary underline-offset-4 hover:underline touch-manipulation py-1 inline-block"
        >
          {t("servicesPageLinkCta")}
        </MarketingLink>
      </div>
    </div>
  );
}

export function ServicesDetailCards() {
  const services = useMarketingServices();

  return (
    <div className="space-y-10">
      {services.map((s, i) => (
        <Reveal
          key={i}
          className={`mx-auto w-full max-w-5xl bg-card rounded-2xl border ${s.border} shadow-sm overflow-hidden`}
          delay={i * 0.06}
        >
          <ServiceCardBody s={s} heading="h2" density="comfortable" />
        </Reveal>
      ))}
    </div>
  );
}

export default function Services() {
  const { t } = useLang();

  return (
    <div className="min-h-screen">
      <Navbar />

      <section className="bg-hero text-hero-foreground py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-primary font-semibold text-sm uppercase tracking-wider mb-3">
              {t("servicesEyebrow")}
            </p>
            <h1 className="text-4xl sm:text-5xl font-bold mb-6">{t("servicesTitle")}</h1>
            <p className="text-hero-foreground/80 text-lg">{t("servicesSub")}</p>
          </div>
        </div>
      </section>

      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ServicesDetailCards />
        </div>
      </section>

      <Footer />
    </div>
  );
}
