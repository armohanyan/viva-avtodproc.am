import type { Instructor } from "src/data/instructors";
import {
  filterInstructorsForPracticalBooking,
  type InstructorFilterInput,
} from "src/modules/instructors/instructor-booking";

export type CreateInstructorPayload = Omit<Instructor, "id">;

function uniqueValues<T extends string>(values: readonly T[] | undefined): T[] {
  if (!values || values.length === 0) return [];
  return Array.from(new Set(values));
}

function normalizeInstructorFields(instructor: Instructor): Instructor {
  const availableBranchIds = uniqueValues(instructor.availableBranchIds);

  return {
    ...instructor,
    availableBranchIds,
  };
}

export function createInstructor(
  current: readonly Instructor[],
  payload: CreateInstructorPayload,
): Instructor[] {
  const nextId = `INS-${String(current.length + 1).padStart(3, "0")}`;
  return [...current, normalizeInstructorFields({ ...payload, id: nextId })];
}

export function updateInstructor(
  current: readonly Instructor[],
  id: string,
  payload: Partial<Instructor>,
): Instructor[] {
  return current.map((item) => {
    if (item.id !== id) return item;
    return normalizeInstructorFields({ ...item, ...payload });
  });
}

export function getFilteredInstructors(
  source: readonly Instructor[],
  input: InstructorFilterInput,
  branchesForCity: readonly string[],
): Instructor[] {
  return filterInstructorsForPracticalBooking(source, input, branchesForCity) as Instructor[];
}
