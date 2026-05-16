/** Lesson delivery lifecycle (separate from booking payment `status`). */
export const LESSON_COMPLETION_STATUSES = [
  'scheduled',
  'completed',
  'missed',
  'cancelled',
  'cancelled_no_refund',
  'refunded',
] as const;

export type LessonCompletionStatus = (typeof LESSON_COMPLETION_STATUSES)[number];

export const LESSON_COMPLETION_TERMINAL = new Set<LessonCompletionStatus>([
  'completed',
  'missed',
  'cancelled',
  'cancelled_no_refund',
  'refunded',
]);

/** Booking rows that still represent an active scheduled/completed lesson for progress. */
export const BOOKING_STATUSES_COUNTED_FOR_PROGRESS = new Set(['confirmed', 'pending_payment']);
