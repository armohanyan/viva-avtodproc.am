import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { AppModal } from "src/components/AppModal";
import { Button } from "src/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "src/components/ui/tooltip";
import type { Instructor } from "src/data/instructors";
import { useLang } from "src/lib/i18n";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { cn } from "src/lib/utils";
import { useAdminBranchFilter } from "src/modules/admin/AdminBranchFilterProvider";
import {
  armenianWeekdayShort,
  buildInstructorBranchColumns,
  formatGridDateLabel,
  padSlotTime,
} from "src/modules/admin/booking/adminAvailabilityGrid";
import { useBranches } from "src/modules/branches";
import { usePracticalSlotPlan } from "src/modules/booking/usePracticalSlotPlan";
import {
  DEFAULT_PRACTICAL_SLOT_PLAN,
  bookableTimesFromPlan,
  normalizePracticalSlotPlan,
  practicalSlotRangeMinutesFromBookable,
  type PracticalSlotPlanRow,
} from "src/modules/booking/practical-slot-plan";
import { parseTimeToMinutes } from "src/modules/booking/booking-slot.util";
import {
  isSlotBlockedByAvailabilityRules,
  normalizeAvailabilityBlocksFromApi,
  slotRangeOverlapsLunch,
  type AvailabilityBlock,
} from "src/modules/instructors/instructorAvailability";

export type DrivingDayCellBooking = {
  bookingId: number;
  studentName: string;
  studentPhone: string | null;
  paymentNotes: string | null;
  paymentStatus: "paid" | "free" | "pending" | "not_required";
  instructorId: number | null;
  instructorName: string;
  time: string;
};

type ClassScheduleItem = {
  bookingId: number;
  lessonType: string;
  date: string;
  startTime: string;
  endTime?: string;
  student: { name: string; phone: string | null; phone2: string | null };
  instructor: { id: number | null; name: string };
  branch: { id: number; name: string };
  payment: { status: "paid" | "free" | "pending" | "not_required" };
  paymentNotes?: string | null;
};

type ClassScheduleResponse = {
  items: ClassScheduleItem[];
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dateIso: string;
  instructors: readonly Instructor[];
  /** Bumped by parent after create/edit/delete so the day grid reloads. */
  reloadKey?: number;
  onEmptyCellClick: (target: {
    instructor: Instructor;
    branchId: string;
    dateIso: string;
    time: string;
    /** Off-plan time such as lunch — use custom slot booking. */
    customSlot?: boolean;
    /** Exclusive end for a custom slot (typically the next plan time, e.g. 15:00 after 14:00). */
    customSlotEndTime?: string;
  }) => void;
  /** Admin custom slot (e.g. during lunch) — opens booking with free-form time. */
  onAddCustomSlotClick: (target: {
    instructor: Instructor;
    branchId: string;
    dateIso: string;
  }) => void;
  onBookingCellClick: (target: { bookingId: number; dateIso: string; time: string }) => void;
};

function padPlanRow(row: PracticalSlotPlanRow): PracticalSlotPlanRow {
  if (row.time == null || row.time === "") return { time: null };
  return { time: padSlotTime(row.time) };
}

/** One 14:00 row in the 13:20–15:00 lunch gap so admin can book that hour. Never duplicate. */
function ensureLunchBreakRow(rows: readonly PracticalSlotPlanRow[]): PracticalSlotPlanRow[] {
  const padded = rows.map(padPlanRow);
  const times = padded.map((r) => r.time).filter((t): t is string => Boolean(t));
  const set = new Set(times);
  const hasGap = set.has("13:20") && set.has("15:00");
  const out: PracticalSlotPlanRow[] = [];
  const seenTimed = new Set<string>();
  let lunchInserted = !hasGap || set.has("14:00");
  for (const r of padded) {
    if (r.time == null || r.time === "") {
      if (!lunchInserted) {
        out.push({ time: "14:00" });
        seenTimed.add("14:00");
        lunchInserted = true;
      } else if (!set.has("14:00") && !hasGap) {
        out.push({ time: null });
      }
      continue;
    }
    if (seenTimed.has(r.time)) continue;
    seenTimed.add(r.time);
    out.push({ time: r.time });
    if (!lunchInserted && r.time === "13:20") {
      out.push({ time: "14:00" });
      seenTimed.add("14:00");
      lunchInserted = true;
    }
  }
  return out;
}

