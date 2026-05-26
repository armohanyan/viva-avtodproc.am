import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TranslationKey } from "src/lib/i18n";
import type { Instructor } from "src/data/instructors";
import type { LessonBookingPayload } from "src/components/LessonBookingCalendar";
import AdminInstructorAvailabilityTable from "./AdminInstructorAvailabilityTable";
import { sortSlotEntriesChrono, sortTimesUnique } from "./adminAvailabilityGrid";

type Props = {
  hint?: string;
  blockingMessage?: string;
  selectedInstructorId: string;
  instructors: readonly Instructor[];
  onInstructorChange: (instructorUserId: string, options?: { fromGridPick?: boolean }) => void;
  /** When admin picks a cell under another branch column, parent may update booking branch. */
  onBranchPicked?: (branchId: string, options?: { fromGridPick?: boolean }) => void;
  branchId: string;
  studentName: string;
  showInstructorPicker: boolean;
  onBookingConfirmed: (payload: LessonBookingPayload) => void;
  onAdminSelectionCleared?: () => void;
  calendarKey: string;
  t: (k: TranslationKey) => string;
  maxSelectableSlots?: number;
  maxSelectableSlotsErrorKey?: TranslationKey;
};

function entriesToPayload(
  entries: readonly { dateIso: string; time: string }[],
  instructorId: string,
  instructorName: string,
  studentLabel: string,
): LessonBookingPayload | null {
  const sorted = sortSlotEntriesChrono(entries);
  if (sorted.length === 0 || !instructorId) return null;
  const first = sorted[0];
  const sameDayTimes = sorted.filter((e) => e.dateIso === first.dateIso).map((e) => e.time);
  return {
    instructorUserId: instructorId,
    instructor: instructorName,
    dateIso: first.dateIso,
    time: sameDayTimes[0] ?? first.time,
    times: sortTimesUnique(sameDayTimes.length > 0 ? sameDayTimes : [first.time]),
    slotEntries: sorted.map((e) => ({ dateIso: e.dateIso.slice(0, 10), time: e.time })),
    studentLabel: studentLabel.trim(),
  };
}

export default function SlotSelector({
  hint,
  blockingMessage,
  selectedInstructorId,
  instructors,
  onInstructorChange,
  onBranchPicked,
  branchId,
  studentName,
  onBookingConfirmed,
  onAdminSelectionCleared,
  calendarKey,
  t,
  maxSelectableSlots,
  maxSelectableSlotsErrorKey,
}: Props) {
  const [entries, setEntries] = useState<{ dateIso: string; time: string }[]>([]);
  const [entriesInstructorId, setEntriesInstructorId] = useState("");
  const lastSyncKeyRef = useRef<string | null>(null);
  const onAdminSelectionClearedRef = useRef(onAdminSelectionCleared);
  const prevCalendarKeyRef = useRef<string | null>(null);

  onAdminSelectionClearedRef.current = onAdminSelectionCleared;

  useEffect(() => {
    setEntries([]);
    setEntriesInstructorId("");
    lastSyncKeyRef.current = null;
    if (prevCalendarKeyRef.current !== null && prevCalendarKeyRef.current !== calendarKey) {
      onAdminSelectionClearedRef.current?.();
    }
    prevCalendarKeyRef.current = calendarKey;
  }, [calendarKey]);

  const activeInstructorId = selectedInstructorId || instructors[0]?.id || "";

  const syncPayload = useCallback(
    (nextEntries: readonly { dateIso: string; time: string }[], instructorId: string) => {
      const ins = instructors.find((i) => i.id === instructorId);
      const payload = entriesToPayload(nextEntries, instructorId, ins?.name ?? "", studentName);
      const key = payload ? `${instructorId}|${JSON.stringify(payload.slotEntries)}` : null;
      if (key === null) {
        if (lastSyncKeyRef.current !== null) {
          lastSyncKeyRef.current = null;
          onAdminSelectionCleared?.();
        }
        return;
      }
      if (lastSyncKeyRef.current === key) return;
      lastSyncKeyRef.current = key;
      onBookingConfirmed(payload);
    },
    [instructors, studentName, onBookingConfirmed, onAdminSelectionCleared],
  );

  const handleEntriesChange = useCallback(
    (next: { dateIso: string; time: string }[], instructorId: string) => {
      setEntries(next);
      if (instructorId) setEntriesInstructorId(instructorId);
      else if (next.length === 0) setEntriesInstructorId("");
      const ownerId = instructorId || entriesInstructorId || activeInstructorId;
      if (next.length > 0) syncPayload(next, ownerId);
      else if (lastSyncKeyRef.current !== null) {
        lastSyncKeyRef.current = null;
        onAdminSelectionCleared?.();
      }
    },
    [activeInstructorId, entriesInstructorId, syncPayload, onAdminSelectionCleared],
  );

  const handleInstructorPicked = useCallback(
    (instructorUserId: string, pickedBranchId: string) => {
      const gridOpts = { fromGridPick: true as const };
      if (instructorUserId && instructorUserId !== selectedInstructorId) {
        onInstructorChange(instructorUserId, gridOpts);
      }
      if (pickedBranchId && pickedBranchId !== branchId) {
        onBranchPicked?.(pickedBranchId, gridOpts);
      }
    },
    [branchId, onBranchPicked, onInstructorChange, selectedInstructorId],
  );

  useEffect(() => {
    if (entries.length > 0) {
      const ownerId = entriesInstructorId || activeInstructorId;
      if (ownerId) syncPayload(entries, ownerId);
    }
  }, [activeInstructorId, entries, entriesInstructorId, syncPayload]);

  const gridInstructors = useMemo(() => [...instructors], [instructors]);

  if (blockingMessage) {
    return (
      <div className="space-y-2 pt-2 border-t border-border">
        {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
        <p className="text-xs text-amber-600 dark:text-amber-500">{blockingMessage}</p>
      </div>
    );
  }

  if (gridInstructors.length === 0) {
    return (
      <div className="space-y-2 pt-2 border-t border-border">
        {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
        <p className="text-xs text-amber-600 dark:text-amber-500">{t("adminBookingInstructorCalendarUnavailable")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 pt-2 border-t border-border">
      {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
      <AdminInstructorAvailabilityTable
        instructors={gridInstructors}
        bookingBranchId={branchId}
        studentName={studentName}
        selectionInstructorId={entriesInstructorId || activeInstructorId}
        pickerResetKey={calendarKey}
        selectedEntries={entries}
        onEntriesChange={handleEntriesChange}
        onInstructorPicked={handleInstructorPicked}
        maxSelectableSlots={maxSelectableSlots}
        maxSelectableSlotsErrorKey={maxSelectableSlotsErrorKey}
        t={t}
      />
    </div>
  );
}
