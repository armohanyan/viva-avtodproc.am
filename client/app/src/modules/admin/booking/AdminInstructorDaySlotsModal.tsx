import { useEffect, useMemo, useState } from "react";
import { AppModal } from "src/components/AppModal";
import { Button } from "src/components/ui/button";
import type { TranslationKey } from "src/lib/i18n";
import { cn } from "src/lib/utils";
import {
  formatGridDateLabel,
  mergeSlotEntries,
  padSlotTime,
  slotEntryKey,
  sortSlotEntriesChrono,
} from "./adminAvailabilityGrid";
import { useInstructorDaySlots } from "./useInstructorDaySlots";

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
  onConfirm,
  t,
}: Props) {
  const [picked, setPicked] = useState<{ dateIso: string; time: string }[]>([]);
  const [capError, setCapError] = useState(false);

  const { slots, loading } = useInstructorDaySlots({
    instructorId,
    branchId,
    dateIso,
    open,
  });

  useEffect(() => {
    if (!open) return;
    const forDay = initialSelected.filter((e) => e.dateIso.slice(0, 10) === dateIso.slice(0, 10));
    setPicked(sortSlotEntriesChrono(forDay));
    setCapError(false);
  }, [open, dateIso, initialSelected]);

  const pickedKeys = useMemo(() => new Set(picked.map((e) => slotEntryKey(e.dateIso, e.time))), [picked]);

  const toggleSlot = (time: string) => {
    const key = slotEntryKey(dateIso, time);
    if (pickedKeys.has(key)) {
      setPicked((prev) => prev.filter((e) => slotEntryKey(e.dateIso, e.time) !== key));
      setCapError(false);
      return;
    }
    const otherDays = initialSelected.filter((e) => e.dateIso.slice(0, 10) !== dateIso.slice(0, 10));
    const merged = mergeSlotEntries(otherDays, [...picked, { dateIso: dateIso.slice(0, 10), time: padSlotTime(time) }]);
    if (maxSelectableSlots != null && merged.length > maxSelectableSlots) {
      setCapError(true);
      return;
    }
    setPicked((prev) => sortSlotEntriesChrono([...prev, { dateIso: dateIso.slice(0, 10), time: padSlotTime(time) }]));
    setCapError(false);
  };

  const handleDone = () => {
    const otherDays = initialSelected.filter((e) => e.dateIso.slice(0, 10) !== dateIso.slice(0, 10));
    onConfirm(mergeSlotEntries(otherDays, picked));
    onOpenChange(false);
  };

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title={
        <span className="text-primary font-semibold">
          {instructorName}
          <span className="text-muted-foreground font-normal"> · </span>
          {formatGridDateLabel(dateIso)}
        </span>
      }
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
      {loading ? (
        <p className="text-sm text-muted-foreground py-4">{t("instructorAvailabilityCalendarLoading")}</p>
      ) : slots.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">{t("bookingNoSlotsInWeek")}</p>
      ) : (
        <div className="max-h-[min(60vh,420px)] overflow-y-auto space-y-2 pr-1">
          {slots.map((slot) => {
            const isAvailable = slot.status === "available";
            const isSelected = pickedKeys.has(slotEntryKey(dateIso, slot.time));
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
