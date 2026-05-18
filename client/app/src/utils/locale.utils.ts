import type { Lang } from "src/lib/i18n";

export function localeForLang(lang: Lang): string {
  switch (lang) {
    case "en":
      return "en-US";
    case "ru":
      return "ru-RU";
    case "am":
      return "hy-AM";
    default:
      return "en-US";
  }
}

/** Format a calendar date (YYYY-MM-DD) for display without timezone shift. */
export function formatShortDateFromIso(iso: string, lang: Lang): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(localeForLang(lang), {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Armenian month abbreviations (print / admin; avoids OS locale fallback). */
const ARMENIAN_MONTHS_SHORT = [
  "հնվ",
  "փտվ",
  "մրտ",
  "ապր",
  "մյս",
  "հնս",
  "հլս",
  "օգս",
  "սպտ",
  "հկտ",
  "նմբ",
  "դեկ",
] as const;

/** YYYY-MM-DD → e.g. `15 մյս 2026` (always Armenian, independent of OS locale). */
export function formatShortDateArmenian(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const [ys, ms, ds] = iso.split("-");
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  const month = ARMENIAN_MONTHS_SHORT[m - 1];
  if (!month || !Number.isFinite(y) || !Number.isFinite(d)) return iso;
  return `${d} ${month} ${y}`;
}

/** Date/time for print headers (Armenian labels; uses {@link formatShortDateArmenian} for the date part). */
export function formatDateTimeArmenian(date: Date): string {
  const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${formatShortDateArmenian(iso)}, ${h}:${min}`;
}

export function formatArmenianDateRange(startIso: string, endIso: string): string {
  if (startIso === endIso) return formatShortDateArmenian(startIso);
  return `${formatShortDateArmenian(startIso)} – ${formatShortDateArmenian(endIso)}`;
}

/** YYYY-MM-DD → e.g. `18.05.2026` (numeric, for official print forms). */
export function formatNumericDateFromIso(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

export function formatNumericDateRange(startIso: string, endIso: string): string {
  if (startIso === endIso) return formatNumericDateFromIso(startIso);
  return `${formatNumericDateFromIso(startIso)} – ${formatNumericDateFromIso(endIso)}`;
}