function nextTimedAfter(rows: readonly PracticalSlotPlanRow[], time: string): string | undefined {
  const start = padSlotTime(time);
  const idx = rows.findIndex((r) => r.time != null && r.time !== "" && padSlotTime(r.time) === start);
  if (idx < 0) return undefined;
  for (let i = idx + 1; i < rows.length; i++) {
    const t = rows[i]?.time;
    if (t) return padSlotTime(t);
  }
  return undefined;
}

function mergeOrphanTimes(
  planRows: readonly PracticalSlotPlanRow[],
  orphanTimes: readonly string[],
): PracticalSlotPlanRow[] {
  const known = new Set(
    planRows.map((r) => (r.time ? padSlotTime(r.time) : "")).filter(Boolean),
  );
  const extras = [
    ...new Set(orphanTimes.map(padSlotTime).filter((t) => t && !known.has(t))),
  ].sort((a, b) => parseTimeToMinutes(a) - parseTimeToMinutes(b));

  const timed: { time: string; mins: number }[] = [];
  const seenTimed = new Set<string>();
  let hadBreak = false;
  for (const r of planRows) {
    if (r.time == null || r.time === "") {
      hadBreak = true;
      continue;
    }
    const t = padSlotTime(r.time);
    if (seenTimed.has(t)) continue;
    seenTimed.add(t);
    timed.push({ time: t, mins: parseTimeToMinutes(t) });
  }
  for (const t of extras) {
    if (seenTimed.has(t)) continue;
    seenTimed.add(t);
    timed.push({ time: t, mins: parseTimeToMinutes(t) });
  }
  timed.sort((a, b) => a.mins - b.mins);

  const out: PracticalSlotPlanRow[] = [];
  let breakInserted = !hadBreak;
  for (const row of timed) {
    out.push({ time: row.time });
    if (!breakInserted && row.time === "13:20" && !seenTimed.has("14:00")) {
      out.push({ time: null });
      breakInserted = true;
    }
  }
  return out;
}

function paymentCellClass(status: DrivingDayCellBooking["paymentStatus"]): string {
  if (status === "paid" || status === "free" || status === "not_required") {
    return "bg-emerald-600 text-white hover:bg-emerald-500";
  }
  return "bg-red-600 text-white hover:bg-red-500";
}

function DrivingDayLegend() {
  const { t } = useLang();
  return (
    <ul className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] sm:text-xs text-muted-foreground">
      <li className="flex items-center gap-1.5">
        <span className="inline-block h-3.5 w-5 shrink-0 rounded-sm bg-emerald-600" aria-hidden />
        {t("adminDrivingDayModalLegendPaid")}
      </li>
      <li className="flex items-center gap-1.5">
        <span className="inline-block h-3.5 w-5 shrink-0 rounded-sm bg-red-600" aria-hidden />
        {t("adminDrivingDayModalLegendUnpaid")}
      </li>
      <li className="flex items-center gap-1.5">
        <span
          className="inline-flex h-3.5 items-center rounded-sm border-2 border-amber-500 px-1 text-[9px] font-semibold tabular-nums leading-none text-foreground"
          aria-hidden
        >
          09:00
        </span>
        {t("adminDrivingDayModalLegendForced")}
      </li>
      <li className="flex items-center gap-1.5">
        <span className="inline-flex h-3.5 max-w-[3.5rem] items-center justify-center truncate rounded-sm bg-muted px-0.5 text-[8px] font-medium text-muted-foreground">
          Ա Ազա
        </span>
        {t("adminDrivingDayModalLegendOtherBranch")}
      </li>
      <li className="flex items-center gap-1.5">
        <span
          className="inline-flex h-3.5 w-5 shrink-0 items-center justify-center rounded-sm border border-dashed border-muted-foreground/40 text-[9px] leading-none text-muted-foreground/50"
          aria-hidden
        >
          +
        </span>
        {t("adminDrivingDayModalLegendEmpty")}
      </li>
      <li className="flex items-center gap-1.5">
        <span
          className="inline-flex h-3.5 w-5 shrink-0 items-center justify-center rounded-sm bg-muted-foreground/20"
          aria-hidden
        >
          <span className="h-1.5 w-3 rounded-[1px] bg-foreground/55" />
        </span>
        {t("adminDrivingDayModalLegendOccupied")}
      </li>
    </ul>
  );
}

