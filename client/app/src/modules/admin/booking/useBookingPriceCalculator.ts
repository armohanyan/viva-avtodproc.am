import { useMemo } from "react";
import type { Instructor } from "src/data/instructors";
import type { LessonBookingPayload } from "src/components/LessonBookingCalendar";
import { parseAmdInput } from "src/pages/admin/finance/adminFinanceShared";
import type { AdminBookingFlowKind, AdminPackageOption, TheoryCohortOption } from "./types";
import { theoryGroupSlotPlanFromCohort } from "./theoryGroupSlotPlan";

export type BookingPriceInput = {
  flowKind: AdminBookingFlowKind;
  instructors: readonly Instructor[];
  instructorName: string;
  slotPick: LessonBookingPayload | null;
  theoryCohortId: string;
  theoryCohorts: readonly TheoryCohortOption[];
  selectedPackage: AdminPackageOption | null;
  packagePracticalSlots: LessonBookingPayload | null;
  packageTheorySlots: LessonBookingPayload | null;
};

/**
 * Client-side total aligned with server rules: hourly × slot count for lesson types;
 * package uses catalog price.
 */
export function computeBookingTotalAmd(input: BookingPriceInput): number {
  const { flowKind } = input;
  if (flowKind === "package" && input.selectedPackage) {
    const fromApi = Number((input.selectedPackage as { priceAmd?: unknown }).priceAmd);
    if (Number.isFinite(fromApi) && fromApi > 0) return fromApi;
    return Math.max(0, parseAmdInput(input.selectedPackage.price));
  }

  const slotCount = (pick: LessonBookingPayload | null) => {
    if (!pick) return 0;
    const n = pick.slotEntries?.length ?? 0;
    if (n > 0) return n;
    return pick.times?.length ?? 0;
  };

  if (flowKind === "practical") {
    const ins = input.instructors.find((i) => i.name === input.instructorName);
    const hourly = ins && Number.isFinite(ins.hourlyPrice) ? ins.hourlyPrice : 0;
    return hourly * slotCount(input.slotPick);
  }

  if (flowKind === "theory_group") {
    const c = input.theoryCohorts.find((x) => x.id === input.theoryCohortId);
    if (!c) return 0;
    if (c.priceAmd != null && Number.isFinite(Number(c.priceAmd)) && Number(c.priceAmd) >= 0) {
      return Math.round(Number(c.priceAmd));
    }
    const ins = input.instructors.find((i) => i.name === c.instructorName);
    const hourly = ins && Number.isFinite(ins.hourlyPrice) ? ins.hourlyPrice : 0;
    const plan = theoryGroupSlotPlanFromCohort(c);
    const n = plan?.times.length ?? 0;
    return hourly * n;
  }

  if (flowKind === "theory_personal") {
    const n = slotCount(input.slotPick);
    if (n === 0) return 0;
    const ins = input.instructors.find((i) => i.name === input.instructorName);
    const hourly = ins && Number.isFinite(ins.hourlyPrice) ? ins.hourlyPrice : 0;
    return hourly * n;
  }

  return 0;
}

export function useBookingPriceCalculator(input: BookingPriceInput): number {
  return useMemo(
    () => computeBookingTotalAmd(input),
    [
      input.flowKind,
      input.instructorName,
      input.theoryCohortId,
      input.slotPick,
      input.packagePracticalSlots,
      input.packageTheorySlots,
      input.selectedPackage,
      input.instructors,
      input.theoryCohorts,
    ],
  );
}
