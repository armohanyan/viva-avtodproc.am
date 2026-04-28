/** High-level admin “new booking” flow (maps to API lesson types + package composite). */
export type AdminBookingFlowKind = "practical" | "theory_group" | "package" | "theory_personal";

export type TheoryCohortOption = {
  id: string;
  name: string;
  /** Cohort period start (YYYY-MM-DD); used as the booking calendar date for group theory. */
  startDateIso: string;
  branchId: string;
  instructorName: string;
  status: string;
  sessionStartTime: string | null;
  sessionEndTime: string | null;
  /** Whole-group price (AMD). When missing or null, checkout uses instructor hourly × scheduled hours. */
  priceAmd?: number | null;
};

export type AdminPackageOption = {
  id: string;
  name: string;
  price: string;
  /** From API when present */
  priceAmd?: number;
  lessons: number;
  theoryLessons: number;
  status: string;
};
