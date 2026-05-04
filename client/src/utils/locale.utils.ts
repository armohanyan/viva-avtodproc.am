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
