import type { DirectorDashboard, DirectorMonthlyReport } from "src/modules/director/director.types";

export type FinancialReportSummary = {
  totalIncomeAmd: number;
  totalPaidAmountAmd: number;
  totalPartialPaymentsAmd: number;
  totalUnpaidDebtAmd: number;
  newStudentsCount: number;
  bookingsCreatedCount: number;
  paidBookingsCount: number;
  partialBookingsCount: number;
  unpaidBookingsCount: number;
  refundsCount: number;
  totalRefundAmountAmd: number;
  netRevenueAmd: number;
  completedLessonsCount: number;
  cancelledLessonsCount: number;
  pendingUpcomingBookingsCount: number;
};

export type FinancialReportOptional = {
  expensesTotalAmd: number;
  expensesCount: number;
  netProfitAmd: number;
  packageSalesCount: number;
  packageSalesAmountAmd: number;
  paymentsOnlineAmd: number;
  paymentsManualAmd: number;
  topBookingTypes: Array<{ type: string; count: number }>;
  branchComparison: Array<{
    branchId: number;
    branchName: string;
    incomeAmd: number;
    bookingsCount: number;
    newStudentsCount: number;
  }>;
};

export type FinancialReportInstructorRow = {
  instructorUserId: number;
  instructorName: string;
  branchId: number;
  branchName: string;
  practicalCount: number;
  theoryGroupCount: number;
  theoryPersonalCount: number;
  completedCount: number;
  cancelledCount: number;
  totalHours: number;
};

export type FinancialReportResponse = {
  meta: {
    startDate: string;
    endDate: string;
    branchId: number | null;
    branchName: string | null;
    generatedAtIso: string;
  };
  summary: FinancialReportSummary;
  bookings: Array<{
    id: number;
    createdAtIso: string;
    lessonDateIso: string;
    studentName: string;
    bookingType: string;
    instructorName: string;
    branchId: number;
    branchName: string;
    totalPriceAmd: number;
    paidAmountAmd: number;
    remainingAmd: number;
    paymentStatus: string;
    bookingStatus: string;
    createdByLabel: string | null;
  }>;
  newStudents: Array<{
    id: number;
    name: string;
    phone: string;
    phone2: string;
    registrationDateIso: string;
    branchId: number;
    branchName: string;
    sourceLabel: string | null;
  }>;
  refunds: Array<{
    id: number;
    dateIso: string;
    studentName: string;
    serviceLabel: string;
    refundAmountAmd: number;
    reason: string | null;
    processedByLabel: string | null;
  }>;
  instructorLessons: FinancialReportInstructorRow[];
  optional: FinancialReportOptional | null;
};

export type AdminReportsBundle = {
  financial: FinancialReportResponse;
  leads: { contactRequests: number; bookedCalls: number };
  director?: DirectorDashboard;
  monthlyTrend?: DirectorMonthlyReport;
};

export type AdminReportPoint = { label: string; value: number };

const BOOKING_TYPE_LABELS: Record<string, string> = {
  single: "Մեկ դաս",
  package: "Փաթեթ",
  group: "Խումբ",
  personal_theory: "Անհատական տես.",
};

export function bookingTypeLabel(type: string): string {
  return BOOKING_TYPE_LABELS[type] ?? type;
}

export function aggregateBookingsByMonth(
  bookings: FinancialReportResponse["bookings"],
): AdminReportPoint[] {
  const map = new Map<string, number>();
  for (const b of bookings) {
    const key = b.lessonDateIso.slice(0, 7);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({
      label: formatMonthLabel(key),
      value,
    }));
}

export function aggregateStudentsByBranch(
  students: FinancialReportResponse["newStudents"],
): AdminReportPoint[] {
  const map = new Map<string, number>();
  for (const s of students) {
    map.set(s.branchName, (map.get(s.branchName) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function formatMonthLabel(key: string): string {
  const months = ["Հնվ", "Փտվ", "Մար", "Ապր", "Մայ", "Հուն", "Հուլ", "Օգս", "Սեպ", "Հոկ", "Նոյ", "Դեկ"];
  const m = Number(key.slice(5, 7));
  return `${months[m - 1] ?? key.slice(5, 7)} ${key.slice(2, 4)}`;
}
