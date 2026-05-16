const YEREVAN_TZ = 'Asia/Yerevan';
const WEEKDAY_SHORT_MON0 = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export type GeneratedCohortSession = {
  dateIso: string;
  startTime: string;
  endTime: string;
  lessonIndex: number;
};

export type CohortSessionGenerationInput = {
  startDateIso: string;
  endDateIso: string;
  /** Weekday indices Monday=0 … Sunday=6 (Yerevan calendar). */
  lessonWeekdays: number[];
  sessionStartTime: string;
  sessionEndTime: string;
  totalLessons: number;
};

function parseIsoDateOnly(raw: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim().slice(0, 10));
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

function yerevanWeekdayIndexMonday0(dateIso: string): number {
  const ms = Date.parse(`${dateIso.slice(0, 10)}T12:00:00+04:00`);
  if (!Number.isFinite(ms)) return 0;
  const short = new Intl.DateTimeFormat('en-US', { timeZone: YEREVAN_TZ, weekday: 'short' }).format(new Date(ms));
  const idx = WEEKDAY_SHORT_MON0.indexOf(short as (typeof WEEKDAY_SHORT_MON0)[number]);
  return idx >= 0 ? idx : 0;
}

function yerevanAddCalendarDays(fromIso: string, deltaDays: number): string {
  const base = `${fromIso.slice(0, 10)}T12:00:00+04:00`;
  const ms = Date.parse(base);
  if (!Number.isFinite(ms)) return fromIso;
  const shifted = new Date(ms + deltaDays * 86400000);
  return shifted.toLocaleDateString('en-CA', { timeZone: YEREVAN_TZ });
}

function parseHm(s: string): { h: number; m: number } | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min) || h < 0 || h > 23 || min < 0 || min > 59) return null;
  return { h, m: min };
}

function normalizeHm(s: string): string {
  const p = parseHm(s);
  if (!p) return s.trim().slice(0, 5);
  return `${String(p.h).padStart(2, '0')}:${String(p.m).padStart(2, '0')}`;
}

/** Parse stored weekdays: comma-separated "0,2,4" or JSON array. */
export function parseLessonWeekdays(raw: unknown): number[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return [...new Set(raw.map((v) => Math.floor(Number(v))).filter((n) => n >= 0 && n <= 6))].sort((a, b) => a - b);
  }
  const s = String(raw).trim();
  if (!s) return [];
  if (s.startsWith('[')) {
    try {
      return parseLessonWeekdays(JSON.parse(s));
    } catch {
      return [];
    }
  }
  return [...new Set(s.split(/[,;\s]+/).map((p) => Math.floor(Number(p.trim()))).filter((n) => n >= 0 && n <= 6))].sort(
    (a, b) => a - b,
  );
}

export function serializeLessonWeekdays(weekdays: number[]): string {
  const uniq = [...new Set(weekdays.map((n) => Math.floor(n)).filter((n) => n >= 0 && n <= 6))].sort((a, b) => a - b);
  return uniq.join(',');
}

export function validateCohortSessionGenerationInput(input: CohortSessionGenerationInput): string | null {
  const start = parseIsoDateOnly(input.startDateIso);
  const end = parseIsoDateOnly(input.endDateIso);
  if (!start) return 'Invalid start date';
  if (!end) return 'Invalid end date';
  if (end < start) return 'End date must be on or after start date';
  const weekdays = parseLessonWeekdays(input.lessonWeekdays);
  if (weekdays.length === 0) return 'Select at least one weekday';
  const startT = parseHm(input.sessionStartTime);
  const endT = parseHm(input.sessionEndTime);
  if (!startT) return 'Invalid session start time';
  if (!endT) return 'Invalid session end time';
  const startMin = startT.h * 60 + startT.m;
  const endMin = endT.h * 60 + endT.m;
  if (endMin <= startMin) return 'Session end time must be after start time';
  const total = Math.floor(Number(input.totalLessons));
  if (!Number.isFinite(total) || total < 1) return 'Total lessons must be at least 1';
  return null;
}

/**
 * Generates session dates following selected weekdays from start date.
 * Stops when `totalLessons` is reached OR `endDateIso` is passed (whichever comes first).
 */
export function generateCohortSessions(input: CohortSessionGenerationInput): GeneratedCohortSession[] {
  const err = validateCohortSessionGenerationInput(input);
  if (err) return [];

  const start = parseIsoDateOnly(input.startDateIso)!;
  const end = parseIsoDateOnly(input.endDateIso)!;
  const weekdays = new Set(parseLessonWeekdays(input.lessonWeekdays));
  const startTime = normalizeHm(input.sessionStartTime);
  const endTime = normalizeHm(input.sessionEndTime);
  const totalLessons = Math.floor(Number(input.totalLessons));

  const out: GeneratedCohortSession[] = [];
  let cursor = start;
  const maxDays = 366 * 3;
  let guard = 0;

  while (out.length < totalLessons && cursor <= end && guard < maxDays) {
    if (weekdays.has(yerevanWeekdayIndexMonday0(cursor))) {
      out.push({
        dateIso: cursor,
        startTime,
        endTime,
        lessonIndex: out.length + 1,
      });
    }
    cursor = yerevanAddCalendarDays(cursor, 1);
    guard += 1;
  }

  return out;
}
