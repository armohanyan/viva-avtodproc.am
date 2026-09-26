export type DirectorPaymentMethod = "card" | "cash";

export type DirectorCashDirection = "in" | "out";

export type DirectorOptionCategory = "exp_type" | "sal_role" | "fuel_type";

export type DirectorDashboard = {
  totalRevenue: number;
  cardPos: number;
  cash: number;
  netProfit: number;
  totalExpense: number;
  fuel: number;
  salaryTotal: number;
  instructorHours: number;
  instructorSalary: number;
  fuelLiters: number;
};

export type DirectorMonthlyReport = {
  labels: string[];
  revenue: number[];
  expenses: number[];
  fuel: number[];
  salary: number[];
  netProfit: number[];
};

export type DirectorStudentAnalytics = {
  totalRealStudents: number;
  registeredStudents: number;
  newInPeriod: number;
  monthlyReport: {
    labels: string[];
    newStudents: number[];
  };
  byBranch: DirectorChartPoint[];
  registrationSplit: DirectorChartPoint[];
};

export type DirectorChartPoint = { label: string; value: number };

export type DirectorCashEntry = {
  id: number;
  source: "manual" | "finance" | "expense" | "fuel" | "repair";
  sourceId: number;
  readOnly: boolean;
  date: string;
  /** Yerevan local payment/event time: `YYYY-MM-DD HH:mm:ss`. */
  occurredAt: string;
  branchId: number | null;
  direction: DirectorCashDirection;
  paymentMethod: DirectorPaymentMethod;
  amount: number;
  comment: string | null;
  performedByUserId: number | null;
  performedByName: string | null;
};

export type DirectorCashSummary = {
  entries: DirectorCashEntry[];
  balance: number;
  periodIn: number;
  periodOut: number;
  periodCashIn: number;
  periodCardIn: number;
  periodCashOut: number;
  periodCardOut: number;
};

export type DirectorExpense = {
  id: number;
  date: string;
  branchId: number | null;
  expType: string;
  amount: number;
  paymentMethod: DirectorPaymentMethod;
  comment: string | null;
};

export type DirectorRepair = {
  id: number;
  date: string;
  carId: number | null;
  licensePlate: string | null;
  workDone: string;
  amount: number;
  paymentMethod: DirectorPaymentMethod;
  comment: string | null;
};

export type DirectorFuel = {
  id: number;
  date: string;
  instructorUserId: number | null;
  carId: number | null;
  fuelType: string;
  liters: number;
  amount: number;
  paymentMethod: DirectorPaymentMethod;
};

export type DirectorKm = {
  id: number;
  date: string;
  instructorUserId: number | null;
  km: number;
  comment: string | null;
};

export type DirectorInstructorHours = {
  id: number;
  date: string;
  instructorUserId: number | null;
  hours: number;
  comment: string | null;
};

export type DirectorSalary = {
  id: number;
  date: string;
  name: string;
  role: string;
  hours: number | null;
  hourlyRate: number | null;
  totalAmd: number;
  comment: string | null;
};

export type DirectorSalaryEmployeeKind = "instructor" | "theory_teacher";

export type DirectorCompensationType =
  | "fixed_monthly"
  | "hourly_practical"
  | "per_theory_lesson"
  | "per_group";

export type DirectorPayrollStatus = "calculated" | "approved" | "paid";

export type DirectorSalaryCalcLine = {
  ruleId: number | null;
  compensationType: DirectorCompensationType | "adjustment";
  roleLabel: string;
  quantity: number;
  rateAmd: number;
  subtotalAmd: number;
  description: string;
};

export type DirectorSalaryReportRow = {
  kind: DirectorSalaryEmployeeKind;
  employeeUserId: number;
  employeeName: string;
  lessonsCount: number;
  unpaidLessonsCount: number;
  partialUnpaidLessonsCount: number;
  /** Graphic slots with payment/completion flags (informational - still in lessonsCount). */
  excludedLessonsCount: number;
  ratePerLessonAmd: number;
  totalAmd: number;
  /** Configured monthly card amount when auto-monthly is on. Note only - not deducted. */
  cardTransferAmd: number | null;
  paid: {
    paymentId: number;
    title: string;
    periodStartIso: string;
    periodEndIso: string;
    lessonsCount: number | null;
    totalAmd: number;
    paidAtIso: string;
    status?: "approved" | "paid";
  } | null;
};

