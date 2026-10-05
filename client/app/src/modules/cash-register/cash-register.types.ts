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
