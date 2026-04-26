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