export default function AdminDrivingDayModal({
  open,
  onOpenChange,
  dateIso,
  instructors,
  reloadKey = 0,
  onEmptyCellClick,
  onAddCustomSlotClick,
  onBookingCellClick,
}: Props) {
  const { t } = useLang();
  const { branches } = useBranches();
  const { branchId: adminBranchId } = useAdminBranchFilter();
  const day = dateIso.slice(0, 10);

  const dayColumns = useMemo(
    () => buildInstructorBranchColumns(branches, instructors, adminBranchId),
    [branches, instructors, adminBranchId],
  );

  const primaryBranchId = useMemo(() => {
    const filtered = (adminBranchId ?? "").trim();
    if (filtered) return filtered;
    return dayColumns[0]?.bookingBranchId ?? "";
  }, [adminBranchId, dayColumns]);

  const { rows: planRows, loading: planLoading } = usePracticalSlotPlan(primaryBranchId, open);

  const [items, setItems] = useState<ClassScheduleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blocksByInstructor, setBlocksByInstructor] = useState<Map<string, AvailabilityBlock[]>>(
    () => new Map(),
  );
  /**
   * Instructor busy slots are instructor-wide (not branch-scoped):
   * if the instructor has a practical lesson at this time in any branch,
   * we want to disable the matrix cells in all branch columns.
   */
  const [busyTimesByInstructor, setBusyTimesByInstructor] = useState<Map<string, Set<string>>>(
    () => new Map(),
  );
  /** Working-slot times per instructor; only instructors with a customized plan are present. */
  const [planTimesByInstructor, setPlanTimesByInstructor] = useState<Map<string, Set<string>>>(
    () => new Map(),
  );

  const gridInstructorIds = useMemo(() => {
    const ids = new Set<string>();
    for (const col of dayColumns) ids.add(String(col.instructor.id));
    return [...ids];
  }, [dayColumns]);

  useEffect(() => {
    if (!open || gridInstructorIds.length === 0) {
      setBlocksByInstructor(new Map());
      return;
    }
    let cancelled = false;
    void (async () => {
      const pairs = await Promise.all(
        gridInstructorIds.map(async (id) => {
          try {
            const raw = await vivaApiJson<unknown>(
              `/instructors/${encodeURIComponent(id)}/availability-blocks`,
            );
            return [id, normalizeAvailabilityBlocksFromApi(raw)] as const;
          } catch {
            return [id, [] as AvailabilityBlock[]] as const;
          }
        }),
      );
      if (!cancelled) setBlocksByInstructor(new Map(pairs));
    })();
    return () => {
      cancelled = true;
    };
  }, [open, gridInstructorIds, reloadKey]);

  useEffect(() => {
    if (!open || gridInstructorIds.length === 0) {
      setBusyTimesByInstructor(new Map());
      return;
    }
    let cancelled = false;
    void (async () => {
      const pairs = await Promise.all(
        gridInstructorIds.map(async (id) => {
          try {
            const busyQ = new URLSearchParams({ from: day, to: day });
            const raw = await vivaApiJson<Array<{ dateIso?: string; time?: string }>>(
              `/instructors/${encodeURIComponent(id)}/busy-slots?${busyQ.toString()}`,
            );
            const rows = Array.isArray(raw) ? raw : [];
            const times = new Set<string>();
            for (const row of rows) {
              const rowDay = String(row.dateIso ?? "").slice(0, 10);
              if (rowDay !== day) continue;
              if (!row.time) continue;
              times.add(padSlotTime(row.time));
            }
            return [id, times] as const;
          } catch {
            return [id, new Set<string>()] as const;
          }
        }),
      );
      if (!cancelled) setBusyTimesByInstructor(new Map(pairs));
    })();
    return () => {
      cancelled = true;
    };
  }, [open, gridInstructorIds, day, reloadKey]);

  useEffect(() => {
    if (!open || gridInstructorIds.length === 0) {
      setPlanTimesByInstructor(new Map());
      return;
    }
    let cancelled = false;
    void (async () => {
      const pairs = await Promise.all(
        gridInstructorIds.map(async (id) => {
          try {
            const data = await vivaApiJson<{ rows?: unknown; customized?: boolean }>(
              `/instructors/${encodeURIComponent(id)}/practical-slot-plan`,
            );
            if (!data?.customized) return null;
            const times = bookableTimesFromPlan(normalizePracticalSlotPlan(data.rows));
            return [id, new Set(times.map(padSlotTime))] as const;
          } catch {
            return null;
          }
        }),
      );
      if (!cancelled) {
        setPlanTimesByInstructor(new Map(pairs.filter((p): p is NonNullable<typeof p> => p != null)));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, gridInstructorIds]);

  const load = useCallback(async () => {
    if (!day) return;
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({
        view: "day",
        startDate: day,
        lessonType: "practical",
      });
      const res = await vivaApiJson<ClassScheduleResponse>(`/admin/class-schedule?${qs.toString()}`);
      setItems(Array.isArray(res.items) ? res.items : []);
    } catch (e) {
      setError(getApiErrorMessage(e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [day]);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load, reloadKey]);

  const bookingByInstructorTime = useMemo(() => {
    const map = new Map<string, DrivingDayCellBooking>();
    for (const item of items) {
      if (item.date.slice(0, 10) !== day) continue;
      const time = padSlotTime(item.startTime);
      const instructorKey =
        item.instructor.id != null && item.instructor.id > 0
          ? String(item.instructor.id)
          : `name:${(item.instructor.name ?? "").trim().toLowerCase()}`;
      const cell: DrivingDayCellBooking = {
        bookingId: item.bookingId,
        studentName: item.student.name,
        studentPhone: item.student.phone || item.student.phone2,
        paymentNotes: item.paymentNotes?.trim() ? item.paymentNotes.trim() : null,
        paymentStatus: item.payment.status,
        instructorId: item.instructor.id,
        instructorName: item.instructor.name,
        time,
      };
      const branchId = String(item.branch?.id ?? "");
      if (branchId) {
        map.set(`${instructorKey}|${branchId}|${time}`, cell);
      }
      if (!map.has(`${instructorKey}|${time}`)) {
        map.set(`${instructorKey}|${time}`, cell);
      }
    }
    return map;
  }, [items, day]);

  const displayRows = useMemo(() => {
    const base =
      planRows.length > 0
        ? ensureLunchBreakRow(planRows)
        : ensureLunchBreakRow(DEFAULT_PRACTICAL_SLOT_PLAN);
    const orphanTimes = [...bookingByInstructorTime.values()].map((b) => b.time);
    return mergeOrphanTimes(base, orphanTimes);
  }, [planRows, bookingByInstructorTime]);

  const bookableTimes = useMemo(() => bookableTimesFromPlan(displayRows), [displayRows]);
  const planTimeSet = useMemo(
    () =>
      new Set(
        bookableTimesFromPlan(planRows.length > 0 ? planRows : DEFAULT_PRACTICAL_SLOT_PLAN).map(padSlotTime),
      ),
    [planRows],
  );
  /** Start times of forced custom bookings that are not on the regular graphic plan. */
  const forcedSlotTimes = useMemo(() => {
    const set = new Set<string>();
    for (const b of bookingByInstructorTime.values()) {
      const t = padSlotTime(b.time);
      if (t && !planTimeSet.has(t)) set.add(t);
    }
    return set;
  }, [bookingByInstructorTime, planTimeSet]);

  /** Returns a i18n key describing why this slot is blocked, or null if it is not blocked. */
  const resolveBlockReason = useCallback(
    (instructorId: string, time: string): string | null => {
      if (busyTimesByInstructor.get(String(instructorId))?.has(padSlotTime(time))) {
        return "bookingSlotUnavailable";
      }
      const slotRange = practicalSlotRangeMinutesFromBookable(time, bookableTimes);
      const blocks = blocksByInstructor.get(String(instructorId)) ?? [];
      const inLunch = slotRangeOverlapsLunch(blocks, slotRange);

      const planTimes = planTimesByInstructor.get(String(instructorId));
      if (planTimes && !planTimes.has(padSlotTime(time)) && !inLunch) {
        return "adminDrivingDayModalReasonOutsideWorkSlots";
      }
      if (!blocks.length) return null;
      if (isSlotBlockedByAvailabilityRules(day, time, blocks, slotRange, {
        forPracticalPlan: true,
        skipLunch: true,
      })) {
        const wday = new Date(day).getDay();
        const isoDay = wday === 0 ? 7 : wday;
        for (const b of blocks) {
          if (b.ruleKind === "day_off" && b.dateIso === day) {
            return "adminDrivingDayModalReasonDayOff";
          }
          if (
            (b.ruleKind === "recurring_busy" || b.ruleKind === "date_busy") &&
            b.timeStart &&
            b.timeEnd
          ) {
            const matchDay =
              b.ruleKind === "recurring_busy" ? b.weekday === isoDay : b.dateIso === day;
            if (matchDay) {
              const bStart = parseTimeToMinutes(b.timeStart);
              const bEnd = parseTimeToMinutes(b.timeEnd);
              if (slotRange.start < bEnd && slotRange.end > bStart) {
                return "adminDrivingDayModalReasonBusy";
              }
            }
          }
        }
        return "bookingSlotUnavailable";
      }
      return null;
    },
    [blocksByInstructor, busyTimesByInstructor, planTimesByInstructor, bookableTimes, day],
  );

  const title = `${formatGridDateLabel(day)} · ${armenianWeekdayShort(day)}`;
  const busy = loading || planLoading;

  const resolveCellBooking = (
    ins: Instructor,
    branchId: string,
    time: string,
  ): DrivingDayCellBooking | undefined => {
    const byIdBranch = bookingByInstructorTime.get(`${ins.id}|${branchId}|${time}`);
    if (byIdBranch) return byIdBranch;
    const byNameBranch = bookingByInstructorTime.get(
      `name:${(ins.name ?? "").trim().toLowerCase()}|${branchId}|${time}`,
    );
    if (byNameBranch) return byNameBranch;
    // Only fall back to instructor-only key when this instructor has a single column.
    const appearances = dayColumns.filter((c) => c.instructor.id === ins.id).length;
    if (appearances !== 1) return undefined;
    return (
      bookingByInstructorTime.get(`${ins.id}|${time}`) ??
      bookingByInstructorTime.get(`name:${(ins.name ?? "").trim().toLowerCase()}|${time}`)
    );
  };

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title={t("adminDrivingDayModalTitle")}
      description={title}
      contentClassName="w-[min(98vw,1800px)] max-w-[min(98vw,1800px)] max-h-[min(96vh,1200px)] sm:max-w-[min(98vw,1800px)]"
      bodyClassName="px-2 sm:px-4 py-3 overflow-hidden flex flex-col"
      headerClassName="px-4 sm:px-6 pb-3 pt-4"
      footerClassName="px-4 sm:px-6 py-3"
      footer={
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <DrivingDayLegend />
          <Button type="button" variant="outline" className="shrink-0 self-end sm:self-auto" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
        </div>
      }
    >
      {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}

      {busy && items.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("loading")}
        </div>
      ) : dayColumns.length === 0 ? (
        <p className="py-8 text-sm text-muted-foreground">{t("adminDrivingEmptyInstructors")}</p>
      ) : (
        <TooltipProvider delayDuration={200}>
          <div className="relative min-h-0 flex-1 rounded-lg border border-primary/30 max-h-[min(82vh,980px)] overflow-auto overscroll-contain">
            {busy ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/40 pointer-events-none">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : null}
            <table className="w-full text-sm border-separate border-spacing-0 min-w-max">
              <thead>
                <tr>
                  <th className="sticky top-0 left-0 z-40 bg-card text-left text-primary font-semibold px-3 py-2 border-r border-b border-primary/20 min-w-[4.5rem] shadow-[1px_0_0_0_hsl(var(--primary)/0.15)]">
                    {t("adminDrivingDayModalTimeCol")}
                  </th>
                  {dayColumns.map((col) => (
                    <th
                      key={`${col.instructor.id}-${col.bookingBranchId}`}
                      className="sticky top-0 z-30 bg-card text-center text-xs font-medium text-primary/90 px-1.5 py-1.5 border-r border-b border-primary/10 last:border-r-0 min-w-[8.5rem] max-w-[13rem] shadow-[0_1px_0_0_hsl(var(--primary)/0.2)]"
                    >
                      <div className="group/ins flex items-center justify-center gap-0.5 min-w-0">
                        <span
                          className="whitespace-normal leading-tight"
                          title={
                            col.showBranchCode
                              ? `${col.instructor.name} · ${col.bookingBranchName}`
                              : col.instructor.name
                          }
                        >
                          {col.instructor.name}
                          {col.showBranchCode ? (
                            <span className="ml-1 font-semibold text-primary/80">{col.branchCode}</span>
                          ) : null}
                        </span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() =>
                                onAddCustomSlotClick({
                                  instructor: col.instructor,
                                  branchId: col.bookingBranchId,
                                  dateIso: day,
                                })
                              }
                              className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-primary/50 opacity-70 hover:opacity-100 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors"
                              aria-label={t("adminDrivingDayModalAddCustomSlot")}
                            >
                              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[14rem] text-center">
                            {t("adminDrivingDayModalAddCustomSlot")}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row, rowIdx) => {
                  if (row.time == null || row.time === "") {
                    return (
                      <tr key={`break-${rowIdx}`} className="hover:bg-primary/5">
                        <td className="sticky left-0 z-20 bg-card px-3 py-1.5 border-r border-b border-primary/15 text-muted-foreground font-medium tabular-nums shadow-[1px_0_0_0_hsl(var(--primary)/0.1)] text-xs">
                          {t("adminDrivingDayModalBreak")}
                        </td>
                        {dayColumns.map((col) => (
                            <td
                              key={`break-${rowIdx}-${col.instructor.id}-${col.bookingBranchId}`}
                              className="p-0 border-r border-b border-border/30 last:border-r-0"
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  onAddCustomSlotClick({
                                    instructor: col.instructor,
                                    branchId: col.bookingBranchId,
                                    dateIso: day,
                                  })
                                }
                                className="w-full min-h-14 px-1 py-1 text-transparent hover:bg-primary/15 hover:text-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50 transition-colors"
                                title={`${col.instructor.name} · ${t("adminDrivingDayModalBreak")}`}
                                aria-label={`${col.instructor.name} · ${t("adminDrivingDayModalBreak")}`}
                              >
                                +
                              </button>
                            </td>
                          ))}
                      </tr>
                    );
                  }

                  const time = padSlotTime(row.time);
                  const isForcedSlotRow = forcedSlotTimes.has(time);
                  return (
                    <tr key={`${time}-${rowIdx}`} className="hover:bg-primary/5">
                      <td
                        className={cn(
                          "sticky left-0 z-20 bg-card px-3 py-1.5 border-r border-b border-primary/15 text-primary font-medium tabular-nums shadow-[1px_0_0_0_hsl(var(--primary)/0.1)]",
                          isForcedSlotRow &&
                            "border-t-2 border-b-2 border-l-2 border-t-amber-500 border-b-amber-500 border-l-amber-500",
                        )}
                      >
                        {isForcedSlotRow ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help" tabIndex={0}>
                                {time}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="text-xs">
                              {t("adminDrivingDayModalOffPlanSlot")}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          time
                        )}
                      </td>
                      {dayColumns.map((col) => {
                          const ins = col.instructor;
                          const booking = resolveCellBooking(ins, col.bookingBranchId, time);
                          const blockReason = !booking ? resolveBlockReason(ins.id, time) : null;
                          const blocked = blockReason != null;
                          const openEmpty = () => {
                            const instructorTimes = planTimesByInstructor.get(String(ins.id));
                            const inSavedPlan = instructorTimes
                              ? instructorTimes.has(time)
                              : planTimeSet.has(time);
                            onEmptyCellClick({
                              instructor: ins,
                              branchId: col.bookingBranchId,
                              dateIso: day,
                              time,
                              customSlot: !inSavedPlan,
                              customSlotEndTime: inSavedPlan
                                ? undefined
                                : nextTimedAfter(displayRows, time),
                            });
                          };
                          return (
                            <td
                              key={`${time}-${ins.id}-${col.bookingBranchId}`}
                              className={cn(
                                "p-0 border-r border-b border-border/30 last:border-r-0",
                                isForcedSlotRow &&
                                  "border-t-2 border-b-2 border-t-amber-500 border-b-amber-500 last:border-r-2 last:border-r-amber-500",
                              )}
                            >
                              {booking ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        onBookingCellClick({
                                          bookingId: booking.bookingId,
                                          dateIso: day,
                                          time,
                                        })
                                      }
                                      className={cn(
                                        "w-full min-h-14 px-1.5 py-1.5 flex flex-col items-center justify-center gap-0.5 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50",
                                        paymentCellClass(booking.paymentStatus),
                                      )}
                                    >
                                      <span className="text-xs sm:text-[13px] leading-snug font-semibold line-clamp-2">
                                        {booking.studentName}
                                      </span>
                                      {booking.studentPhone ? (
                                        <span className="text-[11px] sm:text-xs leading-snug opacity-95 tabular-nums truncate max-w-full">
                                          {booking.studentPhone}
                                        </span>
                                      ) : null}
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="top"
                                    className="max-w-[min(18rem,90vw)] space-y-1 text-left whitespace-normal"
                                  >
                                    <p className="font-medium">{booking.studentName}</p>
                                    {col.showBranchCode ? (
                                      <p className="opacity-90">{col.bookingBranchName}</p>
                                    ) : null}
                                    {booking.studentPhone ? (
                                      <p className="opacity-90 tabular-nums">{booking.studentPhone}</p>
                                    ) : null}
                                    {booking.paymentNotes ? (
                                      <p className="border-t border-background/25 pt-1 whitespace-pre-wrap break-words">
                                        <span className="font-medium opacity-90">
                                          {t("adminBookingPaymentNotes")}:{" "}
                                        </span>
                                        {booking.paymentNotes}
                                      </p>
                                    ) : null}
                                  </TooltipContent>
                                </Tooltip>
                              ) : blocked ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div
                                      className="w-full min-h-14 flex items-center justify-center bg-muted/70 cursor-not-allowed select-none"
                                      aria-label={`${ins.name} · ${time} · ${t("bookingSlotUnavailable")}${
                                        blockReason && blockReason !== "bookingSlotUnavailable"
                                          ? ` · ${t(blockReason as Parameters<typeof t>[0])}`
                                          : ""
                                      }`}
                                    >
                                      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
                                        {t("bookingSlotUnavailable")}
                                      </span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs">
                                    <p className="font-medium">{t("bookingSlotUnavailable")}</p>
                                    {blockReason && blockReason !== "bookingSlotUnavailable" ? (
                                      <p className="opacity-80">{t(blockReason as Parameters<typeof t>[0])}</p>
                                    ) : null}
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <button
                                  type="button"
                                  onClick={openEmpty}
                                  className="w-full min-h-14 px-1 py-1 text-transparent hover:bg-primary/15 hover:text-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50 transition-colors"
                                  title={`${ins.name} · ${time}`}
                                  aria-label={`${ins.name} · ${time}`}
                                >
                                  +
                                </button>
                              )}
                            </td>
                          );
                        })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TooltipProvider>
      )}
    </AppModal>
  );
}
