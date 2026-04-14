import { useLang } from "src/lib/i18n";
import { Card } from "src/components/ui/card";
import { Button } from "src/components/ui/button";
import DataTableToolbar from "src/components/DataTableToolbar";
import TableColumnFilter from "src/components/TableColumnFilter";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Reveal } from "src/lib/motion";
import { vivaApiJson } from "src/lib/vivaApi";
import type { AvailabilityBlock } from "src/modules/instructors/instructorAvailability";
import {
  isSlotBlockedByAvailabilityRules,
  isSlotInPastDate,
  normalizeAvailabilityBlocksFromApi,
} from "src/modules/instructors/instructorAvailability";

const timeSlots = [
  "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
];

export type InstructorCalendarOption = { id: string; name: string };

export type LessonBookingPayload = {
  instructorUserId: string;
  instructor: string;
  dateIso: string;
  time: string;
  studentLabel?: string;
};

type SlotStatus = "available" | "unavailable" | "mine";

function todayIsoLocal(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

/** Monday 00:00 local of the ISO week containing `from`. */
function startOfIsoWeekMonday(from: Date): Date {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export type InstructorBusySlot = { dateIso: string; time: string; studentUserId: string };

/** Five weekdays (Mon–Fri) starting Monday of current week + `weekOffset` weeks. */
function getWeekDays(weekOffset: number): Date[] {
  const monday = startOfIsoWeekMonday(new Date());
  monday.setDate(monday.getDate() + weekOffset * 7);
  return [0, 1, 2, 3, 4].map((i) => {
    const x = new Date(monday);
    x.setDate(monday.getDate() + i);
    return x;
  });
}

function fmt(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dayLabel(d: Date, locale: string) {
  return d.toLocaleDateString(locale, { weekday: "short" });
}

function localeFromLang(lang: "en" | "ru" | "am") {
  if (lang === "am") return "hy-AM";
  if (lang === "ru") return "ru-RU";
  return "en-US";
}

export type LessonBookingCalendarProps = {
  mode: "student" | "admin";
  instructors: readonly InstructorCalendarOption[];
  selectedInstructorId: string;
  onInstructorChange: (instructorUserId: string) => void;
  /** When set in student mode, “my” slots are resolved from `/bookings`. */
  studentUserId?: string;
  /** Required in admin mode to enable Confirm */
  studentName?: string;
  onBookingConfirmed?: (payload: LessonBookingPayload) => void;
};

export default function LessonBookingCalendar({
  mode,
  instructors,
  selectedInstructorId,
  onInstructorChange,
  studentUserId,
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
  const [availabilityBlocks, setAvailabilityBlocks] = useState<AvailabilityBlock[]>([]);
  const [busySlots, setBusySlots] = useState<InstructorBusySlot[]>([]);
  const [blocksLoading, setBlocksLoading] = useState(false);

  useEffect(() => {
    if (!selectedInstructorId) {
      setAvailabilityBlocks([]);
      setBusySlots([]);
      setBlocksLoading(false);
      return;
    }
    const week = getWeekDays(weekOffset);
    const from = fmt(week[0]);
    const to = fmt(week[4]);
    let cancelled = false;
    const run = async () => {
      setBlocksLoading(true);
      try {
        const busyQ = new URLSearchParams({ from, to }).toString();
        const [blocks, busy] = await Promise.all([
          vivaApiJson<AvailabilityBlock[]>(
            `/instructors/${encodeURIComponent(selectedInstructorId)}/availability-blocks`,
          ),
          vivaApiJson<InstructorBusySlot[]>(
            `/instructors/${encodeURIComponent(selectedInstructorId)}/busy-slots?${busyQ}`,
          ),
        ]);
        if (!cancelled) {
          setAvailabilityBlocks(normalizeAvailabilityBlocksFromApi(blocks));
          setBusySlots(Array.isArray(busy) ? busy : []);
        }
      } catch {
        if (!cancelled) {
          setAvailabilityBlocks([]);
          setBusySlots([]);
        }
      } finally {
        if (!cancelled) {
          setBlocksLoading(false);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [selectedInstructorId, weekOffset]);

  const days = useMemo(() => getWeekDays(weekOffset), [weekOffset]);

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

  const getStatus = useCallback(
    (time: string, dateIso: string): SlotStatus => {
      const today = todayIsoLocal();
      if (blocksLoading) return "unavailable";
      if (isSlotInPastDate(dateIso, today)) return "unavailable";
      const mySlot =
        mode === "student" &&
        studentUserId &&
        busySlots.some((b) => b.dateIso === dateIso && b.time === time && b.studentUserId === studentUserId);
      if (mySlot) return "mine";
      if (busySlots.some((b) => b.dateIso === dateIso && b.time === time)) return "unavailable";
      if (isSlotBlockedByAvailabilityRules(dateIso, time, availabilityBlocks)) return "unavailable";
      return "available";
    },
    [blocksLoading, mode, studentUserId, busySlots, availabilityBlocks],
  );

  const slotStyle = (status: SlotStatus, isSelected: boolean) => {
    if (isSelected) return "bg-primary text-primary-foreground border-primary";
    if (status === "mine") return "bg-primary/10 text-primary border-primary/20 cursor-default";
    if (status === "unavailable") return "bg-accent text-muted-foreground border-border cursor-not-allowed";
    return "bg-card text-muted-foreground border-border hover:border-primary/40 hover:bg-primary/10 cursor-pointer";
  };

  const canClick = (status: SlotStatus) => status === "available";

  const selectedInstructorName = useMemo(
    () => instructors.find((i) => i.id === selectedInstructorId)?.name ?? "",
    [instructors, selectedInstructorId],
  );

  const handleConfirm = () => {
    if (!selected || !selectedInstructorId) return;
    if (mode === "admin" && !studentName.trim()) return;
    setConfirmed(true);
    onBookingConfirmed?.({
      instructorUserId: selectedInstructorId,
      instructor: selectedInstructorName,
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
              {instructors.map((ins) => (
                <button
                  key={ins.id}
                  type="button"
                  onClick={() => onInstructorChange(ins.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    selectedInstructorId === ins.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {ins.name}
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

            {blocksLoading ? (
              <p className="text-xs text-muted-foreground mb-3">{t("instructorAvailabilityCalendarLoading")}</p>
            ) : null}

            <DataTableToolbar
              value={slotSearch}
              onChange={setSlotSearch}
              placeholder={`${t("filterByHour")}…`}
              className="border-t border-border bg-muted/20"
            />

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="text-left text-xs text-muted-foreground font-medium pr-4 py-2 w-16">
                      <div className="flex min-w-0 items-center gap-0.5">
                        <span className="truncate">{t("bookingGridTimeLabel")}</span>
                        <TableColumnFilter
                          value={periodFilter}
                          onChange={(v) => setPeriodFilter(v as "all" | "morning" | "afternoon")}
                          ariaLabel={t("filter")}
                          options={[
                            { value: "all", label: t("filterOptionAll") },
                            { value: "morning", label: t("bookingSlotFilterMorning") },
                            { value: "afternoon", label: t("bookingSlotFilterAfternoon") },
                          ]}
                          className="h-6 w-6"
                        />
                      </div>
                    </th>
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
                              aria-label={`${dateStr} ${time} ${status}`}
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
                              {status === "mine" ? t("mine") : status === "unavailable" ? "—" : ""}
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
                { color: "bg-accent border border-border", label: t("bookingSlotUnavailable") },
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
                    <span className="font-medium text-foreground text-xs">{selectedInstructorName}</span>
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
