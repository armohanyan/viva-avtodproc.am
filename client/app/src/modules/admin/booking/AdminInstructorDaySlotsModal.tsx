import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AppModal } from "src/components/AppModal";
import { Button } from "src/components/ui/button";
import type { TranslationKey } from "src/lib/i18n";
import { yerevanAddCalendarDays, yerevanTodayIso } from "src/lib/yerevanLessonCalendar";
import { cn } from "src/lib/utils";
import {
  armenianWeekdayShort,
  formatGridDateLabel,
  mergeSlotEntries,
  padSlotTime,
  slotEntryKey,
  sortSlotEntriesChrono,
} from "./adminAvailabilityGrid";
import { useInstructorDaySlots, type InstructorDaySlotSource } from "./useInstructorDaySlots";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instructorId: string;
  instructorName: string;
  branchId: string;
  dateIso: string;
  initialSelected: readonly { dateIso: string; time: string }[];
  maxSelectableSlots?: number;
  maxSelectableSlotsErrorKey?: TranslationKey;
  slotSource?: InstructorDaySlotSource;
  onConfirm: (entries: { dateIso: string; time: string }[]) => void;
  t: (k: TranslationKey) => string;
};

export default function AdminInstructorDaySlotsModal({
  open,
  onOpenChange,
  instructorId,
  instructorName,
  branchId,
  dateIso,
  initialSelected,
  maxSelectableSlots,
  maxSelectableSlotsErrorKey = "adminBookingValPackagePracticalCount",
  slotSource = "branch",
  onConfirm,
  t,
}: Props) {
  const [viewDateIso, setViewDateIso] = useState(dateIso.slice(0, 10));
  const [sessionEntries, setSessionEntries] = useState<{ dateIso: string; time: string }[]>([]);
  const [capError, setCapError] = useState(false);

  const viewDay = viewDateIso.slice(0, 10);
  const todayIso = useMemo(() => yerevanTodayIso(), [open]);

  const { slots, loading } = useInstructorDaySlots({
    instructorId,
    branchId,
    dateIso: viewDay,
    open,
    slotSource,
  });

  useEffect(() => {
    if (!open) return;
    setViewDateIso(dateIso.slice(0, 10));
    setSessionEntries(sortSlotEntriesChrono([...initialSelected]));
    setCapError(false);
  }, [open, dateIso, initialSelected]);

  const pickedKeys = useMemo(
    () => new Set(sessionEntries.map((e) => slotEntryKey(e.dateIso, e.time))),
    [sessionEntries],
  );

  const otherDayEntries = useMemo(
    () => sessionEntries.filter((e) => e.dateIso.slice(0, 10) !== viewDay),
    [sessionEntries, viewDay],
  );

  const canGoPrevDay = viewDay > todayIso;

  const toggleSlot = (time: string) => {
    const key = slotEntryKey(viewDay, time);
    if (pickedKeys.has(key)) {
      setSessionEntries((prev) => prev.filter((e) => slotEntryKey(e.dateIso, e.time) !== key));
      setCapError(false);
      return;
    }
    const merged = mergeSlotEntries(sessionEntries, [
      { dateIso: viewDay, time: padSlotTime(time) },
    ]);
    if (maxSelectableSlots != null && merged.length > maxSelectableSlots) {
      setCapError(true);
      return;
    }
    setSessionEntries(merged);
    setCapError(false);
  };

  const handleDone = () => {
    onConfirm(sessionEntries);
    onOpenChange(false);
  };

  const viewWeekday = armenianWeekdayShort(viewDay);

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title={<span className="text-primary font-semibold">{instructorName}</span>}
      contentClassName="max-w-md sm:max-w-lg"
      bodyClassName="px-4 pb-4"
      footer={
        <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button type="button" onClick={handleDone}>
            {t("adminBookingSlotsModalDone")}
          </Button>
        </div>
      }
    >
      <div className="flex items-center justify-between gap-2 mb-3 -mt-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          disabled={!canGoPrevDay}
          onClick={() => setViewDateIso((d) => yerevanAddCalendarDays(d, -1))}
          aria-label={t("adminBookingSlotsModalPrevDay")}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1 text-center">
          <p className="text-sm font-semibold text-foreground tabular-nums">{formatGridDateLabel(viewDay)}</p>
          {viewWeekday ? <p className="text-xs text-muted-foreground">{viewWeekday}</p> : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => setViewDateIso((d) => yerevanAddCalendarDays(d, 1))}
          aria-label={t("adminBookingSlotsModalNextDay")}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {otherDayEntries.length > 0 ? (
        <div className="rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 mb-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">
            {t("adminBookingSlotsModalOtherDays")}
          </p>
          <ul className="space-y-0.5 text-xs text-foreground tabular-nums max-h-20 overflow-y-auto">
            {sortSlotEntriesChrono(otherDayEntries).map((e) => (
              <li key={slotEntryKey(e.dateIso, e.time)}>
                {formatGridDateLabel(e.dateIso)} · {e.time}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground py-4">{t("instructorAvailabilityCalendarLoading")}</p>
      ) : slots.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">{t("bookingNoSlotsInWeek")}</p>
      ) : (
        <div className="max-h-[min(60vh,420px)] overflow-y-auto space-y-2 pr-1">
          {slots.map((slot) => {
            const isAvailable = slot.status === "available";
            const isSelected = pickedKeys.has(slotEntryKey(viewDay, slot.time));
            return (
              <button
                key={slot.time}
                type="button"
                disabled={!isAvailable && !isSelected}
                onClick={() => {
                  if (isAvailable || isSelected) toggleSlot(slot.time);
                }}
                className={cn(
                  "w-full text-left rounded-lg border px-3 py-2.5 transition-colors relative overflow-hidden",
                  isSelected
                    ? "border-primary bg-primary/15 ring-1 ring-primary/40"
                    : isAvailable
                      ? "border-border bg-card hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
                      : "border-border/60 bg-muted/30 opacity-60 cursor-not-allowed",
                )}
              >
                <span
                  className={cn(
                    "absolute left-0 top-0 bottom-0 w-1",
                    isSelected ? "bg-primary" : isAvailable ? "bg-emerald-500" : "bg-muted-foreground/30",
                  )}
                  aria-hidden
                />
                <div className="pl-2 pr-6">
                  <div className="font-semibold text-foreground tabular-nums">{slot.time}</div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {isSelected
                      ? t("adminBookingSlotSelectedHint")
                      : isAvailable
                        ? t("adminBookingSlotFreeHint")
                        : t("bookingSlotUnavailable")}
                  </p>
                </div>
                {isAvailable && !isSelected ? (
                  <span
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                    aria-hidden
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      )}
      {capError ? <p className="text-xs text-red-600 mt-2">{t(maxSelectableSlotsErrorKey)}</p> : null}
    </AppModal>
  );
}
