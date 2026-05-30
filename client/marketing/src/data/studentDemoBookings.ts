import type { TranslationKey } from "src/lib/i18n";
import type { CanonicalBookingStatus } from "src/types/booking.types";

export type StudentDemoBookingStatus = CanonicalBookingStatus;

/**
 * Human-readable slot range (`endTime` is exclusive end from the API).
 * Multi-hour theory blocks on the hour show the last slot start plus hour count;
 * practical / sub-hour slots show the real exclusive end without a duration suffix.
 */
export function formatBookingSlotRangeLabel(time: string, endTime?: string | null): string {
  if (endTime == null || endTime === "") return normalizeSlot(time);
  const sm = parseSlotMinutes(time);
  const em = parseSlotMinutes(endTime);
  if (!Number.isFinite(sm) || !Number.isFinite(em) || em <= sm) return normalizeSlot(time);

  const durationM = em - sm;
  const startLabel = normalizeSlot(time);
  const endLabel = normalizeSlot(endTime);

  if (durationM < 60) return `${startLabel}–${endLabel}`;
  if (durationM === 60) return startLabel;

  if (sm % 60 === 0 && durationM % 60 === 0) {
    const hours = durationM / 60;
    return `${startLabel}–${minutesToSlotLabel(em - 60)} (${hours}h)`;
  }

  return `${startLabel}–${endLabel}`;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function parseSlotMinutes(t: string): number {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(t).trim());
  if (!m) return NaN;
  return Number(m[1]) * 60 + Number(m[2]);
}

function minutesToSlotLabel(totalM: number): string {
  const h = Math.floor(totalM / 60) % 24;
  const min = totalM % 60;
  return `${pad2(h)}:${pad2(min)}`;
}

function normalizeSlot(t: string): string {
  return minutesToSlotLabel(parseSlotMinutes(t));
}

export type StudentDemoBooking = {
  id: string | number;
  dateIso: string;
  time: string;
  /** Present when loaded from the API (multi-hour bookings). */
  endTime?: string | null;
  /** Total price in AMD when known. */
  totalPriceAmd?: number | null;
  /** Present when loaded from the API (used for instructor flows). */
  instructorUserId?: string | number;
  instructor: string;
  lessonTypeKey: Extract<TranslationKey, "lessonTypePractical" | "lessonTypeTheory" | "lessonTypeTheoryPersonal">;
  status: StudentDemoBookingStatus;
  /** From API: server-side payment hold deadline (ISO). */
  holdExpiresAt?: string | null;
  holdExtensionCount?: number;
  /** From API when practical; max “+5 min” extensions allowed. */
  maxHoldExtensions?: number;
  /** From API: may submit office cancellation (≥24h, not already pending). */
  cancelRefundEligible?: boolean;
  /** From API (practical): hours until lesson (+04 policy); negative if started. */
  hoursUntilLesson?: number;
  cancellationRequestedAt?: string | null;
  /** From API: explicit payment lifecycle. */
  paymentStatus?: string | null;
  paymentRequiredAt?: string | null;
  /** From API: lesson is within the “pay within one month” window but not yet paid. */
  paymentRequiredNow?: boolean;
};

function isUpcomingBooking(b: StudentDemoBooking, todayIso: string): boolean {
  if (b.status === "cancelled" || b.status === "refunded") return false;
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

