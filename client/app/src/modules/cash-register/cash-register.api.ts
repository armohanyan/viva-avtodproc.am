import { vivaApiJson } from "src/lib/vivaApi";
import { normalizeDirectorCashSummary } from "src/modules/director/normalizeDirectorCash";
import type { DirectorCashDirection, DirectorCashSummary } from "src/modules/director/director.types";
import type {
  CashRegisterPeriodSummary,
  CashShiftDetail,
  CashShiftSummary,
} from "./cash-register.types";

const BASE = "/admin/cash-register";

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeSummary(raw: CashShiftSummary): CashShiftSummary {
  return {
    ...raw,
    openingBalance: num(raw.openingBalance),
    cashInTotal: num(raw.cashInTotal),
    cashOutTotal: num(raw.cashOutTotal),
    cardInTotal: num(raw.cardInTotal),
    cardOutTotal: num(raw.cardOutTotal),
    expectedBalance: num(raw.expectedBalance),
    actualBalance: raw.actualBalance != null ? num(raw.actualBalance) : null,
    difference: raw.difference != null ? num(raw.difference) : null,
  };
}

function normalizeDetail(raw: CashShiftDetail): CashShiftDetail {
  return {
    shift: normalizeSummary(raw.shift),
    entries: (raw.entries ?? []).map((e) => ({
      ...e,
      amount: num(e.amount),
    })),
  };
}

export type CashRegisterKassaQuery = {
  startDate: string;
  endDate: string;
  branchId?: string | null;
  adminUserId?: string | null;
};

function kassaQuery(input: CashRegisterKassaQuery): URLSearchParams {
  const q = new URLSearchParams({ startDate: input.startDate, endDate: input.endDate });
  if (input.adminUserId?.trim()) q.set("adminUserId", input.adminUserId.trim());
  else if (input.branchId?.trim()) q.set("branchId", input.branchId.trim());
  return q;
}

export function fetchCashRegisterKassa(input: CashRegisterKassaQuery): Promise<DirectorCashSummary> {
  return vivaApiJson<DirectorCashSummary>(`${BASE}/kassa?${kassaQuery(input)}`).then(
    normalizeDirectorCashSummary,
  );
}

export function fetchCashRegisterShifts(
  startDate: string,
  endDate: string,
  branchId?: string | null,
): Promise<CashShiftSummary[]> {
  const q = kassaQuery({ startDate, endDate, branchId });
  return vivaApiJson<CashShiftSummary[]>(`${BASE}/shifts?${q}`).then((rows) =>
    (Array.isArray(rows) ? rows : []).map(normalizeSummary),
  );
}

function normalizePeriodEntry(raw: CashRegisterPeriodSummary["entries"][number]) {
  return {
    ...raw,
    amount: num(raw.amount),
    readOnly:
      Boolean(raw.readOnly) ||
      raw.source === "finance" ||
      raw.source === "expense" ||
      raw.source === "fuel" ||
      raw.source === "repair",
  };
}

export function fetchCashRegisterPeriodSummary(
  input: CashRegisterKassaQuery,
): Promise<CashRegisterPeriodSummary> {
  const q = kassaQuery(input);
  return vivaApiJson<CashRegisterPeriodSummary>(`${BASE}/period-summary?${q}`).then((data) => ({
    balance: num(data?.balance),
    totals: {
      periodIn: num(data?.totals?.periodIn),
      periodOut: num(data?.totals?.periodOut),
      periodCashIn: num(data?.totals?.periodCashIn),
      periodCardIn: num(data?.totals?.periodCardIn),
      periodCashOut: num(data?.totals?.periodCashOut),
      periodCardOut: num(data?.totals?.periodCardOut),
    },
    byManager: Array.isArray(data?.byManager) ? data.byManager : [],
    byBranch: Array.isArray(data?.byBranch) ? data.byBranch : [],
    entries: Array.isArray(data?.entries) ? data.entries.map(normalizePeriodEntry) : [],
  }));
}

export function fetchCashRegisterShift(id: number): Promise<CashShiftDetail> {
  return vivaApiJson<CashShiftDetail>(`${BASE}/shifts/${id}`).then(normalizeDetail);
}

export function openCashRegisterShift(body: {
  branchId: number;
  openingBalance: number;
}): Promise<CashShiftDetail> {
  return vivaApiJson<CashShiftDetail>(`${BASE}/shifts`, {
    method: "POST",
    body,
  }).then(normalizeDetail);
}

export function closeCashRegisterShift(id: number, actualBalance: number): Promise<CashShiftDetail> {
  return vivaApiJson<CashShiftDetail>(`${BASE}/shifts/${id}/close`, {
    method: "POST",
    body: { actualBalance },
  }).then(normalizeDetail);
}

export function createCashRegisterEntry(
  shiftId: number,
  body: { direction: DirectorCashDirection; amount: number; comment?: string },
): Promise<CashShiftDetail> {
  return vivaApiJson<CashShiftDetail>(`${BASE}/shifts/${shiftId}/entries`, {
    method: "POST",
    body,
  }).then(normalizeDetail);
}

export function updateCashRegisterEntry(
  shiftId: number,
  entryId: number,
  body: { direction: DirectorCashDirection; amount: number; comment?: string },
): Promise<CashShiftDetail> {
  return vivaApiJson<CashShiftDetail>(`${BASE}/shifts/${shiftId}/entries/${entryId}`, {
    method: "PATCH",
    body,
  }).then(normalizeDetail);
}

export function deleteCashRegisterEntry(shiftId: number, entryId: number): Promise<void> {
  return vivaApiJson<void>(`${BASE}/shifts/${shiftId}/entries/${entryId}`, {
    method: "DELETE",
  });
}
