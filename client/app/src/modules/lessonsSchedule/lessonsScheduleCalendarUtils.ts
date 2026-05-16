import { yerevanAddCalendarDays } from "src/lib/yerevanLessonCalendar";

export function pad2(n: number): string {
	return String(n).padStart(2, "0");
}

export function displayTime(t: string): string {
	return t.length >= 5 ? t.slice(0, 5) : t;
}

export type MonthCell =
	| { key: string; type: "blank" }
	| { key: string; type: "day"; iso: string; day: number };

export function buildMonthGridCells(year: number, month1To12: number): MonthCell[] {
	const dim = new Date(year, month1To12, 0).getDate();
	const firstJs = new Date(year, month1To12 - 1, 1).getDay();
	const leading = firstJs === 0 ? 6 : firstJs - 1;
	const cells: MonthCell[] = [];
	for (let i = 0; i < leading; i++) cells.push({ key: `b-${i}`, type: "blank" });
	for (let d = 1; d <= dim; d++) {
		const iso = `${year}-${pad2(month1To12)}-${pad2(d)}`;
		cells.push({ key: iso, type: "day", iso, day: d });
	}
	while (cells.length % 7 !== 0) cells.push({ key: `t-${cells.length}`, type: "blank" });
	while (cells.length < 42) cells.push({ key: `p-${cells.length}`, type: "blank" });
	return cells.slice(0, 42);
}

export function weekDayShortHeaders(locale: string): string[] {
	const base = new Date(2024, 0, 1);
	const headers: string[] = [];
	for (let i = 0; i < 7; i++) {
		const d = new Date(base);
		d.setDate(base.getDate() + i);
		headers.push(d.toLocaleDateString(locale, { weekday: "short" }));
	}
	return headers;
}

export function enumerateIsoDates(start: string, end: string): string[] {
	const out: string[] = [];
	let cur = start;
	while (cur <= end) {
		out.push(cur);
		cur = yerevanAddCalendarDays(cur, 1);
	}
	return out;
}

export function slotDurationMinutes(startTime: string, endTime: string): number {
	const parse = (t: string) => {
		const m = /^(\d{1,2}):(\d{2})/.exec(t.trim());
		if (!m) return NaN;
		return Number(m[1]) * 60 + Number(m[2]);
	};
	const sm = parse(startTime);
	const em = parse(endTime);
	if (!Number.isFinite(sm) || !Number.isFinite(em)) return 60;
	const diff = em - sm;
	return diff > 0 ? diff : 60;
}
