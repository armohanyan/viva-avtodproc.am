import type { DirectorCashDirection } from "src/modules/director/director.types";

export type CashShiftStatus = "OPEN" | "CLOSED";

export type CashShiftSummary = {
  id: number;
  adminId: number;
  adminName: string;
  branchId: number;
  branchName: string;
  status: CashShiftStatus;
  openingBalance: number;
  cashInTotal: number;
  cashOutTotal: number;
  cardInTotal: number;
  cardOutTotal: number;
  expectedBalance: number;
  actualBalance: number | null;
  difference: number | null;
  openedAt: string;
  closedAt: string | null;
};

export type CashShiftLine = {
  id: number;
  source: "manual" | "finance" | "expense" | "fuel" | "repair";
  sourceId: number;
  shiftId: number | null;
  editable: boolean;
  date: string;
  occurredAt: string;
  direction: DirectorCashDirection;
  paymentMethod: "cash" | "card";
  amount: number;
  comment: string | null;
  performedByName: string | null;
  countsTowardExpected: boolean;
  unassigned: boolean;
};

export type CashShiftDetail = {
  shift: CashShiftSummary;
  entries: CashShiftLine[];
};

export type CashRegisterMethodTotals = {
  cash: number;
  card: number;
  total: number;
  paymentCount: number;
};

export type CashRegisterManagerRow = CashRegisterMethodTotals & {
  managerName: string;
  branchId: number | null;
  branchName: string;
};

export type CashRegisterBranchRow = CashRegisterMethodTotals & {
  branchId: number | null;
  branchName: string;
};

export type CashRegisterPeriodEntry = {
  id: number;
  source: CashShiftLine["source"];
  sourceId: number;
  readOnly: boolean;
  date: string;
  occurredAt: string;
  branchId: number | null;
  branchName: string;
  direction: DirectorCashDirection;
  paymentMethod: "cash" | "card";
  amount: number;
  comment: string | null;
  performedByName: string | null;
};

export type CashRegisterPeriodSummary = {
  balance: number;
  totals: {
    periodIn: number;
    periodOut: number;
    periodCashIn: number;
    periodCardIn: number;
    periodCashOut: number;
    periodCardOut: number;
  };
  byManager: CashRegisterManagerRow[];
  byBranch: CashRegisterBranchRow[];
  entries: CashRegisterPeriodEntry[];
};
