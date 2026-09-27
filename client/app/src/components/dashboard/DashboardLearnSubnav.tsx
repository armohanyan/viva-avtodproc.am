import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { Bookmark, BookOpen, ClipboardCheck, GraduationCap, Signpost, type LucideIcon } from "lucide-react";
import { useLang } from "src/lib/i18n";
import { cn } from "src/lib/utils";

type ActiveTab = "exam" | "thematic" | "road-signs" | "saved" | "theme-exams";

export default function DashboardLearnSubnav({ active }: { active: ActiveTab }) {
  const { t } = useLang();
  const [location] = useLocation();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const examHref = location.startsWith("/dashboard/learn/") ? "/dashboard/learn/exam-tests" : "/dashboard/exam-tests";
  const tabs: { id: ActiveTab; href: string; label: string; icon: LucideIcon }[] = [
    { id: "road-signs", href: "/dashboard/learn/road-signs", label: t("dashboardLearnRoadSigns"), icon: Signpost },
    { id: "thematic", href: "/dashboard/learn/thematic-tests", label: t("dashboardLearnThematicTests"), icon: BookOpen },
    { id: "theme-exams", href: "/dashboard/learn/theme-exams", label: t("themeExamsNav"), icon: ClipboardCheck },
    { id: "exam", href: examHref, label: t("dashboardLearnExamTests"), icon: GraduationCap },
    { id: "saved", href: "/dashboard/learn/saved-questions", label: t("questionSavedListTitle"), icon: Bookmark },
  ];

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const update = () => {
      setCanScrollLeft(scroller.scrollLeft > 4);
      setCanScrollRight(scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 4);
    };
    update();
    const activeEl = scroller.querySelector<HTMLElement>("[data-active='true']");
    if (activeEl) {
      const delta =
        activeEl.offsetLeft - scroller.scrollLeft - (scroller.clientWidth - activeEl.offsetWidth) / 2;
      scroller.scrollLeft += delta;
      update();
    }
    scroller.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(scroller);
    return () => {
      scroller.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [active]);

  return (
    <nav aria-label={t("learn")} className="relative mb-6 sm:mb-8">
      <div
        ref={scrollerRef}
        role="tablist"
        className="flex overflow-x-auto overscroll-x-contain border-b border-border [scrollbar-width:none] snap-x snap-mandatory [&::-webkit-scrollbar]:hidden lg:snap-none"
      >
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              role="tab"
              aria-selected={isActive}
              data-active={isActive ? "true" : undefined}
              className={cn(
                "relative inline-flex shrink-0 snap-start items-center justify-center gap-2 px-3.5 py-3 text-sm font-medium whitespace-nowrap transition-colors",
                "min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "lg:min-w-0 lg:flex-1 lg:px-2",
                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className={cn("size-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} aria-hidden />
              <span>{tab.label}</span>
              <span
                className={cn(
                  "absolute inset-x-3 bottom-0 h-0.5 rounded-full lg:inset-x-4",
                  isActive ? "bg-primary" : "bg-transparent",
                )}
                aria-hidden
              />
            </Link>
          );
        })}
      </div>
      {canScrollLeft ? (
        <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-background to-transparent lg:hidden" aria-hidden />
      ) : null}
      {canScrollRight ? (
        <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-background to-transparent lg:hidden" aria-hidden />
      ) : null}
    </nav>
  );
}
