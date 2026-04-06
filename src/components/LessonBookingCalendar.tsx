import { useLang } from "src/lib/i18n";
import { Card } from "src/components/ui/card";
import { Button } from "src/components/ui/button";
import DataTableToolbar from "src/components/DataTableToolbar";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Reveal } from "src/lib/motion";

const timeSlots = [
  "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
];

type SlotStatus = "available" | "booked" | "mine";

const slotData: Record<string, Record<string, SlotStatus>> = {
  "09:00": { "2026-03-28": "available", "2026-03-29": "booked", "2026-03-30": "available", "2026-03-31": "available", "2026-04-01": "mine" },
  "10:00": { "2026-03-28": "mine", "2026-03-29": "available", "2026-03-30": "booked", "2026-03-31": "available", "2026-04-01": "available" },
  "11:00": { "2026-03-28": "booked", "2026-03-29": "available", "2026-03-30": "available", "2026-03-31": "booked", "2026-04-01": "available" },
  "12:00": { "2026-03-28": "available", "2026-03-29": "booked", "2026-03-30": "mine", "2026-03-31": "available", "2026-04-01": "booked" },
  "13:00": { "2026-03-28": "available", "2026-03-29": "available", "2026-03-30": "available", "2026-03-31": "booked", "2026-04-01": "available" },
  "14:00": { "2026-03-28": "booked", "2026-03-29": "mine", "2026-03-30": "available", "2026-03-31": "available", "2026-04-01": "booked" },
  "15:00": { "2026-03-28": "available", "2026-03-29": "available", "2026-03-30": "booked", "2026-03-31": "available", "2026-04-01": "available" },
  "16:00": { "2026-03-28": "available", "2026-03-29": "booked", "2026-03-30": "available", "2026-03-31": "booked", "2026-04-01": "mine" },
  "17:00": { "2026-03-28": "booked", "2026-03-29": "available", "2026-03-30": "available", "2026-03-31": "available", "2026-04-01": "available" },
};

function getWeekDays(offset: number) {
  const base = new Date("2026-03-28");
  base.setDate(base.getDate() + offset * 5);
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    return d;
  });
}

function fmt(d: Date) {
  return d.toISOString().split("T")[0];
}

function dayLabel(d: Date, locale: string) {
  return d.toLocaleDateString(locale, { weekday: "short" });
}

function localeFromLang(lang: "en" | "ru" | "am") {
  if (lang === "am") return "hy-AM";
  if (lang === "ru") return "ru-RU";
  return "en-US";
}

export type LessonBookingPayload = {
  instructor: string;
  dateIso: string;
  time: string;
  studentLabel?: string;
};

export type LessonBookingCalendarProps = {
  mode: "student" | "admin";
  instructorNames: string[];
  selectedInstructor: string;
  onInstructorChange: (name: string) => void;
  /** Required in admin mode to enable Confirm */
  studentName?: string;
  onBookingConfirmed?: (payload: LessonBookingPayload) => void;
};

