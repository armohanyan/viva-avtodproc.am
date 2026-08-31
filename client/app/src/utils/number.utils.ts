/** Parse user-typed decimals; accepts `.` or `,` as the decimal separator. */
export function parseDecimalInput(raw: string): number {
  const s = String(raw).trim().replace(/\s/g, "");
  if (!s) return NaN;

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");

  if (lastComma >= 0 && lastDot >= 0) {
    const decimalSep = lastComma > lastDot ? "," : ".";
    const normalized =
      decimalSep === ","
        ? s.replace(/\./g, "").replace(",", ".")
        : s.replace(/,/g, "");
    return Number.parseFloat(normalized);
  }

  if (lastComma >= 0) {
    return Number.parseFloat(s.replace(",", "."));
  }

  return Number.parseFloat(s);
}
