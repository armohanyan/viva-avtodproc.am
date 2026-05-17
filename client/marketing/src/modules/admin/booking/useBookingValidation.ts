import type { TranslationKey } from "src/lib/i18n";
import type { LessonBookingPayload } from "src/components/LessonBookingCalendar";
import type { AdminBookingFlowKind, AdminPackageOption, TheoryCohortOption } from "./types";
import { isTheoryCohortBookableStatus } from "./adminTheoryCohort";
import { theoryGroupSlotPlanFromCohort } from "./theoryGroupSlotPlan";
import type { PracticalLessonType } from "src/modules/instructors/instructor-booking";

export type BookingValidationResult = { ok: boolean; messageKeys: TranslationKey[] };

export type BookingValidationInput = {
  flowKind: AdminBookingFlowKind;
  /** May be string or number from selects / API */
  studentId: string | number | null | undefined;
  instructorName: string;
  slotPick: LessonBookingPayload | null;
  theoryCohortId: string;
  theoryCohorts: readonly TheoryCohortOption[];
  calendarInstructorId: string;
  selectedPackage: AdminPackageOption | null;
  packagePracticalSlots: LessonBookingPayload | null;
  packageTheoryCohortId: string;
  packageTheorySlots: LessonBookingPayload | null;
  packageTheoryCalendarInstructorId: string;
  practicalLessonType: PracticalLessonType | "";
  theoryThemeTitles: readonly string[];
};

function strTrim(v: unknown): string {
  return String(v ?? "").trim();
}

function hasSlotPickSlots(pick: LessonBookingPayload | null): boolean {
  if (!pick) return false;
  if ((pick.slotEntries?.length ?? 0) > 0) return true;
  return pick.times.length > 0;
}

function slotCount(pick: LessonBookingPayload | null): number {
  if (!pick) return 0;
  const entriesCount = pick.slotEntries?.length ?? 0;
  if (entriesCount > 0) return entriesCount;
  return pick.times.length;
}

export function validateAdminBookingAdd(input: BookingValidationInput): BookingValidationResult {
  const keys: TranslationKey[] = [];
  if (!strTrim(input.studentId)) {
    keys.push("adminBookingValSelectStudent");
  }

  if (input.flowKind === "practical") {
    if (!strTrim(input.practicalLessonType)) {
      keys.push("fillRequired");
    }
    if (!strTrim(input.instructorName)) {
      keys.push("adminBookingValSelectInstructor");
    }
    if (!hasSlotPickSlots(input.slotPick)) {
      keys.push("adminBookingValSelectSlots");
    }
    return { ok: keys.length === 0, messageKeys: keys };
  }

  if (input.flowKind === "theory_group") {
    const cohortId = strTrim(input.theoryCohortId);
    let cohort: TheoryCohortOption | undefined;
    if (!cohortId) {
      keys.push("adminBookingValSelectTheoryGroup");
    } else {
      cohort = input.theoryCohorts.find((x) => x.id === cohortId);
      if (!cohort || !isTheoryCohortBookableStatus(cohort.status)) {
        keys.push("adminBookingValSelectTheoryGroup");
      }
    }
    if (!input.calendarInstructorId) {
      keys.push("adminBookingInstructorCalendarUnavailable");
    }
    if (cohort && !theoryGroupSlotPlanFromCohort(cohort)) {
      keys.push("adminBookingValTheoryGroupSchedule");
    }
    return { ok: keys.length === 0, messageKeys: keys };
  }

  if (input.flowKind === "theory_personal") {
    if ((input.theoryThemeTitles ?? []).length === 0) {
      keys.push("fillRequired");
    }
    if (!strTrim(input.instructorName)) {
      keys.push("adminBookingValSelectInstructor");
    }
    if (!hasSlotPickSlots(input.slotPick)) {
      keys.push("adminBookingValSelectSlots");
    }
    return { ok: keys.length === 0, messageKeys: keys };
  }

  // package
  if (!input.selectedPackage) {
    keys.push("adminBookingValSelectPackage");
  } else {
    const pkg = input.selectedPackage;
    const nPrac = pkg.lessons ?? 0;
    const nTheory = pkg.theoryLessons ?? 0;
    if (nPrac > 0) {
      const got = slotCount(input.packagePracticalSlots);
      if (got > nPrac) {
        keys.push("adminBookingValPackagePracticalCount");
      }
    }
    if (nTheory > 0) {
      const gotTheory = slotCount(input.packageTheorySlots);
      if (gotTheory > nTheory) {
        keys.push("adminBookingValPackageTheoryCount");
      }
    }
    if (nPrac <= 0 && nTheory <= 0) {
      keys.push("adminBookingValPackageNoServices");
    }
  }

  return { ok: keys.length === 0, messageKeys: keys };
}
