import { useCallback, useEffect, useMemo, useState } from "react";
import type { AvailabilityBlock } from "src/modules/instructors/instructorAvailability";
import { isSlotBlockedByAvailabilityRules, normalizeAvailabilityBlocksFromApi } from "src/modules/instructors/instructorAvailability";
import {
  type BranchScheduleRule,
  branchScheduleBlockReason,
  defaultBranchScheduleRules,
  hourlySlotStartsForBranchDate,
  isSlotBlockedByBranchScheduleRules,
  isSlotDateBeforeToday,
  isSlotStartInPast,
  normalizeBranchScheduleFromApi,
  type SlotUnavailabilityReason,
} from "src/modules/booking/booking-slot.util";
import { yerevanTodayIso } from "src/lib/yerevanLessonCalendar";
import { vivaApiJson } from "src/lib/vivaApi";
import { padSlotTime, type InstructorBusySlotRow } from "./adminAvailabilityGrid";

export type DaySlotStatus = "available" | "unavailable";

export type DaySlotRow = {
  time: string;
  status: DaySlotStatus;
  reason: SlotUnavailabilityReason | null;
};

type Params = {
  instructorId: string;
  branchId: string;
  dateIso: string;
  open: boolean;
  ignoreBusyBookingId?: string;
};

export function useInstructorDaySlots({
  instructorId,
  branchId,
  dateIso,
  open,
  ignoreBusyBookingId = "",
}: Params) {
  const [availabilityBlocks, setAvailabilityBlocks] = useState<AvailabilityBlock[]>([]);
  const [busySlots, setBusySlots] = useState<InstructorBusySlotRow[]>([]);
  const [branchScheduleRules, setBranchScheduleRules] = useState<BranchScheduleRule[]>(() =>
    defaultBranchScheduleRules(),
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !instructorId || !dateIso) {
      setAvailabilityBlocks([]);
      setBusySlots([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const busyQ = new URLSearchParams({ from: dateIso, to: dateIso });
        if (ignoreBusyBookingId.trim()) {
          busyQ.set("excludeBookingId", ignoreBusyBookingId.trim());
        }
        const [blocks, busy] = await Promise.all([
          vivaApiJson<AvailabilityBlock[]>(
            `/instructors/${encodeURIComponent(instructorId)}/availability-blocks`,
          ),
          vivaApiJson<InstructorBusySlotRow[]>(
            `/instructors/${encodeURIComponent(instructorId)}/busy-slots?${busyQ.toString()}`,
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
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [open, instructorId, dateIso, ignoreBusyBookingId]);

  useEffect(() => {
    const bid = branchId.trim();
    if (!open || !bid) {
      setBranchScheduleRules(defaultBranchScheduleRules());
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const rules = await vivaApiJson<unknown>(`/branches/${encodeURIComponent(bid)}/booking-schedule`);
        if (!cancelled) setBranchScheduleRules(normalizeBranchScheduleFromApi(rules));
      } catch {
        if (!cancelled) setBranchScheduleRules(defaultBranchScheduleRules());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, branchId]);

  const yerevanToday = useMemo(() => yerevanTodayIso(), [dateIso, open]);

  const busyKeys = useMemo(() => {
    const s = new Set<string>();
    for (const b of busySlots) {
      s.add(`${b.dateIso.slice(0, 10)}\t${padSlotTime(b.time)}`);
    }
    return s;
  }, [busySlots]);

  const slots = useMemo((): DaySlotRow[] => {
    const dayHours = new Set(hourlySlotStartsForBranchDate(dateIso, branchScheduleRules));
    const times = [...dayHours].sort((a, b) => a.localeCompare(b));
    return times.map((time) => {
      const slot = padSlotTime(time);
      if (!dayHours.has(slot)) {
        return { time: slot, status: "unavailable" as const, reason: "outside_hours" as const };
      }
      if (loading) {
        return { time: slot, status: "unavailable" as const, reason: "unavailable" as const };
      }
      if (isSlotDateBeforeToday(dateIso, yerevanToday) || isSlotStartInPast(dateIso, slot)) {
        return { time: slot, status: "unavailable" as const, reason: "past" as const };
      }
      const branchReason = branchScheduleBlockReason(dateIso, slot, branchScheduleRules);
      if (branchReason === "branch_closed") {
        return { time: slot, status: "unavailable" as const, reason: "branch_closed" as const };
      }
      if (branchReason === "outside_hours" || isSlotBlockedByBranchScheduleRules(dateIso, slot, branchScheduleRules)) {
        return { time: slot, status: "unavailable" as const, reason: "outside_hours" as const };
      }
      const key = `${dateIso.slice(0, 10)}\t${slot}`;
      if (busyKeys.has(key)) {
        return { time: slot, status: "unavailable" as const, reason: "unavailable" as const };
      }
      if (isSlotBlockedByAvailabilityRules(dateIso, slot, availabilityBlocks)) {
        return { time: slot, status: "unavailable" as const, reason: "unavailable" as const };
      }
      return { time: slot, status: "available" as const, reason: null };
    });
  }, [dateIso, branchScheduleRules, loading, yerevanToday, busyKeys, availabilityBlocks]);

  const availableSlots = useMemo(() => slots.filter((s) => s.status === "available"), [slots]);

  return { slots, availableSlots, loading };
}
