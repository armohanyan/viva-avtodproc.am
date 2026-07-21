import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { AppModal } from "src/components/AppModal";
import { Button } from "src/components/ui/button";
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
  type PracticalSlotPlanRow,
} from "src/modules/booking/practical-slot-plan";
import { parseTimeToMinutes } from "src/modules/booking/booking-slot.util";

export type DrivingDayCellBooking = {
  bookingId: number;
  studentName: string;
  studentPhone: string | null;
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
  const extras = orphanTimes
    .map(padSlotTime)
    .filter((t) => t && !known.has(t))
    .sort((a, b) => parseTimeToMinutes(a) - parseTimeToMinutes(b));
  if (extras.length === 0) return [...planRows];

  const timed: { time: string; mins: number }[] = [];
  const breaks: PracticalSlotPlanRow[] = [];
  for (const r of planRows) {
    if (r.time == null || r.time === "") {
      breaks.push({ time: null });
      continue;
    }
    const t = padSlotTime(r.time);
    timed.push({ time: t, mins: parseTimeToMinutes(t) });
  }
  for (const t of extras) {
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
                      className="sticky top-9 z-30 bg-card text-center text-primary/90 text-xs font-medium px-1.5 py-1.5 border-r border-b border-primary/10 last:border-r-0 min-w-[7rem] max-w-[10rem] truncate shadow-[0_1px_0_0_hsl(var(--primary)/0.2)]"
                      title={ins.name}
                    >
                      {ins.name.split(" ")[0]}
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
                        return (
                          <td
                            key={`${time}-${g.branchId}-${ins.id}`}
                            className="p-0 border-r border-b border-border/30 last:border-r-0"
                          >
                            {booking ? (
                              <button
                                type="button"
                                onClick={() => onBookingCellClick(booking.bookingId)}
                                className={cn(
                                  "w-full min-h-14 px-1.5 py-1.5 flex flex-col items-center justify-center gap-0.5 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50",
                                  paymentCellClass(booking.paymentStatus),
                                )}
                                title={`${booking.studentName}${booking.studentPhone ? ` · ${booking.studentPhone}` : ""}`}
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
      )}
    </AppModal>
  );
}
