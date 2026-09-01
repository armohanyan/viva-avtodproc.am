export type DirectorPaymentMethod = "card" | "cash";

export type DirectorOptionCategory = "exp_type" | "sal_role" | "cash_type" | "fuel_type";

export type DirectorDashboard = {
  totalRevenue: number;
  cardPos: number;
  cash: number;
  netProfit: number;
  totalExpense: number;
  fuel: number;
  salaryTotal: number;
  cashBalance: number;
  instructorHours: number;
  instructorSalary: number;
  incashment: number;
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

export type DirectorChartPoint = { label: string; value: number };

export type DirectorCashEntry = {
  id: number;
  date: string;
  branchId: number | null;
  entryType: string;
  amount: number;
  comment: string | null;
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

export type DirectorSalaryReportRow = {
  kind: DirectorSalaryEmployeeKind;
  employeeUserId: number;
  employeeName: string;
  lessonsCount: number;
  ratePerLessonAmd: number;
  totalAmd: number;
  paid: {
    paymentId: number;
    title: string;
    periodStartIso: string;
    periodEndIso: string;
    lessonsCount: number | null;
    totalAmd: number;
    paidAtIso: string;
  } | null;
};

export type DirectorSalaryReport = {
  startDate: string;
  endDate: string;
  instructorRateAmd: number;
  theoryTeacherRateAmd: number;
  rows: DirectorSalaryReportRow[];
};

export type DirectorSalaryLessonRow = {
  id: number;
  dateIso: string;
  startTime: string;
  endTime: string | null;
  units: number;
  label: string;
};

export type DirectorSalaryLessons = {
  kind: DirectorSalaryEmployeeKind;
  employeeUserId: number;
  startDate: string;
  endDate: string;
  totalUnits: number;
  items: DirectorSalaryLessonRow[];
};

export type DirectorSalaryPayment = {
  id: number;
  title: string;
  kind: DirectorSalaryEmployeeKind | "other";
  employeeUserId: number | null;
  employeeName: string;
  periodStartIso: string;
  periodEndIso: string;
  lessonsCount: number | null;
  ratePerLessonAmd: number | null;
  totalAmd: number;
  notes: string | null;
  createdAtIso: string;
  createdByName: string | null;
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