export default function LessonBookingCalendar({
  mode,
  instructorNames,
  selectedInstructor,
  onInstructorChange,
  studentName = "",
  onBookingConfirmed,
}: LessonBookingCalendarProps) {
  const { t, lang } = useLang();
  const locale = localeFromLang(lang);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selected, setSelected] = useState<{ date: string; time: string } | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [slotSearch, setSlotSearch] = useState("");
  const [periodFilter, setPeriodFilter] = useState<"all" | "morning" | "afternoon">("all");

  const days = getWeekDays(weekOffset);

  const visibleTimeSlots = useMemo(() => {
    return timeSlots.filter((time) => {
      const q = slotSearch.trim();
      if (q && !time.replace(":", "").toLowerCase().includes(q.toLowerCase()) && !time.toLowerCase().includes(q.toLowerCase())) {
        return false;
      }
      const hour = parseInt(time.split(":")[0], 10);
      if (periodFilter === "morning" && hour >= 12) return false;
      if (periodFilter === "afternoon" && hour < 12) return false;
      return true;
    });
  }, [slotSearch, periodFilter]);

  const getStatus = (time: string, date: string): SlotStatus => slotData[time]?.[date] || "available";

  const slotStyle = (status: SlotStatus, isSelected: boolean) => {
    if (isSelected) return "bg-primary text-primary-foreground border-primary";
    if (status === "mine") return "bg-primary/10 text-primary border-primary/20 cursor-default";
    if (status === "booked") return "bg-accent text-muted-foreground border-border cursor-not-allowed";
    return "bg-card text-muted-foreground border-border hover:border-primary/40 hover:bg-primary/10 cursor-pointer";
  };

  const canClick = (status: SlotStatus) => status === "available";

  const handleConfirm = () => {
    if (!selected) return;
    if (mode === "admin" && !studentName.trim()) return;
    setConfirmed(true);
    onBookingConfirmed?.({
      instructor: selectedInstructor,
      dateIso: selected.date,
      time: selected.time,
      ...(mode === "admin" ? { studentLabel: studentName.trim() } : {}),
    });
  };

  const resetBooking = () => {
    setSelected(null);
    setConfirmed(false);
  };

  const adminReady = mode === "admin" && !!studentName.trim();

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
      <div className="xl:col-span-3 space-y-6">
        <Reveal delay={0.06}>
          <Card className="p-5 border-border">
            <h3 className="font-semibold text-foreground mb-3">{t("selectInstructor")}</h3>
            <div className="flex flex-wrap gap-2">
              {instructorNames.map((ins) => (
                <button
                  key={ins}
                  type="button"
                  onClick={() => onInstructorChange(ins)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    selectedInstructor === ins
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {ins}
                </button>
              ))}
            </div>
          </Card>
        </Reveal>

        <Reveal delay={0.12}>
          <Card className="p-5 border-border">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
              <h3 className="font-semibold text-foreground">
                {t("selectDate")} · {t("selectTime")}
              </h3>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
                  disabled={weekOffset === 0}
                  className="w-8 h-8 rounded-lg border border-border/60 flex items-center justify-center text-muted-foreground hover:bg-accent disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium text-foreground">
                  {days[0].toLocaleDateString(locale, { month: "short", day: "numeric" })} –{" "}
                  {days[4].toLocaleDateString(locale, { month: "short", day: "numeric" })}
                </span>
                <button
                  type="button"
                  onClick={() => setWeekOffset((w) => w + 1)}
                  className="w-8 h-8 rounded-lg border border-border/60 flex items-center justify-center text-muted-foreground hover:bg-accent"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <DataTableToolbar
              value={slotSearch}
              onChange={setSlotSearch}
              placeholder={`${t("filterByHour")}…`}
              className="border-t border-border bg-muted/20"
            >
              <div className="flex flex-wrap gap-2">
                {(["all", "morning", "afternoon"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriodFilter(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      periodFilter === p ? "bg-primary text-primary-foreground border-primary" : "border-input text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {p === "all" ? t("bookingSlotFilterAll") : p === "morning" ? t("bookingSlotFilterMorning") : t("bookingSlotFilterAfternoon")}
                  </button>
                ))}
              </div>
            </DataTableToolbar>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="text-left text-xs text-muted-foreground font-medium pr-4 py-2 w-16">{t("bookingGridTimeLabel")}</th>
                    {days.map((d, i) => (
                      <th key={i} className="text-center py-2 px-1">
                        <div className="text-xs text-muted-foreground font-medium">{dayLabel(d, locale)}</div>
                        <div className="text-sm font-semibold text-foreground">{d.getDate()}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleTimeSlots.map((time) => (
                    <tr key={time} className="border-t border-border/50">
                      <td className="text-xs text-muted-foreground pr-4 py-1.5 font-medium">{time}</td>
                      {days.map((d, j) => {
                        const dateStr = fmt(d);
                        const status = getStatus(time, dateStr);
                        const isSelected = selected?.date === dateStr && selected?.time === time;
                        return (
                          <td key={j} className="py-1 px-1">
                            <div
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  if (canClick(status)) {
                                    setSelected({ date: dateStr, time });
                                    setConfirmed(false);
                                  }
                                }
                              }}
                              onClick={() => {
                                if (canClick(status)) {
                                  setSelected({ date: dateStr, time });
                                  setConfirmed(false);
                                }
                              }}
                              className={`h-8 rounded-md border text-xs text-center flex items-center justify-center transition-colors ${slotStyle(status, isSelected)}`}
                            >
                              {status === "mine" ? t("mine") : status === "booked" ? "—" : ""}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
              {[
                { color: "bg-card border border-border", label: t("available") },
                ...(mode === "student"
                  ? [{ color: "bg-primary/10 border border-primary/20", label: t("myBooking") }]
                  : []),
                { color: "bg-accent border border-border", label: t("booked") },
                { color: "bg-primary", label: t("selected") },
              ].map((l, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className={`w-4 h-4 rounded ${l.color}`} />
                  <span className="text-xs text-muted-foreground">{l.label}</span>
                </div>
              ))}
            </div>
          </Card>
        </Reveal>
      </div>

      <div>
        <Reveal delay={0.18}>
          <Card className="p-5 border-border sticky top-6">
            <h3 className="font-semibold text-foreground mb-4">{t("bookingSummaryTitle")}</h3>
            {!selected ? (
              <p className="text-sm text-muted-foreground">{t("bookingSelectSlotHint")}</p>
            ) : confirmed ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="font-semibold text-foreground text-sm">{t("bookingConfirmed")}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {selected.date} {t("bookingAt")} {selected.time}
                </p>
                <Button variant="outline" size="sm" className="mt-4 w-full text-xs" onClick={resetBooking}>
                  {t("bookAnother")}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {mode === "admin" && studentName.trim() && (
                  <div className="flex justify-between text-sm gap-2">
                    <span className="text-muted-foreground shrink-0">{t("bookingColStudent")}</span>
                    <span className="font-medium text-foreground text-xs text-right">{studentName.trim()}</span>
                  </div>
                )}
                <div className="bg-accent rounded-lg p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("bookingInstructorLabel")}</span>
                    <span className="font-medium text-foreground text-xs">{selectedInstructor}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("bookingDateLabel")}</span>
                    <span className="font-medium text-foreground text-xs">{selected.date}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("bookingTimeLabel")}</span>
                    <span className="font-medium text-foreground text-xs">{selected.time}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("bookingDurationLabel")}</span>
                    <span className="font-medium text-foreground text-xs">{t("bookingDurationMinutes")}</span>
                  </div>
                </div>
                <Button
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50"
                  disabled={mode === "admin" && !adminReady}
                  onClick={handleConfirm}
                >
                  {t("confirmBooking")}
                </Button>
                {mode === "admin" && !studentName.trim() && (
                  <p className="text-xs text-amber-600 dark:text-amber-500">{t("adminLearnPickStudentHint")}</p>
                )}
                <Button variant="ghost" size="sm" className="w-full text-muted-foreground text-xs" onClick={() => setSelected(null)}>
                  {t("clearSelectionLabel")}
                </Button>
              </div>
            )}
          </Card>
        </Reveal>
      </div>
    </div>
  );
}
