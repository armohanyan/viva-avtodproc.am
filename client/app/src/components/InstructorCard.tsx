import { Button } from "src/components/ui/button";
import { Badge } from "src/components/ui/badge";
import { Card } from "src/components/ui/card";
import { CountUpText } from "src/lib/motion";
import { useLang } from "src/lib/i18n";
import { useAppNavigation } from "src/lib/navigation/AppNavigationContext";
import { Star, CalendarDays, Car, Gauge } from "lucide-react";
import type { Instructor } from "src/data/instructors";

type Props = {
  instructor: Instructor;
  showBookButton?: boolean;
  /** Booking flow: show a select CTA instead of register; highlights when selected. */
  pickerMode?: boolean;
  isPicked?: boolean;
  onPick?: () => void;
  /** Theory 1:1 request flow: show send-request CTA instead of slot picker. */
  requestMode?: boolean;
  onRequest?: () => void;
  requestDisabled?: boolean;
  imageHeightClassName?: string;
  /** Tighter typography and spacing (e.g. horizontal picker strip). */
  compact?: boolean;
  className?: string;
};

export default function InstructorCard({
  instructor,
  showBookButton = false,
  pickerMode = false,
  isPicked = false,
  onPick,
  requestMode = false,
  onRequest,
  requestDisabled = false,
  imageHeightClassName,
  compact = false,
  className,
}: Props) {
  const { t } = useLang();
  const { panelHref } = useAppNavigation();
  const imgClass = imageHeightClassName ?? (compact ? "h-32" : "h-60");
  const frameBorder =
    pickerMode && isPicked
      ? "border-2 border-primary"
      : pickerMode
        ? "border-2 border-border"
        : "border border-border";

  return (
    <Card
      className={`rounded-2xl ${frameBorder} shadow-sm hover:shadow-lg transition-shadow overflow-hidden flex flex-col h-full min-h-0 p-0 gap-0 ${compact ? "rounded-xl" : ""} ${className ?? ""}`}
    >
      <div className={`${imgClass} bg-muted overflow-hidden shrink-0`}>
        <img
          src={instructor.imageSrc}
          alt={instructor.name}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>
      <div className={compact ? "p-3 flex flex-col flex-1 min-h-0" : "p-6"}>
        <div className={`flex items-start justify-between gap-2 ${compact ? "mb-2" : "mb-3"}`}>
          <div className="min-w-0 flex-1">
            <h3
              className={`font-bold text-foreground break-words ${compact ? "text-sm leading-snug" : "text-lg"}`}
            >
              {instructor.name}
            </h3>
            {(instructor.teachesPractical || instructor.teachesTheory) && (
              <div className={`flex flex-wrap gap-1 ${compact ? "mt-1" : "mt-2 gap-1.5"}`}>
                {instructor.teachesPractical && (
                  <Badge variant="secondary" className="text-[9px] font-medium px-1.5 py-0">
                    {t("instructorTeachingPractical")}
                  </Badge>
                )}
                {instructor.teachesTheory && (
                  <Badge variant="outline" className="text-[9px] font-medium px-1.5 py-0 border-primary/30 text-primary">
                    {t("instructorTeachingTheory")}
                  </Badge>
                )}
              </div>
            )}
          </div>
          <div className={`flex items-center gap-0.5 shrink-0 ${compact ? "mt-0" : "mt-0.5 gap-1"}`}>
            {Array.from({ length: 5 }).map((_, j) => (
              <Star
                key={j}
                className={`${compact ? "w-2.5 h-2.5" : "w-3.5 h-3.5"} ${
                  j < Math.floor(instructor.rating)
                    ? "text-primary fill-primary"
                    : "text-muted-foreground fill-muted-foreground"
                }`}
              />
            ))}
            <CountUpText
              value={instructor.rating}
              decimals={1}
              className={`text-muted-foreground ml-0.5 ${compact ? "text-[10px]" : "text-xs"}`}
            />
          </div>
        </div>

        <div
          className={`grid text-muted-foreground ${compact ? "grid-cols-1 gap-y-1 text-[11px] leading-snug" : "grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-sm mb-5"}`}
        >
          <div className="min-w-0 flex items-center gap-1.5">
            <span
              className={`shrink-0 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold ${compact ? "w-3.5 h-3.5 text-[8px]" : "w-4 h-4 text-[10px]"}`}
            >
              ֏
            </span>
            <span className="break-words">
              {t("lessonPrice")}: <CountUpText value={instructor.hourlyPrice} /> ֏ / {t("perHour")}
            </span>
          </div>
          {instructor.car && (
          <div className="min-w-0 flex items-center gap-1.5">
            <Car className={`text-primary shrink-0 ${compact ? "w-3 h-3" : "w-4 h-4"}`} />
            <span className="break-words">{instructor.car}</span>
          </div>
          )
          }

          {instructor.transmission && (
          <div className="flex items-center gap-1.5">
            <Gauge className={`text-primary shrink-0 ${compact ? "w-3 h-3" : "w-4 h-4"}`} />
            <span>{instructor.transmission}</span>
          </div>
          )
          }
          <div className={`flex items-center gap-1.5 ${compact ? "" : "col-span-2"}`}>
            <CalendarDays className={`text-primary shrink-0 ${compact ? "w-3 h-3" : "w-4 h-4"}`} />
            <span>
              <CountUpText value={instructor.years} /> {t("experience")}
            </span>
          </div>
        </div>

        {requestMode && onRequest ? (
          <div className={compact ? "mt-auto shrink-0 pt-2" : "mt-4"}>
            <Button
              type="button"
              className={`w-full bg-primary hover:bg-primary/90 text-primary-foreground ${compact ? "h-8 text-xs" : ""}`}
              size="sm"
              onClick={onRequest}
              disabled={requestDisabled}
            >
              {t("theoryPersonalSendRequest")}
            </Button>
          </div>
        ) : null}
        {pickerMode && onPick && !requestMode ? (
          <div className={compact ? "mt-auto shrink-0 pt-2" : "mt-4"}>
            <Button
              type="button"
              className={`w-full bg-primary hover:bg-primary/90 text-primary-foreground ${compact ? "h-8 text-xs" : ""}`}
              size="sm"
              onClick={onPick}
            >
              {t("instructorBookingCardCta")}
            </Button>
          </div>
        ) : null}
        {showBookButton && !pickerMode && !requestMode && (
          <div className="mt-4">
            <a href={panelHref("/register")}>
              <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" size="sm">
                {t("bookLesson")}
              </Button>
            </a>
          </div>
        )}
      </div>
    </Card>
  );
}
