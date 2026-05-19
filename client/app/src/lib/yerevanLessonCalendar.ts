/** Calendar and lesson times aligned with backend `BOOKING_SLOT_TZ_OFFSET` (+04 / Asia/Yerevan). */

const YEREVAN_TZ = "Asia/Yerevan";
const SLOT_OFFSET = "+04:00";

export function yerevanTodayIso(now = new Date()): string {
	return now.toLocaleDateString("en-CA", { timeZone: YEREVAN_TZ });
}

/** Next calendar day after `fromIso` in Yerevan (expects YYYY-MM-DD). */
export function yerevanAddCalendarDays(fromIso: string, deltaDays: number): string {
	const base = `${fromIso.slice(0, 10)}T12:00:00${SLOT_OFFSET}`;
	const ms = Date.parse(base);
	if (!Number.isFinite(ms)) return fromIso;
	const shifted = new Date(ms + deltaDays * 86400000);
	return shifted.toLocaleDateString("en-CA", { timeZone: YEREVAN_TZ });
}

/**
 * Adds `deltaMonths` calendar months to `fromIso` (YYYY-MM-DD), keeping the same day-of-month when
 * possible and clamping to the last valid day otherwise (e.g. Jan 31 + 1 month → Feb 28/29).
 */
export function yerevanAddCalendarMonths(fromIso: string, deltaMonths: number): string {
	const [ys, ms, ds] = fromIso.slice(0, 10).split("-");
	const y0 = Number(ys);
	const m0 = Number(ms);
	const d0 = Number(ds);
	if (!Number.isFinite(y0) || !Number.isFinite(m0) || !Number.isFinite(d0)) return fromIso;
	const total = y0 * 12 + (m0 - 1) + deltaMonths;
	const y = Math.floor(total / 12);
	const m = (((total % 12) + 12) % 12) + 1;
	const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
	const day = Math.min(d0, lastDay);
	return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseHHMMToMinutes(t: string): number | null {
	const m = /^(\d{1,2}):(\d{2})/.exec(t.trim());
	if (!m) return null;
	const h = Number(m[1]);
	const min = Number(m[2]);
	if (!Number.isFinite(h) || !Number.isFinite(min) || h < 0 || h > 23 || min < 0 || min > 59) return null;
	return h * 60 + min;
}

function minutesToHHMM(total: number): string {
	const h = Math.floor(total / 60) % 24;
	const m = total % 60;
	return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** UTC ms for the exclusive end of the lesson window (same semantics as backend slot end). */
export function lessonEndUtcMsYerevan(dateIso: string, time: string, endTime: string | null): number {
	const startM = parseHHMMToMinutes(time);
	if (startM == null) return NaN;
	let endM: number | null;
	if (endTime?.trim()) {
		endM = parseHHMMToMinutes(endTime);
	} else {
		endM = startM + 60;
	}
	if (endM == null || !Number.isFinite(endM)) return NaN;
	const endStr = minutesToHHMM(endM);
	return Date.parse(`${dateIso.slice(0, 10)}T${endStr}:00${SLOT_OFFSET}`);
}

export function hasLessonWindowEnded(dateIso: string, time: string, endTime: string | null, now = new Date()): boolean {
	const endMs = lessonEndUtcMsYerevan(dateIso, time, endTime);
	if (!Number.isFinite(endMs)) return false;
	return now.getTime() >= endMs;
}

const WEEKDAY_SHORT_MON0 = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** 0 = Monday … 6 = Sunday, using Asia/Yerevan calendar for `dateIso` (YYYY-MM-DD). */
export function yerevanWeekdayIndexMonday0(dateIso: string): number {
	const ms = Date.parse(`${dateIso.slice(0, 10)}T12:00:00${SLOT_OFFSET}`);
	if (!Number.isFinite(ms)) return 0;
	const short = new Intl.DateTimeFormat("en-US", { timeZone: YEREVAN_TZ, weekday: "short" }).format(new Date(ms));
	const idx = WEEKDAY_SHORT_MON0.indexOf(short as (typeof WEEKDAY_SHORT_MON0)[number]);
	return idx >= 0 ? idx : 0;
}

/** Monday–Sunday week in Yerevan that contains `todayIso`. */
export function yerevanWeekRangeContaining(todayIso: string): { start: string; end: string } {
	const start = yerevanAddCalendarDays(todayIso, -yerevanWeekdayIndexMonday0(todayIso));
	const end = yerevanAddCalendarDays(start, 6);
	return { start, end };
}

/** First and last calendar day of the month in Yerevan that contains `todayIso`. */
export function yerevanMonthRangeContaining(todayIso: string): { start: string; end: string } {
	const [ys, ms] = todayIso.slice(0, 10).split("-");
	const y = Number(ys);
	const m = Number(ms);
	if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
		return { start: todayIso.slice(0, 10), end: todayIso.slice(0, 10) };
	}
	const start = `${y}-${String(m).padStart(2, "0")}-01`;
	const nextM = m === 12 ? 1 : m + 1;
	const nextY = m === 12 ? y + 1 : y;
	const firstNext = `${nextY}-${String(nextM).padStart(2, "0")}-01`;
	const end = yerevanAddCalendarDays(firstNext, -1);
	return { start, end };
}

export function yerevanDateInInclusiveRange(dateIso: string, start: string, end: string): boolean {
	const d = dateIso.slice(0, 10);
	return d >= start.slice(0, 10) && d <= end.slice(0, 10);
}

/** UTC ms bounds for filtering `createdAt`-style ISO strings to Yerevan calendar days [start..end]. */
export function yerevanLocalRangeToUtcMsBounds(startDateIso: string, endDateIso: string): { fromMs: number; toMs: number } {
	const fromMs = Date.parse(`${startDateIso.slice(0, 10)}T00:00:00.000${SLOT_OFFSET}`);
	const toMs = Date.parse(`${endDateIso.slice(0, 10)}T23:59:59.999${SLOT_OFFSET}`);
	return { fromMs, toMs };
}

/** Calendar YYYY-MM-DD in Yerevan for an absolute instant (e.g. student `joinedIso`). */
export function yerevanCalendarDateFromInstant(iso: string): string {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
	return d.toLocaleDateString("en-CA", { timeZone: YEREVAN_TZ });
}
