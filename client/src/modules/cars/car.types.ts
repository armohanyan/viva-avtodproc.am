export type FleetCar = {
  id: string;
  /** License plate */
  plate: string;
  /** Vehicle identification number */
  vin?: string;
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
  /** Where the payment was made (same vocabulary as finance intake). */
  channel?: "online" | "pos" | "office" | "bank";
  method?: "card" | "idram" | "cash" | "transfer";
};
