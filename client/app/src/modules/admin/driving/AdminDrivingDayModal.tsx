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
  buildBranchInstructorGroups,
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
  }) => void;
  /** Admin custom slot (e.g. during lunch) — opens booking with free-form time. */
  onAddCustomSlotClick: (target: {
    instructor: Instructor;
    branchId: string;
    dateIso: string;
  }) => void;
  onBookingCellClick: (bookingId: number) => void;
};

function ensureLunchBreakRow(rows: readonly PracticalSlotPlanRow[]): PracticalSlotPlanRow[] {
  if (rows.some((r) => r.time == null || r.time === "")) {
    return rows.map((r) => ({ time: r.time }));
  }
  const times = rows.map((r) => r.time).filter((t): t is string => Boolean(t));
  const has1320 = times.includes("13:20");
  const has1500 = times.includes("15:00");
  if (!has1320 || !has1500) return rows.map((r) => ({ time: r.time }));
  const out: PracticalSlotPlanRow[] = [];
  for (const r of rows) {
    out.push({ time: r.time });
    if (r.time === "13:20") out.push({ time: null });
  }
  return out;
}

function mergeOrphanTimes(
  planRows: readonly PracticalSlotPlanRow[],
  orphanTimes: readonly string[],
): PracticalSlotPlanRow[] {
  if (orphanTimes.length === 0) return [...planRows];
  const known = new Set(
    planRows.map((r) => (r.time ? padSlotTime(r.time) : "")).filter(Boolean),
  );
  // Deduplicate: many bookings can share one off-plan time (e.g. 14:00 in the lunch gap).
  const extras = [
    ...new Set(orphanTimes.map(padSlotTime).filter((t) => t && !known.has(t))),
  ].sort((a, b) => parseTimeToMinutes(a) - parseTimeToMinutes(b));
  if (extras.length === 0) return [...planRows];

  const timed: { time: string; mins: number }[] = [];
  const seenTimed = new Set<string>();
  const breaks: PracticalSlotPlanRow[] = [];
  for (const r of planRows) {
    if (r.time == null || r.time === "") {
      breaks.push({ time: null });
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

  // Re-insert a single break after 13:20 when present (keeps spreadsheet-like layout).
  const out: PracticalSlotPlanRow[] = [];
  let breakInserted = breaks.length === 0;
  for (const row of timed) {
    out.push({ time: row.time });
    if (!breakInserted && row.time === "13:20") {
      out.push({ time: null });
      breakInserted = true;
    }
  }
  if (!breakInserted) {
    for (const b of breaks) out.push(b);
  }
  return out;
}

function paymentCellClass(status: DrivingDayCellBooking["paymentStatus"]): string {
  if (status === "paid" || status === "free" || status === "not_required") {
    return "bg-emerald-600 text-white hover:bg-emerald-500";
  }
  return "bg-red-600 text-white hover:bg-red-500";
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

  const branchGroups = useMemo(
    () => buildBranchInstructorGroups(branches, instructors, adminBranchId),
    [branches, instructors, adminBranchId],
  );

  const primaryBranchId = useMemo(() => {
    const filtered = (adminBranchId ?? "").trim();
    if (filtered) return filtered;
    return branchGroups[0]?.branchId ?? "";
  }, [adminBranchId, branchGroups]);

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
    for (const g of branchGroups) {
      for (const ins of g.instructors) ids.add(String(ins.id));
    }
    return [...ids];
  }, [branchGroups]);

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

  /** True when admin schedule rules (day off, busy hours, …) block this instructor's slot. */
  const isInstructorSlotBlocked = useCallback(
    (instructorId: string, time: string): boolean => {
      const blocks = blocksByInstructor.get(String(instructorId));
      if (!blocks || blocks.length === 0) return false;
      const slotRange = practicalSlotRangeMinutesFromBookable(time, bookableTimes);
      return isSlotBlockedByAvailabilityRules(day, time, blocks, slotRange, {
        forPracticalPlan: true,
      });
    },
    [blocksByInstructor, bookableTimes, day],
  );

  /** True when the instructor saved custom working slots and this time is not one of them. */
  const isOutsideInstructorWorkingSlots = useCallback(
    (instructorId: string, time: string): boolean => {
      const times = planTimesByInstructor.get(String(instructorId));
      if (!times) return false;
      return !times.has(padSlotTime(time));
    },
    [planTimesByInstructor],
  );

  const isInstructorBusyAtTime = useCallback(
    (instructorId: string, time: string): boolean => {
      const times = busyTimesByInstructor.get(String(instructorId));
      if (!times) return false;
      return times.has(padSlotTime(time));
    },
    [busyTimesByInstructor],
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
    // Only fall back to instructor-only key when this instructor appears in a single branch column.
    const appearances = branchGroups.reduce(
      (n, g) => n + g.instructors.filter((i) => i.id === ins.id).length,
      0,
    );
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
        <div className="flex w-full items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground hidden sm:block">{t("adminDrivingDayModalHint")}</p>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
      ) : branchGroups.length === 0 ? (
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
                  <th
                    rowSpan={2}
                    className="sticky top-0 left-0 z-40 bg-card text-left text-primary font-semibold px-3 py-2 border-r border-b border-primary/20 min-w-[4.5rem] shadow-[1px_0_0_0_hsl(var(--primary)/0.15)]"
                  >
                    {t("adminDrivingDayModalTimeCol")}
                  </th>
                  {branchGroups.map((g) => (
                    <th
                      key={g.branchId}
                      colSpan={g.instructors.length}
                      className="sticky top-0 z-30 bg-card text-center text-primary font-semibold px-2 py-2 border-r border-b border-primary/15 last:border-r-0 shadow-[0_1px_0_0_hsl(var(--primary)/0.2)]"
                    >
                      {g.branchName}
                    </th>
                  ))}
                </tr>
                <tr>
                  {branchGroups.flatMap((g) =>
                    g.instructors.map((ins) => (
                      <th
                        key={`${g.branchId}-${ins.id}`}
                        className="sticky top-9 z-30 bg-card text-center text-primary/90 text-xs font-medium px-1.5 py-1.5 border-r border-b border-primary/10 last:border-r-0 min-w-[7rem] max-w-[10rem] shadow-[0_1px_0_0_hsl(var(--primary)/0.2)]"
                      >
                        <div className="group/ins flex items-center justify-center gap-0.5 min-w-0">
                          <span className="truncate" title={ins.name}>
                            {ins.name.split(" ")[0]}
                          </span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() =>
                                  onAddCustomSlotClick({
                                    instructor: ins,
                                    branchId: g.branchId,
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
                    )),
                  )}
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row, rowIdx) => {
                  if (row.time == null || row.time === "") {
                    return (
                      <tr key={`break-${rowIdx}`}>
                        <td
                          colSpan={1 + branchGroups.reduce((n, g) => n + g.instructors.length, 0)}
                          className="sticky left-0 z-10 bg-muted/60 px-3 py-1.5 text-center text-xs font-medium text-muted-foreground border-b border-border/40"
                        >
                          {t("adminDrivingDayModalBreak")}
                        </td>
                      </tr>
                    );
                  }

                  const time = padSlotTime(row.time);
                  return (
                    <tr key={time} className="hover:bg-primary/5">
                      <td className="sticky left-0 z-20 bg-card px-3 py-1.5 border-r border-b border-primary/15 text-primary font-medium tabular-nums shadow-[1px_0_0_0_hsl(var(--primary)/0.1)]">
                        {time}
                      </td>
                      {branchGroups.flatMap((g) =>
                        g.instructors.map((ins) => {
                          const booking = resolveCellBooking(ins, g.branchId, time);
                          const blocked =
                            !booking &&
                            (isInstructorSlotBlocked(ins.id, time) ||
                              isOutsideInstructorWorkingSlots(ins.id, time) ||
                              isInstructorBusyAtTime(ins.id, time));
                          return (
                            <td
                              key={`${time}-${g.branchId}-${ins.id}`}
                              className="p-0 border-r border-b border-border/30 last:border-r-0"
                            >
                              {booking ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      onClick={() => onBookingCellClick(booking.bookingId)}
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
                                <div
                                  className="w-full min-h-14 flex items-center justify-center bg-muted/70 cursor-not-allowed select-none"
                                  title={`${ins.name} · ${time} · ${t("bookingSlotUnavailable")}`}
                                  aria-label={`${ins.name} · ${time} · ${t("bookingSlotUnavailable")}`}
                                >
                                  <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/70">
                                    {t("bookingSlotUnavailable")}
                                  </span>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onEmptyCellClick({
                                      instructor: ins,
                                      branchId: g.branchId,
                                      dateIso: day,
                                      time,
                                    })
                                  }
                                  className="w-full min-h-14 px-1 py-1 text-transparent hover:bg-primary/15 hover:text-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50 transition-colors"
                                  title={`${ins.name} · ${time}`}
                                  aria-label={`${ins.name} · ${time}`}
                                >
                                  +
                                </button>
                              )}
                            </td>
                          );
                        }),
                      )}
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
