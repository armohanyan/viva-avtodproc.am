import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "src/components/ui/button";
import type { Instructor } from "src/data/instructors";
import type { TranslationKey } from "src/lib/i18n";
import { vivaApiJson } from "src/lib/vivaApi";
import { useBranches } from "src/modules/branches";
import { useAdminBranchFilter } from "src/modules/admin/AdminBranchFilterProvider";
import { cn } from "src/lib/utils";
import { yerevanAddCalendarMonths } from "src/lib/yerevanLessonCalendar";
import AdminInstructorDaySlotsModal from "./AdminInstructorDaySlotsModal";
import type { InstructorDaySlotSource } from "./useInstructorDaySlots";
import {
  ADMIN_AVAILABILITY_GRID_MONTHS,
  aggregateBusyCountsByInstructorDay,
  aggregatePendingCountsByInstructorDay,
  armenianWeekdayShort,
  buildInstructorBranchColumns,
  defaultGridRangeStart,
  formatGridDateLabel,
  gridDateRange,
  lessonCountForCell,
  slotEntryKey,
  sortSlotEntriesChrono,
  type InstructorBusySlotRow,
} from "./adminAvailabilityGrid";

type CellTarget = {
  instructor: Instructor;
  branchId: string;
  dateIso: string;
};

export type AdminAvailabilityCellClick = (target: {
  instructor: Instructor;
  branchId: string;
  dateIso: string;
  busyCount: number;
}) => void;

type Props = {
  instructors: readonly Instructor[];
  bookingBranchId: string;
  studentName: string;
  /** Instructor that owns {@link selectedEntries} (from parent booking draft). */
  selectionInstructorId?: string;
  /** When this changes (e.g. add-booking modal session), local pending picks are cleared. */
  pickerResetKey?: string;
  selectedEntries: readonly { dateIso: string; time: string }[];
  onEntriesChange: (entries: { dateIso: string; time: string }[], instructorId: string) => void;
  onInstructorPicked: (instructorUserId: string, branchId: string) => void;
  maxSelectableSlots?: number;
  maxSelectableSlotsErrorKey?: TranslationKey;
  /**
   * Optional override: when provided, clicking a cell calls this handler instead of opening the
   * in-component slot picker modal. Bypasses the studentName requirement and hides the local
   * selection chip — used by view-only flows (e.g. the standalone driving overview page).
   */
  onCellClick?: AdminAvailabilityCellClick;
  /** When set, the date column becomes clickable (e.g. open a full-day instructors × slots matrix). */
  onDateClick?: (dateIso: string) => void;
  slotSource?: InstructorDaySlotSource;
  /** When this changes, busy-slot counts are reloaded (e.g. after a booking is deleted). */
  reloadKey?: number | string;
  /**
   * When true, {@link bookingBranchId} alone filters columns (empty = all branches) and the
   * global admin header branch filter is ignored.
   */
  ignoreGlobalBranchFilter?: boolean;
  /**
   * Grow to fill the parent height (no 720px cap). Parent should be a flex column with
   * `flex-1 min-h-0` so the matrix uses the remaining viewport.
   */
  fillViewport?: boolean;
  t: (k: TranslationKey) => string;
};

