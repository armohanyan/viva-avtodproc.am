import type { TranslationKey } from "src/lib/i18n";

export type StudentDemoBookingStatus =
  | "confirmed"
  | "pending"
  | "pending_prebook"
  | "pending_payment"
  | "cancelled"
  | "completed"
  | "refunded";

export type StudentDemoBooking = {
  id: string;
  dateIso: string;
  time: string;
  instructor: string;
  lessonTypeKey: Extract<TranslationKey, "lessonTypePractical" | "lessonTypeTheory">;
  status: StudentDemoBookingStatus;
};

function isUpcomingBooking(b: StudentDemoBooking, todayIso: string): boolean {
  if (b.status === "cancelled" || b.status === "completed" || b.status === "refunded") return false;
  return b.dateIso >= todayIso;
}

export function partitionStudentBookings(
  list: readonly StudentDemoBooking[],
  referenceDate = new Date(),
): {
  upcoming: StudentDemoBooking[];
  past: StudentDemoBooking[];
} {
  const todayIso = referenceDate.toISOString().slice(0, 10);
  const upcoming = list.filter((b) => isUpcomingBooking(b, todayIso)).slice();
  const past = list.filter((b) => !isUpcomingBooking(b, todayIso)).slice();
  upcoming.sort((a, b) => a.dateIso.localeCompare(b.dateIso) || a.time.localeCompare(b.time));
  past.sort((a, b) => b.dateIso.localeCompare(a.dateIso) || b.time.localeCompare(a.time));
  return { upcoming, past };
}

export function countUpcomingStudentBookings(list: readonly StudentDemoBooking[], referenceDate = new Date()): number {
  const todayIso = referenceDate.toISOString().slice(0, 10);
  return list.filter((b) => isUpcomingBooking(b, todayIso)).length;
}

