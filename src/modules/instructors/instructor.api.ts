import type { Instructor } from "src/data/instructors";
import {
  type ArmeniaRegion,
  filterInstructorsForPracticalBooking,
  type InstructorFilterInput,
  type PracticalLessonType,
  type YerevanDistrict,
} from "src/modules/instructors/instructor-booking";

export type CreateInstructorPayload = Omit<Instructor, "id">;

function uniqueValues<T extends string>(values: readonly T[] | undefined): T[] {
  if (!values || values.length === 0) return [];
  return Array.from(new Set(values));
}

function normalizeInstructorFields(instructor: Instructor): Instructor {
  const availableRegions = uniqueValues<ArmeniaRegion>(instructor.availableRegions);
  const teachesPractical = instructor.teachesPractical;
  const lessonTypes = teachesPractical
    ? uniqueValues<PracticalLessonType>(instructor.lessonTypes)
    : [];

  const availableYerevanDistricts = availableRegions.includes("Yerevan")
    ? uniqueValues<YerevanDistrict>(instructor.availableYerevanDistricts)
    : undefined;

  return {
    ...instructor,
    availableRegions,
    lessonTypes,
    availableYerevanDistricts,
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
): Instructor[] {
  return filterInstructorsForPracticalBooking(source, input) as Instructor[];
}
