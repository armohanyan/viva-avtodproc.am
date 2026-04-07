import { instructors } from "src/data/instructors";

/** Demo directory — same IDs as admin student (users) seed data */
export const DEMO_STUDENTS = [
  { id: "USR-001", name: "Ani Karapetyan", email: "ani@example.com" },
  { id: "USR-002", name: "Tigran Mkhitaryan", email: "tigran@example.com" },
  { id: "USR-003", name: "Nare Harutyunyan", email: "nare@example.com" },
  { id: "USR-004", name: "Suren Danielyan", email: "suren@example.com" },
  { id: "USR-005", name: "Mane Poghosyan", email: "mane@example.com" },
  { id: "USR-006", name: "Artak Sargsyan", email: "artak@example.com" },
] as const;

export type DemoStudent = (typeof DEMO_STUDENTS)[number];

export function getStudentById(id: string): DemoStudent | undefined {
  return DEMO_STUDENTS.find((s) => s.id === id);
}

/** Instructor names for `<select>` — directory + extra seed-only staff */
export function allInstructorNames(): string[] {
  return instructors.map((i) => i.name).sort((a, b) => a.localeCompare(b));
}
