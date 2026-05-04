import { AMD_CURRENCY_SUFFIX, AMD_NUMBER_LOCALE } from "src/constants/finance.constants";

export function formatAmd(n: number): string {
  return `${n.toLocaleString(AMD_NUMBER_LOCALE)} ${AMD_CURRENCY_SUFFIX}`;
}

export function parseAmdInput(raw: string): number {
  const n = Number.parseFloat(String(raw).replace(/[\s,]/g, ""));
  if (!Number.isFinite(n) || n < 0) return NaN;
  return Math.round(n);
}
