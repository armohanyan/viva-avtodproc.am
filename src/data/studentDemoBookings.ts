import type { TranslationKey } from "src/lib/i18n";

export type StudentDemoBookingStatus = "confirmed" | "pending" | "cancelled" | "completed";

export type StudentDemoBooking = {
  id: string;
  dateIso: string;
  time: string;
  instructor: string;
  lessonTypeKey: Extract<TranslationKey, "lessonTypePractical" | "lessonTypeTheory">;
  status: StudentDemoBookingStatus;
};

/** Demo lesson bookings for the student dashboard (replace with API data later). */
export const STUDENT_DEMO_BOOKINGS: readonly StudentDemoBooking[] = [
  {
    id: "sb-1",
    dateIso: "2026-04-11",
    time: "10:00",
    instructor: "Armen Petrosyan",
    lessonTypeKey: "lessonTypePractical",
    status: "confirmed",
  },
  {
    id: "sb-2",
    dateIso: "2026-04-14",
    time: "14:00",
    instructor: "Narine Hovhannisyan",
    lessonTypeKey: "lessonTypeTheory",
    status: "confirmed",
  },
  {
    id: "sb-3",
    dateIso: "2026-04-18",
    time: "09:00",
    instructor: "Armen Petrosyan",
    lessonTypeKey: "lessonTypePractical",
    status: "pending",
  },
  {
    id: "sb-4",
    dateIso: "2026-03-22",
    time: "11:00",
    instructor: "Armen Petrosyan",
    lessonTypeKey: "lessonTypePractical",
    status: "completed",
  },
  {
    id: "sb-5",
    dateIso: "2026-03-08",
    time: "16:00",
    instructor: "Narine Hovhannisyan",
    lessonTypeKey: "lessonTypeTheory",
    status: "completed",
  },
  {
    id: "sb-6",
    dateIso: "2026-02-26",
    time: "15:00",
    instructor: "Armen Petrosyan",
    lessonTypeKey: "lessonTypePractical",
    status: "cancelled",
  },
];

function isUpcomingBooking(b: StudentDemoBooking, todayIso: string): boolean {
  if (b.status === "cancelled" || b.status === "completed") return false;
  return b.dateIso >= todayIso;
}

export function partitionStudentDemoBookings(referenceDate = new Date()): {
  upcoming: StudentDemoBooking[];
  past: StudentDemoBooking[];
} {
  const todayIso = referenceDate.toISOString().slice(0, 10);
  const upcoming = STUDENT_DEMO_BOOKINGS.filter((b) => isUpcomingBooking(b, todayIso)).slice();
  const past = STUDENT_DEMO_BOOKINGS.filter((b) => !isUpcomingBooking(b, todayIso)).slice();
  upcoming.sort((a, b) => a.dateIso.localeCompare(b.dateIso) || a.time.localeCompare(b.time));
  past.sort((a, b) => b.dateIso.localeCompare(a.dateIso) || b.time.localeCompare(a.time));
  return { upcoming, past };
}

export function countUpcomingStudentDemoBookings(referenceDate = new Date()): number {
  const todayIso = referenceDate.toISOString().slice(0, 10);
  return STUDENT_DEMO_BOOKINGS.filter((b) => isUpcomingBooking(b, todayIso)).length;
}