export default function AdminInstructorAvailabilityTable({
  instructors,
  bookingBranchId,
  studentName,
  selectionInstructorId = "",
  pickerResetKey = "",
  selectedEntries,
  onEntriesChange,
  onInstructorPicked,
  maxSelectableSlots,
  maxSelectableSlotsErrorKey,
  onCellClick,
  onDateClick,
  slotSource = "branch",
  reloadKey = 0,
  ignoreGlobalBranchFilter = false,
  fillViewport = false,
  t,
}: Props) {
  const cellClickMode = Boolean(onCellClick);
  const { branches } = useBranches();
  const { branchId: adminBranchId, revision: branchFilterRevision } = useAdminBranchFilter();
  const branchIdFilter = ignoreGlobalBranchFilter
    ? bookingBranchId.trim()
    : bookingBranchId.trim() || adminBranchId;
  const [rangeStartIso, setRangeStartIso] = useState(defaultGridRangeStart);
  const [busyByInstructor, setBusyByInstructor] = useState<Map<string, InstructorBusySlotRow[]>>(new Map());
  const [gridLoading, setGridLoading] = useState(false);
  const [slotModal, setSlotModal] = useState<CellTarget | null>(null);
  const [activeInstructorId, setActiveInstructorId] = useState("");
  /** Updated synchronously on confirm so the grid reflects picks before parent state settles. */
  const [pendingSelection, setPendingSelection] = useState<{
    instructorId: string;
    branchId: string;
    entries: readonly { dateIso: string; time: string }[];
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const dates = useMemo(() => gridDateRange(rangeStartIso), [rangeStartIso]);
  const rangeEndIso = dates[dates.length - 1] ?? rangeStartIso;

  const instructorColumns = useMemo(
    () => buildInstructorBranchColumns(branches, instructors, branchIdFilter),
    [branches, instructors, branchIdFilter],
  );

  const instructorIds = useMemo(() => instructors.map((i) => i.id), [instructors]);

  const loadBusy = useCallback(async () => {
    if (instructorIds.length === 0) {
      setBusyByInstructor(new Map());
      return;
    }
    setGridLoading(true);
    try {
      const from = rangeStartIso;
      const to = rangeEndIso;
      const pairs = await Promise.all(
        instructorIds.map(async (id) => {
          try {
            const rows = await vivaApiJson<InstructorBusySlotRow[]>(
              `/instructors/${encodeURIComponent(id)}/busy-slots?${new URLSearchParams({ from, to }).toString()}`,
            );
            return [id, Array.isArray(rows) ? rows : []] as const;
          } catch {
            return [id, []] as const;
          }
        }),
      );
      setBusyByInstructor(new Map(pairs));
    } finally {
      setGridLoading(false);
    }
  }, [instructorIds, rangeStartIso, rangeEndIso, branchFilterRevision]);

  useEffect(() => {
    void loadBusy();
  }, [loadBusy, reloadKey, branchFilterRevision]);

  const lessonCounts = useMemo(
    () =>
      aggregateBusyCountsByInstructorDay(
        instructorIds,
        busyByInstructor,
        // Practical driving / booking grids must show practical slot counts only
        // (theory-group hours still block calendars via busy-slots, but are not counted).
        slotSource === "practical" ? { lessonTypes: ["practical"] } : undefined,
      ),
    [instructorIds, busyByInstructor, slotSource],
  );

  useEffect(() => {
    setPendingSelection(null);
    setActiveInstructorId("");
  }, [pickerResetKey]);

  useEffect(() => {
    if (selectedEntries.length === 0) return;
    const ownerId = activeInstructorId || selectionInstructorId;
    if (!ownerId) return;
    setPendingSelection((prev) => ({
      instructorId: ownerId,
      branchId: prev?.instructorId === ownerId ? prev.branchId : bookingBranchId,
      entries: selectedEntries,
    }));
  }, [selectedEntries, activeInstructorId, selectionInstructorId, bookingBranchId]);

  const pendingSource =
    pendingSelection && pendingSelection.entries.length > 0
      ? pendingSelection
      : selectedEntries.length > 0
        ? {
            instructorId: activeInstructorId || selectionInstructorId,
            branchId: bookingBranchId,
            entries: selectedEntries,
          }
        : null;

  const pendingLessonCounts = useMemo(() => {
    if (!pendingSource?.entries.length || !pendingSource.instructorId) return new Map<string, number>();
    return aggregatePendingCountsByInstructorDay(
      pendingSource.instructorId,
      pendingSource.entries,
      pendingSource.branchId,
    );
  }, [pendingSource]);

  const selectionOwnerId = pendingSource?.instructorId || activeInstructorId || selectionInstructorId;

  const selectedByInstructorDay = useMemo(() => {
    const m = new Set<string>();
    if (!selectionOwnerId || !pendingSource?.entries.length) return m;
    const bid = pendingSource.branchId?.trim() || "";
    for (const e of pendingSource.entries) {
      const d = e.dateIso.slice(0, 10);
      m.add(bid ? `${selectionOwnerId}|${bid}|${d}` : `${selectionOwnerId}|${d}`);
    }
    return m;
  }, [pendingSource, selectionOwnerId]);

  const rangeLabel = useMemo(() => {
    if (dates.length === 0) return "";
    return `${formatGridDateLabel(dates[0])} – ${formatGridDateLabel(dates[dates.length - 1])}`;
  }, [dates]);

  const updateHorizontalScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(maxScroll > 2 && el.scrollLeft < maxScroll - 2);
  }, []);

  const scrollInstructorsBy = useCallback((direction: -1 | 1) => {
    const el = scrollRef.current;
    if (!el) return;
    const step = Math.max(Math.floor(el.clientWidth * 0.75), 240);
    el.scrollBy({ left: direction * step, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateHorizontalScrollState();
    const onScroll = () => updateHorizontalScrollState();
    el.addEventListener("scroll", onScroll, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateHorizontalScrollState) : null;
    ro?.observe(el);
    window.addEventListener("resize", updateHorizontalScrollState);
    return () => {
      el.removeEventListener("scroll", onScroll);
      ro?.disconnect();
      window.removeEventListener("resize", updateHorizontalScrollState);
    };
  }, [updateHorizontalScrollState, instructorColumns.length, dates.length, gridLoading]);

  /** Shift + mouse wheel scrolls instructors horizontally without hunting for the bottom bar. */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.shiftKey) return;
      if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [instructorColumns.length, gridLoading]);

  return (
    <div className={cn("space-y-3 min-w-0", fillViewport && "flex flex-col flex-1 min-h-0 h-full")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={!canScrollLeft}
            onClick={() => scrollInstructorsBy(-1)}
            aria-label={t("adminBookingAvailabilityGridScrollLeft")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={!canScrollRight}
            onClick={() => scrollInstructorsBy(1)}
            aria-label={t("adminBookingAvailabilityGridScrollRight")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setRangeStartIso((s) => yerevanAddCalendarMonths(s, -ADMIN_AVAILABILITY_GRID_MONTHS))}
            aria-label={t("adminBookingAvailabilityGridPrev")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium tabular-nums min-w-[10rem] text-center">{rangeLabel}</span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setRangeStartIso((s) => yerevanAddCalendarMonths(s, ADMIN_AVAILABILITY_GRID_MONTHS))}
            aria-label={t("adminBookingAvailabilityGridNext")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {gridLoading ? (
        <p className="text-xs text-muted-foreground">{t("instructorAvailabilityCalendarLoading")}</p>
      ) : null}

      {instructorColumns.length === 0 ? (
        <p className="text-sm text-amber-600 dark:text-amber-500">{t("adminBookingInstructorCalendarUnavailable")}</p>
      ) : (
        <div className={cn("relative min-w-0", fillViewport && "flex-1 min-h-0 flex flex-col")}>
          <div
            ref={scrollRef}
            className={cn(
              "rounded-lg border border-primary/30 overflow-auto overscroll-contain touch-pan-x touch-pan-y min-w-0",
              fillViewport
                ? "flex-1 min-h-0 max-h-none h-full"
                : "max-h-[min(calc(100dvh-14rem),720px)]",
            )}
          >
          <table className="w-full text-sm border-separate border-spacing-0 min-w-max">
            <thead>
              <tr>
                <th className="sticky top-0 left-0 z-40 bg-card text-left text-primary font-semibold px-3 py-2 border-r border-b border-primary/20 min-w-[7.5rem] shadow-[1px_0_0_0_hsl(var(--primary)/0.15)]">
                  {t("adminBookingAvailabilityGridDateCol")}
                </th>
                {instructorColumns.map((col) => (
                  <th
                    key={`${col.instructor.id}-${col.bookingBranchId}`}
                    className="sticky top-0 z-30 bg-card text-center text-primary/90 text-xs font-medium px-1.5 py-1.5 border-r border-b border-primary/10 last:border-r-0 min-w-[7.5rem] max-w-[11rem] whitespace-normal leading-tight shadow-[0_1px_0_0_hsl(var(--primary)/0.2)]"
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
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dates.map((dateIso) => (
                <tr key={dateIso} className="hover:bg-primary/5">
                  <td className="sticky left-0 z-20 bg-card px-0 py-0 border-r border-b border-primary/15 whitespace-nowrap shadow-[1px_0_0_0_hsl(var(--primary)/0.1)]">
                    {onDateClick ? (
                      <button
                        type="button"
                        onClick={() => onDateClick(dateIso)}
                        className="w-full px-3 py-2 text-left hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50 transition-colors"
                        title={t("adminDrivingDayModalOpenHint")}
                      >
                        <div className="text-primary font-medium tabular-nums underline-offset-2 hover:underline">
                          {formatGridDateLabel(dateIso)}
                        </div>
                        <div className="text-[11px] text-primary/70">{armenianWeekdayShort(dateIso)}</div>
                      </button>
                    ) : (
                      <div className="px-3 py-2">
                        <div className="text-primary font-medium tabular-nums">{formatGridDateLabel(dateIso)}</div>
                        <div className="text-[11px] text-primary/70">{armenianWeekdayShort(dateIso)}</div>
                      </div>
                    )}
                  </td>
                  {instructorColumns.map((col) => {
                      const ins = col.instructor;
                      const branchId = col.bookingBranchId;
                      const busyCount = lessonCountForCell(lessonCounts, ins.id, dateIso, branchId);
                      const pendingCount = lessonCountForCell(
                        pendingLessonCounts,
                        ins.id,
                        dateIso,
                        branchId,
                      );
                      const cellLabel =
                        pendingCount > 0 ? `${busyCount} + ${pendingCount}` : String(busyCount);
                      const hasPick =
                        selectionOwnerId === ins.id &&
                        (selectedByInstructorDay.has(
                          `${ins.id}|${branchId}|${dateIso.slice(0, 10)}`,
                        ) ||
                          selectedByInstructorDay.has(`${ins.id}|${dateIso.slice(0, 10)}`));
                      const disabled = !cellClickMode && !studentName.trim();
                      return (
                        <td key={`${dateIso}-${ins.id}-${branchId}`} className="p-0 border-r border-b border-border/30 last:border-r-0">
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => {
                              if (cellClickMode) {
                                onCellClick?.({ instructor: ins, branchId, dateIso, busyCount });
                                return;
                              }
                              if (!studentName.trim()) return;
                              if (
                                activeInstructorId &&
                                activeInstructorId !== ins.id &&
                                selectedEntries.length > 0
                              ) {
                                setPendingSelection(null);
                                onEntriesChange([], "");
                              }
                              setActiveInstructorId(ins.id);
                              setSlotModal({ instructor: ins, branchId, dateIso });
                            }}
                            className={cn(
                              "w-full min-h-10 py-1 flex items-center justify-center font-semibold tabular-nums transition-colors text-primary",
                              pendingCount > 0 ? "text-[11px] leading-tight" : "text-sm",
                              "hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                              hasPick && "ring-1 ring-inset ring-primary/60 bg-primary/10",
                              disabled && "opacity-40 cursor-not-allowed",
                            )}
                            title={
                              cellClickMode
                                ? `${ins.name} · ${formatGridDateLabel(dateIso)} · ${busyCount} ${t("adminDrivingCellLessonsSuffix")}`
                                : studentName.trim()
                                  ? pendingCount > 0
                                    ? `${ins.name} · ${formatGridDateLabel(dateIso)} · ${busyCount} + ${pendingCount}`
                                    : `${ins.name} · ${formatGridDateLabel(dateIso)}`
                                  : t("adminLearnPickStudentHint")
                            }
                          >
                            {cellLabel}
                          </button>
                        </td>
                      );
                    })}
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          {canScrollLeft || canScrollRight ? (
            <>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                disabled={!canScrollLeft}
                onClick={() => scrollInstructorsBy(-1)}
                aria-label={t("adminBookingAvailabilityGridScrollLeft")}
                className={cn(
                  "absolute left-1 top-1/2 z-50 h-9 w-9 -translate-y-1/2 border border-border bg-card/95 shadow-md backdrop-blur-sm",
                  !canScrollLeft && "pointer-events-none opacity-0",
                )}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="icon"
                disabled={!canScrollRight}
                onClick={() => scrollInstructorsBy(1)}
                aria-label={t("adminBookingAvailabilityGridScrollRight")}
                className={cn(
                  "absolute right-1 top-1/2 z-50 h-9 w-9 -translate-y-1/2 border border-border bg-card/95 shadow-md backdrop-blur-sm",
                  !canScrollRight && "pointer-events-none opacity-0",
                )}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          ) : null}
        </div>
      )}

      {!cellClickMode && pendingSource && pendingSource.entries.length > 0 ? (
        <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
          <p className="text-xs font-medium text-muted-foreground mb-1">{t("adminBookingSelectedSlotsLabel")}</p>
          <ul className="space-y-0.5 text-sm text-foreground max-h-28 overflow-y-auto">
            {sortSlotEntriesChrono(pendingSource.entries).map((e) => (
              <li key={slotEntryKey(e.dateIso, e.time)} className="tabular-nums">
                {formatGridDateLabel(e.dateIso)} · {e.time}
              </li>
            ))}
          </ul>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2 h-7 text-xs text-muted-foreground"
            onClick={() => {
              setActiveInstructorId("");
              setPendingSelection(null);
              onEntriesChange([], "");
            }}
          >
            {t("adminBookingClearSelectedSlots")}
          </Button>
        </div>
      ) : null}

      {!cellClickMode && slotModal ? (
        <AdminInstructorDaySlotsModal
          open
          onOpenChange={(open) => {
            if (!open) setSlotModal(null);
          }}
          instructorId={slotModal.instructor.id}
          instructorName={slotModal.instructor.name}
          branchId={slotModal.branchId || bookingBranchId}
          dateIso={slotModal.dateIso}
          initialSelected={pendingSource?.entries ?? selectedEntries}
          maxSelectableSlots={maxSelectableSlots}
          maxSelectableSlotsErrorKey={maxSelectableSlotsErrorKey}
          slotSource={slotSource}
          t={t}
          onConfirm={(entries) => {
            const instructorId = slotModal.instructor.id;
            const pickedBranchId = slotModal.branchId;
            const normalized = sortSlotEntriesChrono(entries);
            setPendingSelection({ instructorId, branchId: pickedBranchId, entries: normalized });
            setActiveInstructorId(instructorId);
            onEntriesChange(normalized, instructorId);
            setSlotModal(null);
            void loadBusy();
            onInstructorPicked(instructorId, pickedBranchId);
          }}
        />
      ) : null}
    </div>
  );
}
