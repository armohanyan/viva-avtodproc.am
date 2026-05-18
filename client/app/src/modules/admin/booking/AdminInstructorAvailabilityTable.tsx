import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import AdminTableScroll from "src/components/AdminTableScroll";
import { Button } from "src/components/ui/button";
import type { Instructor } from "src/data/instructors";
import type { TranslationKey } from "src/lib/i18n";
import { vivaApiJson } from "src/lib/vivaApi";
import { useBranches } from "src/modules/branches";
import { cn } from "src/lib/utils";
import { yerevanAddCalendarDays } from "src/lib/yerevanLessonCalendar";
import AdminInstructorDaySlotsModal from "./AdminInstructorDaySlotsModal";
import {
  ADMIN_AVAILABILITY_GRID_DAYS,
  aggregateBusyCountsByInstructorDay,
  aggregatePendingCountsByInstructorDay,
  armenianWeekdayShort,
  buildBranchInstructorGroups,
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
  t,
}: Props) {
  const { branches } = useBranches();
  const [rangeStartIso, setRangeStartIso] = useState(defaultGridRangeStart);
  const [busyByInstructor, setBusyByInstructor] = useState<Map<string, InstructorBusySlotRow[]>>(new Map());
  const [gridLoading, setGridLoading] = useState(false);
  const [slotModal, setSlotModal] = useState<CellTarget | null>(null);
  const [activeInstructorId, setActiveInstructorId] = useState("");
  /** Updated synchronously on confirm so the grid reflects picks before parent state settles. */
  const [pendingSelection, setPendingSelection] = useState<{
    instructorId: string;
    entries: readonly { dateIso: string; time: string }[];
  } | null>(null);

  const dates = useMemo(() => gridDateRange(rangeStartIso), [rangeStartIso]);
  const rangeEndIso = dates[dates.length - 1] ?? rangeStartIso;

  const branchGroups = useMemo(
    () => buildBranchInstructorGroups(branches, instructors),
    [branches, instructors],
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
  }, [instructorIds, rangeStartIso, rangeEndIso]);

  useEffect(() => {
    void loadBusy();
  }, [loadBusy]);

  const lessonCounts = useMemo(
    () => aggregateBusyCountsByInstructorDay(instructorIds, busyByInstructor),
    [instructorIds, busyByInstructor],
  );

  useEffect(() => {
    setPendingSelection(null);
    setActiveInstructorId("");
  }, [pickerResetKey]);

  useEffect(() => {
    if (selectedEntries.length === 0) return;
    const ownerId = activeInstructorId || selectionInstructorId;
    if (!ownerId) return;
    setPendingSelection({ instructorId: ownerId, entries: selectedEntries });
  }, [selectedEntries, activeInstructorId, selectionInstructorId]);

  const pendingSource =
    pendingSelection && pendingSelection.entries.length > 0
      ? pendingSelection
      : selectedEntries.length > 0
        ? {
            instructorId: activeInstructorId || selectionInstructorId,
            entries: selectedEntries,
          }
        : null;

  const pendingLessonCounts = useMemo(() => {
    if (!pendingSource?.entries.length || !pendingSource.instructorId) return new Map<string, number>();
    return aggregatePendingCountsByInstructorDay(pendingSource.instructorId, pendingSource.entries);
  }, [pendingSource]);

  const selectionOwnerId = pendingSource?.instructorId || activeInstructorId || selectionInstructorId;

  const selectedByInstructorDay = useMemo(() => {
    const m = new Set<string>();
    if (!selectionOwnerId || !pendingSource?.entries.length) return m;
    for (const e of pendingSource.entries) {
      m.add(`${selectionOwnerId}|${e.dateIso.slice(0, 10)}`);
    }
    return m;
  }, [pendingSource, selectionOwnerId]);

  const rangeLabel = useMemo(() => {
    if (dates.length === 0) return "";
    return `${formatGridDateLabel(dates[0])} – ${formatGridDateLabel(dates[dates.length - 1])}`;
  }, [dates]);

  const canGoPrev = rangeStartIso > defaultGridRangeStart();

  return (
    <div className="space-y-3 min-w-0">
      <div className="flex items-center justify-end gap-2">
        <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={!canGoPrev}
            onClick={() => setRangeStartIso((s) => yerevanAddCalendarDays(s, -ADMIN_AVAILABILITY_GRID_DAYS))}
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
            onClick={() => setRangeStartIso((s) => yerevanAddCalendarDays(s, ADMIN_AVAILABILITY_GRID_DAYS))}
            aria-label={t("adminBookingAvailabilityGridNext")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
      </div>

      {gridLoading ? (
        <p className="text-xs text-muted-foreground">{t("instructorAvailabilityCalendarLoading")}</p>
      ) : null}

      {branchGroups.length === 0 ? (
        <p className="text-sm text-amber-600 dark:text-amber-500">{t("adminBookingInstructorCalendarUnavailable")}</p>
      ) : (
        <AdminTableScroll className="rounded-lg border border-primary/30">
          <table className="w-full text-sm border-collapse min-w-max">
            <thead>
              <tr className="border-b border-primary/20">
                <th
                  rowSpan={2}
                  className="sticky left-0 z-20 bg-background text-left text-primary font-semibold px-3 py-2 border-r border-primary/20 min-w-[7.5rem]"
                >
                  {t("adminBookingAvailabilityGridDateCol")}
                </th>
                {branchGroups.map((g) => (
                  <th
                    key={g.branchId}
                    colSpan={g.instructors.length}
                    className="text-center text-primary font-semibold px-2 py-2 border-r border-primary/15 last:border-r-0"
                  >
                    {g.branchName}
                  </th>
                ))}
              </tr>
              <tr className="border-b border-primary/20">
                {branchGroups.flatMap((g) =>
                  g.instructors.map((ins) => (
                    <th
                      key={`${g.branchId}-${ins.id}`}
                      className="text-center text-primary/90 text-xs font-medium px-1 py-1.5 border-r border-primary/10 last:border-r-0 min-w-[3.25rem] max-w-[5rem] truncate"
                      title={ins.name}
                    >
                      {ins.name.split(" ")[0]}
                    </th>
                  )),
                )}
              </tr>
            </thead>
            <tbody>
              {dates.map((dateIso) => (
                <tr key={dateIso} className="border-b border-border/40 hover:bg-primary/5">
                  <td className="sticky left-0 z-10 bg-background px-3 py-2 border-r border-primary/15 whitespace-nowrap">
                    <div className="text-primary font-medium tabular-nums">{formatGridDateLabel(dateIso)}</div>
                    <div className="text-[11px] text-primary/70">{armenianWeekdayShort(dateIso)}</div>
                  </td>
                  {branchGroups.flatMap((g) =>
                    g.instructors.map((ins) => {
                      const busyCount = lessonCountForCell(lessonCounts, ins.id, dateIso);
                      const pendingCount = lessonCountForCell(pendingLessonCounts, ins.id, dateIso);
                      const cellLabel =
                        pendingCount > 0 ? `${busyCount} + ${pendingCount}` : String(busyCount);
                      const hasPick =
                        selectionOwnerId === ins.id &&
                        selectedByInstructorDay.has(`${ins.id}|${dateIso.slice(0, 10)}`);
                      return (
                        <td key={`${dateIso}-${g.branchId}-${ins.id}`} className="p-0 border-r border-border/30 last:border-r-0">
                          <button
                            type="button"
                            disabled={!studentName.trim()}
                            onClick={() => {
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
                              setSlotModal({ instructor: ins, branchId: g.branchId, dateIso });
                            }}
                            className={cn(
                              "w-full min-h-10 py-1 flex items-center justify-center font-semibold tabular-nums transition-colors text-primary",
                              pendingCount > 0 ? "text-[11px] leading-tight" : "text-sm",
                              "hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                              hasPick && "ring-1 ring-inset ring-primary/60 bg-primary/10",
                              !studentName.trim() && "opacity-40 cursor-not-allowed",
                            )}
                            title={
                              studentName.trim()
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
                    }),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </AdminTableScroll>
      )}

      {pendingSource && pendingSource.entries.length > 0 ? (
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

      {slotModal ? (
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
          t={t}
          onConfirm={(entries) => {
            const instructorId = slotModal.instructor.id;
            const pickedBranchId = slotModal.branchId;
            const normalized = sortSlotEntriesChrono(entries);
            setPendingSelection({ instructorId, entries: normalized });
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
