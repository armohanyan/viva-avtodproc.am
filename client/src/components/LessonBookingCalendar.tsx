import { useLang } from "src/lib/i18n";
import { Card } from "src/components/ui/card";
import { Button } from "src/components/ui/button";
import DataTableToolbar from "src/components/DataTableToolbar";
import TableColumnFilter from "src/components/TableColumnFilter";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Reveal } from "src/lib/motion";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { useToast } from "src/lib/toast";
import type { Instructor } from "src/data/instructors";
import InstructorCard from "src/components/InstructorCard";
import type { AvailabilityBlock } from "src/modules/instructors/instructorAvailability";
import {
  isSlotBlockedByAvailabilityRules,
  isSlotInPastDate,
  normalizeAvailabilityBlocksFromApi,
} from "src/modules/instructors/instructorAvailability";

const timeSlots = [
  "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
];

export type LessonBookingPayload = {
  instructorUserId: string;
  instructor: string;
  dateIso: string;
  /** First hour (same as legacy single-slot `time`). */
  time: string;
  /** All selected hour starts, sorted. */
  times: string[];
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

/** Full week Mon–Sun starting Monday of current week + `weekOffset` weeks. */
function getWeekDays(weekOffset: number): Date[] {
  const monday = startOfIsoWeekMonday(new Date());
  monday.setDate(monday.getDate() + weekOffset * 7);
  return Array.from({ length: 7 }, (_, i) => {
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

function padSlot(t: string): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(t.trim());
  if (!m) return t;
  return `${String(Number(m[1])).padStart(2, "0")}:${String(Number(m[2])).padStart(2, "0")}`;
}

function sortTimesUnique(times: readonly string[]): string[] {
  const set = new Set(times.map((x) => padSlot(x)));
  return [...set].sort((a, b) => a.localeCompare(b));
}

/** True if sorted times are each on the hour and consecutive. */
function isConsecutiveHourlySlots(sorted: string[]): boolean {
  if (sorted.length === 0) return false;
  for (const t of sorted) {
    if (!/^\d{2}:\d{2}$/.test(t) || !t.endsWith(":00")) return false;
  }
  for (let i = 1; i < sorted.length; i++) {
    const prev = Number(sorted[i - 1].slice(0, 2)) * 60 + Number(sorted[i - 1].slice(3, 5));
    const cur = Number(sorted[i].slice(0, 2)) * 60 + Number(sorted[i].slice(3, 5));
    if (cur !== prev + 60) return false;
  }
  return true;
}

export type LessonBookingCalendarProps = {
  mode: "student" | "admin";
  instructors: readonly Instructor[];
  selectedInstructorId: string;
  onInstructorChange: (instructorUserId: string) => void;
  /** When set in student mode, “my” slots are resolved from `/bookings`. */
  studentUserId?: string;
  /** Required for student mode API (`POST /bookings`) — use one branch id (e.g. first selected). */
  branchId?: string;
  /** Required in admin mode to enable Confirm */
  studentName?: string;
  onBookingConfirmed?: (payload: LessonBookingPayload) => void;
  /** When false, instructor is fixed by parent (e.g. theory cohort teacher). Default true. */
  showInstructorPicker?: boolean;
  /** Student dashboard: marketing-style instructor cards; admin keeps compact chips by default. */
  instructorPickerVariant?: "chips" | "cards";
};

export default function LessonBookingCalendar({
  mode,
  instructors,
  selectedInstructorId,
  onInstructorChange,
  studentUserId,
  branchId = "",
  studentName = "",
  onBookingConfirmed,
  showInstructorPicker = true,
  instructorPickerVariant = "chips",
}: LessonBookingCalendarProps) {
  const { t, lang } = useLang();
  const { showToast } = useToast();
  const locale = localeFromLang(lang);
  const [weekOffset, setWeekOffset] = useState(0);
  /** Multiple hour starts on the same calendar date. */
  const [selected, setSelected] = useState<{ date: string; times: string[] } | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdSummary, setCreatedSummary] = useState<{ totalPriceAmd: number; slots: string[] } | null>(null);
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
    const to = fmt(week[6]);
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

  useEffect(() => {
    setSelected(null);
    setConfirmed(false);
    setCreatedSummary(null);
  }, [selectedInstructorId]);

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
        busySlots.some(
          (b) => b.dateIso === dateIso && padSlot(b.time) === padSlot(time) && String(b.studentUserId) === studentUserId,
        );
      if (mySlot) return "mine";
      if (busySlots.some((b) => b.dateIso === dateIso && padSlot(b.time) === padSlot(time))) return "unavailable";
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

  const selectedInstructorRecord = useMemo(
    () => instructors.find((i) => i.id === selectedInstructorId),
    [instructors, selectedInstructorId],
  );

  /** One grid slot = one hour; price matches instructor card hourly rate. */
  const estimatedTotalAmd = useMemo(() => {
    if (!selected?.times.length || !selectedInstructorRecord) return null;
    const rate = selectedInstructorRecord.hourlyPrice;
    if (!Number.isFinite(rate) || rate < 0) return null;
    return Math.round(rate * selected.times.length);
  }, [selected, selectedInstructorRecord]);

  const toggleSlotSelection = (dateStr: string, time: string, status: SlotStatus) => {
    if (!canClick(status)) return;
    const slot = padSlot(time);
    setConfirmed(false);
    setCreatedSummary(null);
    setSelected((prev) => {
      if (!prev || prev.date !== dateStr) {
        return { date: dateStr, times: [slot] };
      }
      const has = prev.times.some((x) => padSlot(x) === slot);
      const nextTimes = has ? prev.times.filter((x) => padSlot(x) !== slot) : [...prev.times, slot];
      const sorted = sortTimesUnique(nextTimes);
      if (sorted.length === 0) return null;
      return { date: dateStr, times: sorted };
    });
  };

  const handleConfirm = async () => {
    if (!selected || !selectedInstructorId) return;
    if (mode === "admin" && !studentName.trim()) return;

    const sorted = sortTimesUnique(selected.times);
    if (!isConsecutiveHourlySlots(sorted)) {
      showToast(t("bookingSlotsMustBeConsecutive"), "error");
      return;
    }

    if (mode === "student") {
      if (!studentUserId) {
        showToast(t("bookingStudentAuthRequired"), "error");
        return;
      }
      if (!branchId.trim()) {
        showToast(t("bookingBranchRequired"), "error");
        return;
      }
      setSubmitting(true);
      try {
        const res = await vivaApiJson<{
          totalPriceAmd: number;
          slots: string[];
          startTime: string;
          status: string;
        }>("/bookings", {
          method: "POST",
          body: {
            instructorId: Number(selectedInstructorId),
            date: selected.date,
            slots: sorted,
            branchId: Number(branchId),
          },
        });
        setCreatedSummary({ totalPriceAmd: res.totalPriceAmd, slots: res.slots ?? sorted });
        setConfirmed(true);
        showToast(t("bookingCreatedToast"), "success");
      } catch (e) {
        showToast(getApiErrorMessage(e), "error");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    setConfirmed(true);
    onBookingConfirmed?.({
      instructorUserId: selectedInstructorId,
      instructor: selectedInstructorName,
      dateIso: selected.date,
      time: sorted[0],
      times: sorted,
      studentLabel: studentName.trim(),
    });
  };

  const resetBooking = () => {
    setSelected(null);
    setConfirmed(false);
    setCreatedSummary(null);
  };

  const adminReady = mode === "admin" && !!studentName.trim();

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 xl:items-stretch">
      <div className="xl:col-span-3 space-y-6 min-w-0">
        {showInstructorPicker ? (
          <Reveal delay={0.06}>
            <Card
              className={
                instructorPickerVariant === "cards"
                  ? "p-3 sm:p-4 border-border overflow-hidden"
                  : "p-5 border-border"
              }
            >
              <h3
                className={
                  instructorPickerVariant === "cards"
                    ? "text-sm font-semibold text-foreground mb-2"
                    : "font-semibold text-foreground mb-3"
                }
              >
                {t("selectInstructor")}
              </h3>
              {instructorPickerVariant === "cards" ? (
                <div className="flex items-stretch gap-3 overflow-x-auto overscroll-x-contain pb-1 pt-0.5 snap-x snap-mandatory scroll-smooth [-webkit-overflow-scrolling:touch]">
                  {instructors.map((ins) => (
                    <div
                      key={ins.id}
                      className="snap-start shrink-0 w-[min(13.75rem,calc(100vw-4rem))] sm:w-52 flex flex-col self-stretch min-h-0"
                    >
                      <InstructorCard
                        instructor={ins}
                        pickerMode
                        compact
                        isPicked={selectedInstructorId === ins.id}
                        onPick={() => onInstructorChange(ins.id)}
                      />
                    </div>
                  ))}
                </div>
              ) : (
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
              )}
            </Card>
          </Reveal>
        ) : null}

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
                  {days[6].toLocaleDateString(locale, { month: "short", day: "numeric" })}
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
                        const isSelected =
                          selected?.date === dateStr && selected.times.some((x) => padSlot(x) === padSlot(time));
                        return (
                          <td key={j} className="py-1 px-1">
                            <div
                              role="button"
                              tabIndex={0}
                              aria-label={`${dateStr} ${time} ${status}`}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  toggleSlotSelection(dateStr, time, status);
                                }
                              }}
                              onClick={() => toggleSlotSelection(dateStr, time, status)}
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

      <div className="min-h-0 xl:h-full xl:min-h-0 flex flex-col">
        <Reveal delay={0.18} className="xl:h-full xl:min-h-0 flex flex-col">
          <Card className="p-5 border-border xl:sticky xl:top-4 xl:z-10 xl:self-start w-full">
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
                  {selected.date} · {sortTimesUnique(selected.times).join(", ")}
                </p>
                {createdSummary ? (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("bookingTotalLabel")}: {createdSummary.totalPriceAmd.toLocaleString(locale)} ֏
                  </p>
                ) : null}
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
                    <span className="font-medium text-foreground text-xs text-right">
                      {sortTimesUnique(selected.times).join(", ")}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("bookingDurationLabel")}</span>
                    <span className="font-medium text-foreground text-xs">
                      {selected.times.length} {t("bookingHoursUnit")}
                    </span>
                  </div>
                  {estimatedTotalAmd != null && selectedInstructorRecord ? (
                    <>
                      <div className="flex justify-between text-sm gap-2 border-t border-border/60 pt-2 mt-1">
                        <span className="text-muted-foreground shrink-0">{t("lessonPrice")}</span>
                        <span className="font-medium text-foreground text-xs text-right tabular-nums">
                          {Math.round(selectedInstructorRecord.hourlyPrice).toLocaleString(locale)} ֏ / {t("perHour")}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm gap-2">
                        <span className="text-muted-foreground shrink-0">{t("bookingTotalLabel")}</span>
                        <span className="font-semibold text-foreground text-sm tabular-nums">
                          {estimatedTotalAmd.toLocaleString(locale)} ֏
                        </span>
                      </div>
                    </>
                  ) : null}
                </div>
                <Button
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50"
                  disabled={(mode === "admin" && !adminReady) || submitting}
                  onClick={() => void handleConfirm()}
                >
                  {submitting ? t("loading") : t("confirmBooking")}
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
