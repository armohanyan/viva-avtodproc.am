export const PRACTICAL_LESSON_TYPES = ["exam", "city"] as const;

export type PracticalLessonType = (typeof PRACTICAL_LESSON_TYPES)[number];

export type InstructorFilterInput = {
  lessonType: PracticalLessonType | "";
  cityId: string;
  /** Branch IDs the student selected for this city (from branch directory). */
  branchIds?: readonly string[];
};

type InstructorWithBranches = {
  availableBranchIds?: readonly string[];
};

type InstructorForPracticalBooking = InstructorWithBranches & {
  teachesPractical: boolean;
};

/** True when the instructor is linked to at least one of the given branch ids (N:N via `instructor_branches`). */
export function instructorServesAnyBranch(
  instructor: InstructorWithBranches,
  branchIds: readonly string[],
): boolean {
  if (branchIds.length === 0) return true;
  const served = new Set(instructor.availableBranchIds ?? []);
  return branchIds.some((id) => served.has(id));
}

export function filterInstructorsServingBranches<T extends InstructorWithBranches>(
  source: readonly T[],
  branchIds: readonly string[],
): T[] {
  if (branchIds.length === 0) return [...source];
  return source.filter((ins) => instructorServesAnyBranch(ins, branchIds));
}

/** Keep the current selection visible when branch assignments change. */
export function withSelectedInstructorByName<T extends { id: string; name: string }>(
  list: readonly T[],
  selectedName: string | undefined,
  all: readonly T[],
): T[] {
  if (!selectedName) return [...list];
  const selected = all.find((i) => i.name === selectedName);
  if (selected && !list.some((i) => i.id === selected.id)) {
    return [...list, selected];
  }
  return [...list];
}

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
