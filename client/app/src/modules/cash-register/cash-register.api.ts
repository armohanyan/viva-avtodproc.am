import { vivaApiJson } from "src/lib/vivaApi";
import type { DirectorCashDirection } from "src/modules/director/director.types";
import type { CashShiftDetail, CashShiftSummary } from "./cash-register.types";

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

export function fetchCashRegisterShifts(startDate: string, endDate: string): Promise<CashShiftSummary[]> {
  const q = new URLSearchParams({ startDate, endDate });
  return vivaApiJson<CashShiftSummary[]>(`${BASE}/shifts?${q}`).then((rows) =>
    (Array.isArray(rows) ? rows : []).map(normalizeSummary),
  );
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
