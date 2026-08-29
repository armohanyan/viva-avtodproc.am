import { parseAmdInput } from "src/pages/admin/finance/adminFinanceShared";
import { todayIso } from "./director.consts";
import type { DirectorPaymentMethod } from "./director.types";

export function directorAmd(raw: string): number {
  const n = parseAmdInput(raw);
  return Number.isFinite(n) ? n : 0;
}

export function directorDecimal(raw: string): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function directorOptionalId(raw: string): number | null {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function directorDate(raw: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : todayIso();
}

export function directorOptionalComment(raw: string): string | null {
  const t = raw.trim();
  return t || null;
}

export function directorPayment(raw: DirectorPaymentMethod): DirectorPaymentMethod {
  return raw === "cash" ? "cash" : "card";
}

export function directorText(raw: string): string {
  return raw.trim();
}
