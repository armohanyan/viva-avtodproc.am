export const PRACTICAL_LESSON_TYPES = ["exam", "city"] as const;

export type PracticalLessonType = (typeof PRACTICAL_LESSON_TYPES)[number];

export type InstructorFilterInput = {
  lessonType: PracticalLessonType | "";
  cityId: string;
  /** Branch IDs the student selected for this city (from branch directory). */
  branchIds?: readonly string[];
};

type InstructorForPracticalBooking = {
  teachesPractical: boolean;
  availableBranchIds: string[];
};

export function getLessonTypeLabel(type: PracticalLessonType): string {
  return type === "exam" ? "քննական" : "քաղաքային";
}

/**
 * @param branchesForCity — branch IDs that exist in the selected city (from `branchIdsInCity`).
 */
export function filterInstructorsForPracticalBooking(
  source: readonly InstructorForPracticalBooking[],
  input: InstructorFilterInput,
  branchesForCity: readonly string[],
): InstructorForPracticalBooking[] {
  const selectedBranchIds = new Set(input.branchIds ?? []);
  return source.filter((instructor) => {
    if (!instructor.teachesPractical) return false;
    if (!input.cityId || !input.lessonType) return false;

    if (branchesForCity.length === 0) return false;

    if (selectedBranchIds.size === 0) return false;
    const instructorBranches = instructor.availableBranchIds ?? [];
    return instructorBranches.some((id) => selectedBranchIds.has(id));
  });
}

export function validatePracticalBookingSelection(input: {
  lessonType: PracticalLessonType | "";
  cityId: string;
  branchIds?: readonly string[];
  branchesForCity: readonly string[];
}): string[] {
  const errors: string[] = [];

  if (!input.lessonType) errors.push("lessonType");
  if (!input.cityId) errors.push("city");

  if (input.cityId && input.branchesForCity.length === 0) {
    errors.push("noBranchesInCity");
  } else if (
    input.branchesForCity.length > 0 &&
    (!input.branchIds || input.branchIds.length === 0)
  ) {
    errors.push("branches");
  }

  return errors;
}