export type DirectorSalaryEmployeeRow = {
  employeeUserId: number;
  employeeName: string;
  fixedAmd: number;
  hoursCount: number;
  hoursAmd: number;
  lessonsCount: number;
  lessonsAmd: number;
  groupsCount: number;
  groupsAmd: number;
  adjustmentsAmd: number;
  totalAmd: number;
  cardTransferAmd: number | null;
  unpaidHoursCount: number;
  status: DirectorPayrollStatus;
  paid: DirectorSalaryReportRow["paid"];
  lines: DirectorSalaryCalcLine[];
};

export type DirectorSalaryReport = {
  startDate: string;
  endDate: string;
  instructorRateAmd: number;
  theoryTeacherRateAmd: number;
  rows: DirectorSalaryReportRow[];
  employees: DirectorSalaryEmployeeRow[];
};

export type DirectorSalaryLessonPaymentBucket = "payable" | "unpaid";

export type DirectorSalaryLessonRow = {
  id: number;
  /** Booking id for practical lessons; null for theory cohort sessions. */
  bookingId: number | null;
  dateIso: string;
  startTime: string;
  endTime: string | null;
  units: number;
  label: string;
  paymentBucket: DirectorSalaryLessonPaymentBucket;
};

export type DirectorSalaryLessons = {
  kind: DirectorSalaryEmployeeKind;
  employeeUserId: number;
  startDate: string;
  endDate: string;
  totalUnits: number;
  unpaidUnits: number;
  partialUnpaidUnits: number;
  excludedUnits: number;
  items: DirectorSalaryLessonRow[];
};

export type DirectorSalaryPayment = {
  id: number;
  title: string;
  kind: DirectorSalaryEmployeeKind | "other" | "payroll";
  employeeUserId: number | null;
  employeeName: string;
  periodStartIso: string;
  periodEndIso: string;
  lessonsCount: number | null;
  ratePerLessonAmd: number | null;
  totalAmd: number;
  status?: "approved" | "paid";
  breakdown?: DirectorSalaryCalcLine[] | null;
  notes: string | null;
  createdAtIso: string;
  createdByName: string | null;
};

export type DirectorCompensationRule = {
  id: number;
  staffEmployeeId: number | null;
  employeeUserId: number | null;
  employeeName: string;
  compensationType: DirectorCompensationType;
  roleLabel: string;
  rateAmd: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  notes: string | null;
  createdAtIso: string;
};

export type DirectorStaffEmployeePosition =
  | "instructor"
  | "theory_teacher"
  | "instructor_and_theory"
  | "director"
  | "admin"
  | "cleaner"
  | "other";

export type DirectorStaffEmployee = {
  id: number;
  name: string;
  userId: number | null;
  accountName: string | null;
  position: DirectorStaffEmployeePosition;
  jobTitle: string;
  startDateIso: string;
  phone: string | null;
  notes: string | null;
  isActive: boolean;
  createdAtIso: string;
};

export type DirectorSalaryAdjustment = {
  id: number;
  employeeUserId: number;
  employeeName: string;
  dateIso: string;
  kind: "bonus" | "additional" | "deduction" | "other";
  amountAmd: number;
  signedAmd: number;
  title: string;
  notes: string | null;
  createdAtIso: string;
};

export type DirectorSalaryCardTransfer = {
  id: number;
  instructorUserId: number;
  instructorName: string;
  amountAmd: number;
  autoMonthly: boolean;
  notes: string | null;
  createdAtIso: string;
};

export type DirectorRevenue = {
  id: number;
  date: string;
  branchId: number | null;
  amount: number;
  paymentMethod: DirectorPaymentMethod;
  isLegacy: boolean;
  comment: string | null;
};

export type DirectorDriverProfile = {
  instructorName: string;
  summary: { hours: number; km: number; liters: number; amount: number };
  rows: {
    date: string;
    hours: number;
    km: number;
    gasLiters: number;
    petrolLiters: number;
    totalLiters: number;
    amount: number;
    card: number;
    cash: number;
    lPer100: number;
    amdPerKm: number;
    kmPerHour: number;
  }[];
};
