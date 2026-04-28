import type { TranslationKey } from "src/lib/i18n";
import type { Instructor } from "src/data/instructors";
import LessonBookingCalendar, { type LessonBookingPayload } from "src/components/LessonBookingCalendar";

type Props = {
  hint: string;
  /** Shown when cohort not chosen (theory) or instructor missing */
  blockingMessage?: string;
  /** When set, calendar is shown */
  selectedInstructorId: string;
  instructors: readonly Instructor[];
  onInstructorChange: (instructorUserId: string) => void;
  branchId: string;
  studentName: string;
  showInstructorPicker: boolean;
  onBookingConfirmed: (payload: LessonBookingPayload) => void;
  onAdminSelectionCleared?: () => void;
  calendarKey: string;
  t: (k: TranslationKey) => string;
};

export default function SlotSelector({
  hint,
  blockingMessage,
  selectedInstructorId,
  instructors,
  onInstructorChange,
  branchId,
  studentName,
  showInstructorPicker,
  onBookingConfirmed,
  onAdminSelectionCleared,
  calendarKey,
  t,
}: Props) {
  return (
    <div className="space-y-2 pt-2 border-t border-border">
      <p className="text-sm text-muted-foreground">{hint}</p>
      {blockingMessage ? (
        <p className="text-xs text-amber-600 dark:text-amber-500">{blockingMessage}</p>
      ) : !selectedInstructorId ? (
        <p className="text-xs text-amber-600 dark:text-amber-500">{t("adminBookingInstructorCalendarUnavailable")}</p>
      ) : (
        <LessonBookingCalendar
          key={calendarKey}
          mode="admin"
          instructors={instructors}
          selectedInstructorId={selectedInstructorId}
          onInstructorChange={onInstructorChange}
          branchId={branchId}
          studentName={studentName}
          showInstructorPicker={showInstructorPicker}
          onAdminSelectionCleared={onAdminSelectionCleared}
          onBookingConfirmed={onBookingConfirmed}
          adminSuppressSummaryCard
        />
      )}
    </div>
  );
}
