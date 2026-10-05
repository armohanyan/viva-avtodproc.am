import type { DirectorCashEntry, DirectorCashSummary } from "./director.types";

function apiNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function normalizeDirectorCashSummary(data: DirectorCashSummary | null | undefined): DirectorCashSummary {
  const entries = Array.isArray(data?.entries)
    ? data.entries.map((e) => ({
        ...e,
        source: e.source ?? "manual",
        sourceId: e.sourceId ?? e.id,
        readOnly:
          Boolean(e.readOnly) ||
          e.source === "finance" ||
          e.source === "expense" ||
          e.source === "fuel" ||
          e.source === "repair",
        paymentMethod: e.paymentMethod === "cash" ? "cash" : "card",
        amount: apiNumber(e.amount),
      }))
    : [];
  return {
    entries,
    balance: apiNumber(data?.balance),
    periodIn: apiNumber(data?.periodIn),
    periodOut: apiNumber(data?.periodOut),
    periodCashIn: apiNumber(data?.periodCashIn),
    periodCardIn: apiNumber(data?.periodCardIn),
    periodCashOut: apiNumber(data?.periodCashOut),
    periodCardOut: apiNumber(data?.periodCardOut),
  };
}

export type { DirectorCashEntry, DirectorCashSummary };
