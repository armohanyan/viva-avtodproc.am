export type TxStatus = "completed" | "pending" | "failed" | "refunded";
export type TxChannel = "online" | "pos" | "office" | "bank";
export type TxMethod = "card" | "idram" | "cash" | "transfer";
export type TxSource = "system" | "manual";
export type TxEntryType = "income" | "expense";
export type TxExpenseKind =
  | "salary"
  | "hourly_rate"
  | "rent"
  | "utilities"
  | "maintenance"
  | "marketing"
  | "booking_refund"
  | "other";

export type ManualFormShape = {
  studentDirectoryId: string;
  customer: string;
  email: string;
  description: string;
  branchId: string;
  channel: TxChannel;
  method: TxMethod;
  grossStr: string;
  feeStr: string;
  status: TxStatus;
  ref: string;
  datetimeLocal: string;
  bookingIdStr: string;
};

export type FinanceTx = {
  id: number;
  createdAt: string;
  customer: string;
  email: string;
  description: string;
  branchId: string;
  channel: TxChannel;
  method: TxMethod;
  grossAmd: number;
  feeAmd: number;
  status: TxStatus;
  providerRef: string;
  source: TxSource;
  entryType?: TxEntryType;
  expenseKind?: TxExpenseKind | null;
  employeeName?: string | null;
  units?: number | null;
  unitRateAmd?: number | null;
  bookingId: string | null;
  /** Original payment row for `booking_refund` lines (when set). */
  relatedPaymentTransactionId?: number | null;
};

/** Calendar day / ISO-style week (Mon–Sun) / calendar month in local time. */
export type FinanceLedgerPeriod = "day" | "week" | "month";

/** Last N calendar months through the current month (inclusive). */
export type FinanceOverviewPeriod = "1m" | "3m" | "6m" | "12m";

export type ExpenseBreakdownRow = {
  key: string;
  total: number;
  count: number;
};
