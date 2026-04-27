/** Best-effort AMD integer from a human display string (e.g. "45,000 ֏", "12000"). */
export function parseAmdFromPriceDisplay(input: string): number {
  const s = String(input ?? '').replace(/[^\d]/g, '');
  if (!s) return 0;
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}
