export type FleetCar = {
  id: string;
  /** License plate */
  plate: string;
  make: string;
  model: string;
  year?: number;
  transmission?: "manual" | "automatic";
  notes?: string;
  /** Instructor account emails that may see this vehicle in the instructor panel */
  assignedInstructorEmails?: string[];
};

export type CarExpense = {
  id: string;
  carId: string;
  /** Amount in ֏ (drams) */
  amount: number;
  /** ISO date YYYY-MM-DD */
  date: string;
  /** What the money was spent for, e.g. insurance, repair */
  purpose: string;
  note?: string;
};
