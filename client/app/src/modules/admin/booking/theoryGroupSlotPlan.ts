import type { TheoryCohortOption } from "./types";

function parseHm(s: string): { h: number; m: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min) || h < 0 || h > 23 || min < 0 || min > 59) return null;
  return { h, m: min };
}

function slotAtHour(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}

/**
 * Builds `dateIso` + consecutive on-the-hour slots from the cohort’s fixed weekly times.
 * Returns null if the cohort cannot be turned into API-safe slots (missing times or off-hour start).
 */
export function theoryGroupSlotPlanFromCohort(c: TheoryCohortOption): { dateIso: string; times: string[] } | null {
  const dateIso = String(c.startDateIso ?? "").trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) return null;

  const rawStart = c.sessionStartTime?.trim();
  if (!rawStart) return null;
  const start = parseHm(rawStart);
  if (!start || start.m !== 0) return null;

  const startMin = start.h * 60 + start.m;
  const rawEnd = c.sessionEndTime?.trim();
  if (!rawEnd) {
    return { dateIso, times: [slotAtHour(start.h)] };
  }
  const end = parseHm(rawEnd);
  if (!end) return null;
  const endMin = end.h * 60 + end.m;
  if (endMin <= startMin) return null;

  const times: string[] = [];
  for (let m = startMin; m + 60 <= endMin; m += 60) {
    times.push(slotAtHour(Math.floor(m / 60)));
  }
  return times.length > 0 ? { dateIso, times } : null;
}
