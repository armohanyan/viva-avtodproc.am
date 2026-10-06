"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import type { ExamQuestion } from "src/data/examSampleQuestions";
import {
  BadgePlus,
  Ban,
  CarFront,
  CircleArrowRight,
  Diamond,
  Fuel,
  Info,
  Signpost,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { Card } from "src/components/ui/card";
import { visibleSignSlots } from "src/data/signCategories";
import { useLang } from "src/lib/i18n";
import { defaultExamQuestionMeta, loadExamQuestionMeta } from "src/lib/examQuestionMeta";
import { cn } from "src/lib/utils";
import { useExamQuizQuestionPool } from "src/modules/exam/useExamQuestionPacks";
import RoadSignCatalog from "src/components/exam/RoadSignCatalog";

type NavLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
};

type Props = {
  slotId: string;
  categoryHref: (slotId: string) => string;
  LinkComponent: ComponentType<NavLinkProps>;
  /** Public visitors can open only the first category. */
  locked?: boolean;
  showHeading?: boolean;
};

const CATEGORY_VISUAL: Record<string, { icon: LucideIcon; chip: string; badge: string }> = {
  "1": { icon: TriangleAlert, chip: "hover:border-amber-300", badge: "bg-amber-100 text-amber-700" },
  "2": { icon: Diamond, chip: "hover:border-yellow-300", badge: "bg-yellow-100 text-yellow-700" },
  "3": { icon: Ban, chip: "hover:border-red-300", badge: "bg-red-100 text-red-600" },
  "4": { icon: CircleArrowRight, chip: "hover:border-blue-300", badge: "bg-blue-100 text-blue-700" },
  "5": { icon: Signpost, chip: "hover:border-violet-300", badge: "bg-violet-100 text-violet-700" },
  "6": { icon: Info, chip: "hover:border-sky-300", badge: "bg-sky-100 text-sky-700" },
  "7": { icon: Fuel, chip: "hover:border-emerald-300", badge: "bg-emerald-100 text-emerald-700" },
  "8": { icon: BadgePlus, chip: "hover:border-orange-300", badge: "bg-orange-100 text-orange-700" },
  "9": { icon: CarFront, chip: "hover:border-slate-300", badge: "bg-slate-100 text-slate-700" },
};

export default function RoadSignsStudy({
  slotId,
  categoryHref,
  LinkComponent,
  locked = false,
  showHeading = true,
}: Props) {
  const { t } = useLang();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [titles, setTitles] = useState<string[]>(() => defaultExamQuestionMeta().signsCardTitles);
  const slots = visibleSignSlots();
  const slotOk = slots.includes(slotId);

  const { pool, loading } = useExamQuizQuestionPool({
    mode: slotOk && !locked ? "topics" : null,
    thematicTopicId: undefined,
    signCategoryTopicId: slotOk && !locked ? slotId : undefined,
    examTicketActive: false,
    examTicketMetaPending: false,
    examTicketQuestionIds: [],
  });

  useEffect(() => {
    let mounted = true;
    void loadExamQuestionMeta().then((meta) => {
      if (mounted) setTitles(meta.signsCardTitles);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const [shown, setShown] = useState<{ slotId: string; questions: readonly ExamQuestion[] } | null>(null);

  useEffect(() => {
    if (loading || locked || !slotOk) return;
    setShown({ slotId, questions: pool });
  }, [loading, locked, slotOk, slotId, pool]);

  const slotIndex = Number.parseInt(slotId, 10) - 1;
  const heading =
    (slotOk ? titles[slotIndex]?.trim() : "") || `${t("dashboardLearnRoadSigns")} ${slotOk ? slotId : "1"}`;

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !window.matchMedia("(max-width: 767px)").matches) return;
    const active = scroller.querySelector<HTMLElement>("[data-active='true']");
    if (!active) return;
    const left = active.getBoundingClientRect().left - scroller.getBoundingClientRect().left + scroller.scrollLeft;
    scroller.scrollTo({ left, behavior: "auto" });
  }, [slotId, titles]);

  return (
    <div className="min-w-0">
      <div
        ref={scrollerRef}
        className="-mx-1 mb-5 grid snap-x snap-mandatory grid-flow-col auto-cols-[calc((100%-0.5rem)/1.5)] gap-2 overflow-x-auto overscroll-x-contain px-1 pb-1 [scrollbar-width:none] md:mx-0 md:flex md:flex-wrap md:overflow-visible md:px-0 md:snap-none [&::-webkit-scrollbar]:hidden"
        aria-label={t("dashboardLearnRoadSigns")}
      >
        {slots.map((id) => {
          const index = Number.parseInt(id, 10) - 1;
          const label = titles[index]?.trim() || `${t("dashboardLearnRoadSigns")} ${id}`;
          const active = id === slotId;
          const visual = CATEGORY_VISUAL[id];
          const Icon = visual?.icon ?? Signpost;
          return (
            <div
              key={id}
              data-active={active ? "true" : undefined}
              className="min-w-0 snap-start md:w-auto md:shrink-0"
            >
            <LinkComponent
              href={categoryHref(id)}
              className={cn(
                "inline-flex h-full w-full items-center gap-2 rounded-2xl border px-2.5 py-2 text-left text-sm transition-all md:w-auto",
                active
                  ? "border-primary bg-primary/10 font-semibold text-foreground shadow-sm ring-2 ring-primary/20"
                  : cn(
                      "border-border bg-card font-medium text-foreground shadow-sm md:hover:-translate-y-0.5 md:hover:shadow-md",
                      visual?.chip,
                    ),
              )}
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-xl",
                  active ? "bg-primary text-primary-foreground" : visual?.badge ?? "bg-muted text-foreground",
                )}
              >
                <Icon className="size-3.5" aria-hidden />
              </span>
              <span className="leading-tight">{label}</span>
            </LinkComponent>
            </div>
          );
        })}
      </div>

      {showHeading ? <h2 className="mb-4 text-base font-semibold text-foreground">{heading}</h2> : null}

      {locked ? (
        <Card className="rounded-2xl border border-border p-5">
          <p className="text-sm text-muted-foreground">{t("roadSignLockedHint")}</p>
        </Card>
      ) : shown ? (
        shown.questions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("examQuizNoQuestions")}</p>
        ) : (
          <div aria-busy={loading || undefined}>
            <RoadSignCatalog key={shown.slotId} questions={shown.questions} />
          </div>
        )
      ) : (
        <div className="min-h-[calc(100dvh-12rem)]" aria-busy="true">
          <p className="text-sm text-muted-foreground">{t("examQuizLoading")}</p>
        </div>
      )}
    </div>
  );
}
