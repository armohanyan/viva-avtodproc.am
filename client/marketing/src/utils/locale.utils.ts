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

/** Always 24-hour clock — never AM/PM. */
const TIME_24H = { hour: "2-digit", minute: "2-digit", hour12: false } as const;

function parseDateInput(isoOrDate: string | Date): Date | null {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Short date + 24h time (e.g. notifications, inbox timestamps). */
export function formatDateTime(isoOrDate: string | Date, lang: Lang): string {
  const d = parseDateInput(isoOrDate);
  if (!d) return typeof isoOrDate === "string" ? isoOrDate : "";
  return d.toLocaleString(localeForLang(lang), {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    ...TIME_24H,
  });
}

/** Compact month/day + 24h time (e.g. notification bell, hold expiry). */
export function formatDateTimeCompact(isoOrDate: string | Date, lang: Lang): string {
  const d = parseDateInput(isoOrDate);
  if (!d) return typeof isoOrDate === "string" ? isoOrDate : "";
  return d.toLocaleString(localeForLang(lang), {
    month: "short",
    day: "numeric",
    ...TIME_24H,
  });
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
