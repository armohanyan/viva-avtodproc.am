import { useLang, type TranslationKey } from "src/lib/i18n";
import { Card } from "src/components/ui/card";
import { Button } from "src/components/ui/button";
import DataTableToolbar from "src/components/DataTableToolbar";
import TableColumnFilter from "src/components/TableColumnFilter";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Reveal } from "src/lib/motion";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { useToast } from "src/lib/toast";
import type { Instructor } from "src/data/instructors";
import InstructorCard from "src/components/InstructorCard";
import type { AvailabilityBlock } from "src/modules/instructors/instructorAvailability";
import {
  isSlotBlockedByAvailabilityRules,
  normalizeAvailabilityBlocksFromApi,
} from "src/modules/instructors/instructorAvailability";
import {
  type BranchScheduleRule,
  branchScheduleBlockReason,
  defaultBranchScheduleRules,
  hourlySlotStartsForBranchDate,
  hourlySlotStartsForBranchDates,
  isSlotBlockedByBranchScheduleRules,
  isSlotDateBeforeToday,
  isSlotStartInPast,
  normalizeBranchScheduleFromApi,
  type SlotUnavailabilityReason,
} from "src/modules/booking/booking-slot.util";
import { yerevanTodayIso } from "src/lib/yerevanLessonCalendar";
import {
  areConsecutiveInBookableTimes,
  bookableTimesFromPlan,
  resolveEffectiveBookableTimes,
  normalizePracticalSlotPlan,
  practicalSlotRangeMinutesFromBookable,
  type PracticalSlotPlanRow,
} from "src/modules/booking/practical-slot-plan";
import { isLessonOnOrBeforePayHorizon, todayIsoUtc } from "src/lib/booking-pay-horizon";
import { TooltipProvider } from "src/components/ui/tooltip";
import { toCanonicalBookingStatus } from "src/utils/booking.utils";
import { SimulatedAcbaPosDialog } from "src/components/booking/SimulatedAcbaPosDialog";
import { BookingCancellationPolicyCallout } from "src/components/booking/BookingCancellationPolicyCallout";
import { useStudentEntitlements } from "src/modules/dashboard/studentEntitlements";
import { STUDENT_SELF_SERVICE_BOOKING_ENABLED } from "src/constants/booking.constants";
import { StudentBookingPausedCallout } from "src/components/booking/StudentBookingPausedCallout";

export type LessonBookingPayload = {
  instructorUserId: string;
  instructor: string;
  dateIso: string;
  /** First hour (same as legacy single-slot `time`). */
  time: string;
  /** All selected hour starts on {@link dateIso} (student / legacy admin same-day block). */
  times: string[];
  /** Admin: full list when hours span multiple days or are non-consecutive; API prefers this over `slots`. */
  slotEntries?: { dateIso: string; time: string }[];
  studentLabel?: string;
};

type SlotStatus = "available" | "unavailable" | "mine";

type SlotCellMeta = {
  status: SlotStatus;
  reason: SlotUnavailabilityReason | null;
  /** Hour not offered at this branch on this calendar day — hide interaction. */
  outsideBranchDayHours: boolean;
};

/** Monday 00:00 local of the ISO week containing `from`. */
function startOfIsoWeekMonday(from: Date): Date {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export type InstructorBusySlot = { dateIso: string; time: string; studentUserId: string };

/** Full week Mon–Sun starting Monday of current week + `weekOffset` weeks. */
function getWeekDays(weekOffset: number): Date[] {
  const monday = startOfIsoWeekMonday(new Date());
  monday.setDate(monday.getDate() + weekOffset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(monday);
    x.setDate(monday.getDate() + i);
    return x;
  });
}

function fmt(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dayLabel(d: Date, locale: string) {
  return d.toLocaleDateString(locale, { weekday: "short" });
}

function localeFromLang(lang: "en" | "ru" | "am") {
  if (lang === "am") return "hy-AM";
  if (lang === "ru") return "ru-RU";
  return "en-US";
}

function padSlot(t: string): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(t.trim());
  if (!m) return t;
  return `${String(Number(m[1])).padStart(2, "0")}:${String(Number(m[2])).padStart(2, "0")}`;
}

function sortTimesUnique(times: readonly string[]): string[] {
  const set = new Set(times.map((x) => padSlot(x)));
  return [...set].sort((a, b) => a.localeCompare(b));
}

function sortSlotEntriesChrono(entries: readonly { dateIso: string; time: string }[]): { dateIso: string; time: string }[] {
  return [...entries].sort((a, b) => a.dateIso.localeCompare(b.dateIso) || padSlot(a.time).localeCompare(padSlot(b.time)));
}

function slotEntryKey(dateIso: string, time: string): string {
  return `${dateIso.slice(0, 10)}\t${padSlot(time)}`;
}

/** True if sorted times are each on the hour and consecutive. */
function isConsecutiveHourlySlots(sorted: string[]): boolean {
  if (sorted.length === 0) return false;
  for (const t of sorted) {
    if (!/^\d{2}:\d{2}$/.test(t) || !t.endsWith(":00")) return false;
  }
  for (let i = 1; i < sorted.length; i++) {
    const prev = Number(sorted[i - 1].slice(0, 2)) * 60 + Number(sorted[i - 1].slice(3, 5));
    const cur = Number(sorted[i].slice(0, 2)) * 60 + Number(sorted[i].slice(3, 5));
    if (cur !== prev + 60) return false;
  }
  return true;
}

type StudentPracticalBookingCreateResponse = {
  id: number;
  totalPriceAmd: number;
  slots: string[];
  startTime: string;
  status: string;
  holdExpiresAt: string | null;
  holdExtensionCount: number;
  maxHoldExtensions: number;
  paymentRequiredNow: boolean;
  paymentRequiredAt?: string | null;
  coveredByPrepaidCredits?: boolean;
};

function formatCountdownMmSs(isoDeadline: string): string {
  const ms = new Date(isoDeadline).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return "0:00";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export type LessonBookingCalendarProps = {
  mode: "student" | "admin";
  instructors: readonly Instructor[];
  selectedInstructorId: string;
  onInstructorChange: (instructorUserId: string) => void;
  /** When set in student mode, “my” slots are resolved from `/bookings`. */
  studentUserId?: string;
  /** Required for student mode API (`POST /bookings`) — use one branch id (e.g. first selected). */
  branchId?: string;
  /** Required in admin mode to enable Confirm */
  studentName?: string;
  onBookingConfirmed?: (payload: LessonBookingPayload) => void;
  /** When false, instructor is fixed by parent (e.g. theory cohort teacher). Default true. */
  showInstructorPicker?: boolean;
  /** Student dashboard: marketing-style instructor cards; admin keeps compact chips by default. */
  instructorPickerVariant?: "chips" | "cards";
  /** Admin: pre-fill grid + summary (e.g. edit booking). */
  initialAdminSelection?:
    | { dateIso: string; times: string[] }
    | { slotEntries: { dateIso: string; time: string }[] }
    | null;
  /** Admin: after reset / “Book another”, clear parent-held slot state. */
  onAdminSelectionCleared?: () => void;
  /** Omit this booking’s hours from busy-slot results so the slot stays clickable while editing. */
  ignoreBusyBookingId?: string;
  /**
   * Admin: hide the sticky booking-summary column and push slot updates to `onBookingConfirmed`
   * as soon as the selection is valid (so a parent `CheckoutSummary` can be the only panel).
   */
  adminSuppressSummaryCard?: boolean;
  /** Admin: optional hard cap for selected slot cells (e.g. package practical lessons). */
  maxSelectableSlots?: number;
  /** Localized message shown when selection cap is exceeded. */
  maxSelectableSlotsErrorKey?: TranslationKey;
  /** Student flow booking type; default practical. */
  studentBookingType?: "practical" | "theory_personal";
};

export default function LessonBookingCalendar({
  mode,
  instructors,
  selectedInstructorId,
  onInstructorChange,
  studentUserId,
  branchId = "",
  studentName = "",
  onBookingConfirmed,
  showInstructorPicker = true,
  instructorPickerVariant = "chips",
  initialAdminSelection = null,
  onAdminSelectionCleared,
  ignoreBusyBookingId = "",
  adminSuppressSummaryCard = false,
  maxSelectableSlots,
  maxSelectableSlotsErrorKey = "adminBookingValPackagePracticalCount",
  studentBookingType = "practical",
}: LessonBookingCalendarProps) {
  const { t, lang } = useLang();
  const { showToast } = useToast();
  const { refreshEntitlements } = useStudentEntitlements();
  const locale = localeFromLang(lang);
  const [weekOffset, setWeekOffset] = useState(0);
  /** Student: multiple hour starts on the same calendar date (must be consecutive on confirm). */
  const [selected, setSelected] = useState<{ date: string; times: string[] } | null>(null);
  /** Admin: any set of (date, hour) cells — may span multiple weeks/days. */
  const [adminSlotPick, setAdminSlotPick] = useState<{ dateIso: string; time: string }[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdSummary, setCreatedSummary] = useState<{ totalPriceAmd: number; slots: string[] } | null>(null);
  /** After student POST /bookings — drives payment countdown / pay-later messaging. */
  const [studentPaySession, setStudentPaySession] = useState<StudentPracticalBookingCreateResponse | null>(null);
  const [payNowAtBooking, setPayNowAtBooking] = useState(false);
  const [serverPaidConfirmed, setServerPaidConfirmed] = useState(false);
  const [bookingFlowDone, setBookingFlowDone] = useState(false);
  const [countdownTick, setCountdownTick] = useState(0);
  const [busySlotsRefreshKey, setBusySlotsRefreshKey] = useState(0);
  /** True when the student has any booking with status `pending` (awaiting payment). */
  const [pendingBookingBlocksNew, setPendingBookingBlocksNew] = useState(false);
  const [payBusy, setPayBusy] = useState(false);
  const [posDialogOpen, setPosDialogOpen] = useState(false);
  const [slotSearch, setSlotSearch] = useState("");
  const [periodFilter, setPeriodFilter] = useState<"all" | "morning" | "afternoon">("all");
  const [availabilityBlocks, setAvailabilityBlocks] = useState<AvailabilityBlock[]>([]);
  const [busySlots, setBusySlots] = useState<InstructorBusySlot[]>([]);
  const [blocksLoading, setBlocksLoading] = useState(false);
  const [branchScheduleRules, setBranchScheduleRules] = useState<BranchScheduleRule[]>(() =>
    defaultBranchScheduleRules(),
  );
  const [branchScheduleLoading, setBranchScheduleLoading] = useState(false);
  const [practicalSlotPlan, setPracticalSlotPlan] = useState<PracticalSlotPlanRow[]>([]);
  const [instructorPracticalPlan, setInstructorPracticalPlan] = useState<PracticalSlotPlanRow[]>([]);
  const [instructorPlanCustomized, setInstructorPlanCustomized] = useState(false);
  const [practicalPlanLoading, setPracticalPlanLoading] = useState(false);
  const [instructorPlanLoading, setInstructorPlanLoading] = useState(false);

  const usePracticalSlotPlanGrid = studentBookingType === "practical";
  /** When `adminSuppressSummaryCard`, avoid duplicate `onBookingConfirmed` / clear loops. */
  const lastAdminAutoSyncKeyRef = useRef<string | null>(null);
  /** After instructor changes, skip one admin auto-sync pass (selection is still from the previous id). */
  const skipAdminAutoSyncOnceRef = useRef(false);
  /** Skip destructive reset on mount/remount; only reset when instructor/suppress/mode actually change (e.g. tab remount must not clear parent or beat `initialAdminSelection`). */
  const instructorResetBaselineRef = useRef<string | null>(null);
  /** Parent often passes inline handlers; must not put them in effect deps or selection resets every render. */
  const onBookingConfirmedRef = useRef(onBookingConfirmed);
  const onAdminSelectionClearedRef = useRef(onAdminSelectionCleared);
  onBookingConfirmedRef.current = onBookingConfirmed;
  onAdminSelectionClearedRef.current = onAdminSelectionCleared;

  useEffect(() => {
    if (!selectedInstructorId) {
      setAvailabilityBlocks([]);
      setBusySlots([]);
      setBlocksLoading(false);
      return;
    }
    const week = getWeekDays(weekOffset);
    const from = fmt(week[0]);
    const to = fmt(week[6]);
    let cancelled = false;
    const run = async () => {
      setBlocksLoading(true);
      try {
        const busyQ = new URLSearchParams({ from, to });
        if (ignoreBusyBookingId.trim() !== "") {
          busyQ.set("excludeBookingId", ignoreBusyBookingId.trim());
        }
        const busyQs = busyQ.toString();
        const [blocks, busy] = await Promise.all([
          vivaApiJson<AvailabilityBlock[]>(
            `/instructors/${encodeURIComponent(selectedInstructorId)}/availability-blocks`,
          ),
          vivaApiJson<InstructorBusySlot[]>(
            `/instructors/${encodeURIComponent(selectedInstructorId)}/busy-slots?${busyQs}`,
          ),
        ]);
        if (!cancelled) {
          setAvailabilityBlocks(normalizeAvailabilityBlocksFromApi(blocks));
          setBusySlots(Array.isArray(busy) ? busy : []);
        }
      } catch {
        if (!cancelled) {
          setAvailabilityBlocks([]);
          setBusySlots([]);
        }
      } finally {
        if (!cancelled) {
          setBlocksLoading(false);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [selectedInstructorId, weekOffset, busySlotsRefreshKey, ignoreBusyBookingId]);

  useEffect(() => {
    const bid = branchId.trim();
    if (!bid) {
      setBranchScheduleRules(defaultBranchScheduleRules());
      setBranchScheduleLoading(false);
      setPracticalSlotPlan([]);
      setPracticalPlanLoading(false);
      return;
    }
    let cancelled = false;
    const run = async () => {
      setBranchScheduleLoading(!usePracticalSlotPlanGrid);
      setPracticalPlanLoading(usePracticalSlotPlanGrid);
      try {
        const tasks: Promise<void>[] = [];
        if (usePracticalSlotPlanGrid) {
          tasks.push(
            (async () => {
              const data = await vivaApiJson<{ rows?: unknown }>(
                `/branches/${encodeURIComponent(bid)}/practical-slot-plan`,
              );
              if (!cancelled) setPracticalSlotPlan(normalizePracticalSlotPlan(data?.rows));
            })(),
          );
        } else {
          tasks.push(
            (async () => {
              const rules = await vivaApiJson<unknown>(
                `/branches/${encodeURIComponent(bid)}/booking-schedule`,
              );
              if (!cancelled) setBranchScheduleRules(normalizeBranchScheduleFromApi(rules));
            })(),
          );
        }
        await Promise.all(tasks);
      } catch {
        if (!cancelled) {
          if (usePracticalSlotPlanGrid) setPracticalSlotPlan(normalizePracticalSlotPlan(null));
          else setBranchScheduleRules(defaultBranchScheduleRules());
        }
      } finally {
        if (!cancelled) {
          setBranchScheduleLoading(false);
          setPracticalPlanLoading(false);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [branchId, usePracticalSlotPlanGrid]);

  useEffect(() => {
    const iid = selectedInstructorId.trim();
    if (!usePracticalSlotPlanGrid || !iid) {
      setInstructorPracticalPlan([]);
      setInstructorPlanCustomized(false);
      setInstructorPlanLoading(false);
      return;
    }
    let cancelled = false;
    setInstructorPlanLoading(true);
    void (async () => {
      try {
        const data = await vivaApiJson<{ rows?: unknown; customized?: boolean }>(
          `/instructors/${encodeURIComponent(iid)}/practical-slot-plan`,
        );
        if (!cancelled) {
          setInstructorPracticalPlan(normalizePracticalSlotPlan(data?.rows));
          setInstructorPlanCustomized(Boolean(data?.customized));
        }
      } catch {
        if (!cancelled) {
          setInstructorPracticalPlan(normalizePracticalSlotPlan(null));
          setInstructorPlanCustomized(false);
        }
      } finally {
        if (!cancelled) setInstructorPlanLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedInstructorId, usePracticalSlotPlanGrid]);

  useEffect(() => {
    if (mode !== "student" || !studentUserId) {
      setPendingBookingBlocksNew(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const list = await vivaApiJson<{ status: string }[]>(
          `/bookings?${new URLSearchParams({ studentUserId }).toString()}`,
        );
        if (cancelled) return;
        const has = Array.isArray(list) && list.some((b) => toCanonicalBookingStatus(b.status) === "pending");
        setPendingBookingBlocksNew(has);
      } catch {
        if (!cancelled) setPendingBookingBlocksNew(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, studentUserId, busySlotsRefreshKey]);

  useEffect(() => {
    if (!adminSuppressSummaryCard || mode !== "admin") return;
    if (skipAdminAutoSyncOnceRef.current) {
      skipAdminAutoSyncOnceRef.current = false;
      return;
    }

    const sortedEntries = sortSlotEntriesChrono(adminSlotPick);
    const valid =
      sortedEntries.length > 0 && !!selectedInstructorId && studentName.trim() !== "";
    const key = valid ? `${selectedInstructorId}|${JSON.stringify(sortedEntries)}` : null;

    if (key === null) {
      if (lastAdminAutoSyncKeyRef.current !== null) {
        lastAdminAutoSyncKeyRef.current = null;
        onAdminSelectionClearedRef.current?.();
      }
      return;
    }

    if (lastAdminAutoSyncKeyRef.current === key) return;
    lastAdminAutoSyncKeyRef.current = key;

    const insName = instructors.find((i) => i.id === selectedInstructorId)?.name ?? "";
    const first = sortedEntries[0];
    const sameDayTimes = sortedEntries.filter((e) => e.dateIso === first.dateIso).map((e) => e.time);
    onBookingConfirmedRef.current?.({
      instructorUserId: selectedInstructorId,
      instructor: insName,
      dateIso: first.dateIso,
      time: padSlot(first.time),
      times: sortTimesUnique(sameDayTimes.length > 0 ? sameDayTimes : [first.time]),
      slotEntries: sortedEntries.map((e) => ({ dateIso: e.dateIso.slice(0, 10), time: padSlot(e.time) })),
      studentLabel: studentName.trim(),
    });
    setConfirmed(true);
  }, [
    adminSuppressSummaryCard,
    mode,
    adminSlotPick,
    selectedInstructorId,
    studentName,
    instructors,
  ]);

  useEffect(() => {
    if (mode !== "admin" || !initialAdminSelection) return;
    if ("slotEntries" in initialAdminSelection && initialAdminSelection.slotEntries.length > 0) {
      setAdminSlotPick(
        sortSlotEntriesChrono(
          initialAdminSelection.slotEntries.map((e) => ({
            dateIso: e.dateIso.slice(0, 10),
            time: padSlot(e.time),
          })),
        ),
      );
      setSelected(null);
      setConfirmed(true);
      setCreatedSummary(null);
      setStudentPaySession(null);
      setPayNowAtBooking(false);
      setServerPaidConfirmed(false);
      setBookingFlowDone(false);
      return;
    }
    if ("times" in initialAdminSelection && initialAdminSelection.times.length > 0) {
      const sorted = sortTimesUnique(initialAdminSelection.times);
      if (!isConsecutiveHourlySlots(sorted)) return;
      setSelected({ date: initialAdminSelection.dateIso.slice(0, 10), times: sorted });
      setAdminSlotPick([]);
      setConfirmed(true);
      setCreatedSummary(null);
      setStudentPaySession(null);
      setPayNowAtBooking(false);
      setServerPaidConfirmed(false);
      setBookingFlowDone(false);
    }
  }, [
    mode,
    initialAdminSelection == null
      ? ""
      : "slotEntries" in initialAdminSelection
        ? `se|${initialAdminSelection.slotEntries.map((e) => `${e.dateIso}|${e.time}`).join(";")}`
        : `dt|${initialAdminSelection.dateIso}|${initialAdminSelection.times.join(",")}`,
  ]);

  useEffect(() => {
    const sig = `${selectedInstructorId}\0${adminSuppressSummaryCard}\0${mode}`;
    if (instructorResetBaselineRef.current === null) {
      instructorResetBaselineRef.current = sig;
      return;
    }
    if (instructorResetBaselineRef.current === sig) return;
    instructorResetBaselineRef.current = sig;

    if (adminSuppressSummaryCard && mode === "admin") {
      skipAdminAutoSyncOnceRef.current = true;
      lastAdminAutoSyncKeyRef.current = null;
      onAdminSelectionClearedRef.current?.();
    }
    setSelected(null);
    setAdminSlotPick([]);
    setConfirmed(false);
    setCreatedSummary(null);
    setStudentPaySession(null);
    setPayNowAtBooking(false);
    setServerPaidConfirmed(false);
    setBookingFlowDone(false);
  }, [selectedInstructorId, adminSuppressSummaryCard, mode]);

  useEffect(() => {
    if (!studentPaySession?.holdExpiresAt || serverPaidConfirmed) return;
    const iv = window.setInterval(() => setCountdownTick((x) => x + 1), 1000);
    return () => window.clearInterval(iv);
  }, [studentPaySession?.holdExpiresAt, serverPaidConfirmed]);

  useEffect(() => {
    if (mode !== "student" || !studentUserId || !studentPaySession?.holdExpiresAt || serverPaidConfirmed) return;
    const bookingId = studentPaySession.id;
    const iv = window.setInterval(() => {
      void (async () => {
        try {
          const list = await vivaApiJson<{ id: number }[]>(
            `/bookings?${new URLSearchParams({ studentUserId }).toString()}`,
          );
          const found = Array.isArray(list) && list.some((b) => Number(b.id) === bookingId);
          if (!found) {
            showToast(t("bookingPaymentExpiredToast"), "error");
            setStudentPaySession(null);
            setConfirmed(false);
            setCreatedSummary(null);
            setServerPaidConfirmed(false);
            setBookingFlowDone(false);
            setBusySlotsRefreshKey((k) => k + 1);
          }
        } catch {
          /* ignore */
        }
      })();
    }, 12_000);
    return () => window.clearInterval(iv);
  }, [mode, studentUserId, studentPaySession?.holdExpiresAt, studentPaySession?.id, serverPaidConfirmed, showToast, t]);

  const days = useMemo(() => getWeekDays(weekOffset), [weekOffset]);
  const weekDateIsos = useMemo(() => days.map((d) => fmt(d)), [days]);
  const yerevanToday = useMemo(() => yerevanTodayIso(), [weekOffset, countdownTick]);

  const planBookableTimes = useMemo(() => {
    if (!usePracticalSlotPlanGrid) return [];
    if (!selectedInstructorId.trim()) return bookableTimesFromPlan(practicalSlotPlan);
    return resolveEffectiveBookableTimes(practicalSlotPlan, instructorPracticalPlan, instructorPlanCustomized);
  }, [
    usePracticalSlotPlanGrid,
    practicalSlotPlan,
    instructorPracticalPlan,
    instructorPlanCustomized,
    selectedInstructorId,
  ]);

  const branchHoursByDate = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const dateIso of weekDateIsos) {
      map.set(
        dateIso,
        usePracticalSlotPlanGrid
          ? new Set(planBookableTimes)
          : new Set(hourlySlotStartsForBranchDate(dateIso, branchScheduleRules)),
      );
    }
    return map;
  }, [weekDateIsos, branchScheduleRules, usePracticalSlotPlanGrid, planBookableTimes]);

  const visibleTimeSlots = useMemo(() => {
    const base = usePracticalSlotPlanGrid
      ? planBookableTimes
      : hourlySlotStartsForBranchDates(weekDateIsos, branchScheduleRules);
    return base.filter((time) => {
      const q = slotSearch.trim();
      if (q && !time.replace(":", "").toLowerCase().includes(q.toLowerCase()) && !time.toLowerCase().includes(q.toLowerCase())) {
        return false;
      }
      const hour = parseInt(time.split(":")[0], 10);
      if (periodFilter === "morning" && hour >= 12) return false;
      if (periodFilter === "afternoon" && hour < 12) return false;
      return true;
    });
  }, [weekDateIsos, branchScheduleRules, slotSearch, periodFilter, usePracticalSlotPlanGrid, planBookableTimes]);

  const adminSelectedKeys = useMemo(() => {
    const s = new Set<string>();
    for (const p of adminSlotPick) {
      s.add(slotEntryKey(p.dateIso, p.time));
    }
    return s;
  }, [adminSlotPick]);

  const adminFirstDateIso = useMemo(() => {
    const e = sortSlotEntriesChrono(adminSlotPick)[0];
    return e?.dateIso ?? "";
  }, [adminSlotPick]);

  const adminSortedSlotEntries = useMemo(() => sortSlotEntriesChrono(adminSlotPick), [adminSlotPick]);

  const busyOccupiedKeys = useMemo(() => {
    const s = new Set<string>();
    for (const b of busySlots) {
      s.add(`${b.dateIso}\t${padSlot(b.time)}`);
    }
    return s;
  }, [busySlots]);

  const mySlotKeys = useMemo(() => {
    const s = new Set<string>();
    if (mode !== "student" || !studentUserId) return s;
    for (const b of busySlots) {
      if (String(b.studentUserId) === studentUserId) {
        s.add(`${b.dateIso}\t${padSlot(b.time)}`);
      }
    }
    return s;
  }, [busySlots, mode, studentUserId]);

  const resolveSlotCell = useCallback(
    (time: string, dateIso: string): SlotCellMeta => {
      const slot = padSlot(time);
      const dayHours = branchHoursByDate.get(dateIso.slice(0, 10));
      const outsideBranchDayHours = dayHours != null && !dayHours.has(slot);
      if (outsideBranchDayHours) {
        return { status: "unavailable", reason: "outside_hours", outsideBranchDayHours: true };
      }

      const key = `${dateIso}\t${slot}`;
      if (blocksLoading || branchScheduleLoading || practicalPlanLoading || instructorPlanLoading) {
        return { status: "unavailable", reason: "unavailable", outsideBranchDayHours: false };
      }
      if (isSlotDateBeforeToday(dateIso, yerevanToday) || isSlotStartInPast(dateIso, slot)) {
        return { status: "unavailable", reason: "past", outsideBranchDayHours: false };
      }

      if (!usePracticalSlotPlanGrid) {
        const branchReason = branchScheduleBlockReason(dateIso, slot, branchScheduleRules);
        if (branchReason === "branch_closed") {
          return { status: "unavailable", reason: "branch_closed", outsideBranchDayHours: false };
        }
        if (branchReason === "outside_hours" || isSlotBlockedByBranchScheduleRules(dateIso, slot, branchScheduleRules)) {
          return { status: "unavailable", reason: "outside_hours", outsideBranchDayHours: false };
        }
      }

      if (mode === "student" && studentUserId && mySlotKeys.has(key)) {
        return { status: "mine", reason: null, outsideBranchDayHours: false };
      }
      if (busyOccupiedKeys.has(key)) {
        return { status: "unavailable", reason: "unavailable", outsideBranchDayHours: false };
      }
      const slotRange = usePracticalSlotPlanGrid
        ? practicalSlotRangeMinutesFromBookable(slot, planBookableTimes)
        : undefined;
      if (
        isSlotBlockedByAvailabilityRules(dateIso, slot, availabilityBlocks, slotRange, {
          forPracticalPlan: usePracticalSlotPlanGrid,
        })
      ) {
        return { status: "unavailable", reason: "unavailable", outsideBranchDayHours: false };
      }
      if (mode === "student" && studentUserId && pendingBookingBlocksNew) {
        return { status: "unavailable", reason: "unavailable", outsideBranchDayHours: false };
      }
      return { status: "available", reason: null, outsideBranchDayHours: false };
    },
    [
      branchHoursByDate,
      blocksLoading,
      branchScheduleLoading,
      practicalPlanLoading,
      instructorPlanLoading,
      yerevanToday,
      branchScheduleRules,
      usePracticalSlotPlanGrid,
      planBookableTimes,
      mode,
      studentUserId,
      mySlotKeys,
      busyOccupiedKeys,
      availabilityBlocks,
      pendingBookingBlocksNew,
    ],
  );

  const slotUnavailableLabel = useCallback(
    (reason: SlotUnavailabilityReason | null): string => {
      if (reason === "past") return t("bookingSlotReasonPast");
      if (reason === "outside_hours") return t("bookingSlotReasonOutsideHours");
      if (reason === "branch_closed") return t("bookingSlotReasonBranchClosed");
      return t("bookingSlotUnavailable");
    },
    [t],
  );

  const slotStyle = (status: SlotStatus, isSelected: boolean, outsideBranchDayHours: boolean) => {
    if (outsideBranchDayHours) {
      return "bg-transparent border-transparent cursor-default opacity-0 pointer-events-none";
    }
    /** Booked “mine” must win over selection — `selected` is kept after confirm for the summary panel. */
    if (status === "mine") return "bg-primary/10 text-primary border-primary/20 cursor-default";
    if (isSelected) return "bg-primary text-primary-foreground border-primary";
    if (status === "unavailable") return "bg-accent text-muted-foreground border-border cursor-not-allowed";
    return "bg-card text-muted-foreground border-border hover:border-primary/40 hover:bg-primary/10 cursor-pointer";
  };

  const studentBookingPaused = mode === "student" && !STUDENT_SELF_SERVICE_BOOKING_ENABLED;
  const canClick = (meta: SlotCellMeta) =>
    !studentBookingPaused && meta.status === "available" && !meta.outsideBranchDayHours;

  const selectedInstructorName = useMemo(
    () => instructors.find((i) => i.id === selectedInstructorId)?.name ?? "",
    [instructors, selectedInstructorId],
  );

  const selectedInstructorRecord = useMemo(
    () => instructors.find((i) => i.id === selectedInstructorId),
    [instructors, selectedInstructorId],
  );

  /** One grid slot = one hour; price matches instructor card hourly rate. */
  const estimatedTotalAmd = useMemo(() => {
    if (!selectedInstructorRecord) return null;
    const rate = selectedInstructorRecord.hourlyPrice;
    if (!Number.isFinite(rate) || rate < 0) return null;
    if (mode === "admin") {
      const n = adminSlotPick.length;
      if (n === 0) return null;
      return Math.round(rate * n);
    }
    if (!selected?.times.length) return null;
    return Math.round(rate * selected.times.length);
  }, [mode, adminSlotPick, selected, selectedInstructorRecord]);

  const toggleSlotSelection = (dateStr: string, time: string, meta: SlotCellMeta) => {
    if (!canClick(meta)) return;
    const slot = padSlot(time);
    setConfirmed(false);
    setCreatedSummary(null);
    setStudentPaySession(null);
    setServerPaidConfirmed(false);
    setBookingFlowDone(false);
    if (mode === "admin") {
      const key = slotEntryKey(dateStr, slot);
      const slotCap =
        typeof maxSelectableSlots === "number" && Number.isFinite(maxSelectableSlots)
          ? Math.trunc(maxSelectableSlots)
          : 0;
      setAdminSlotPick((prev) => {
        const i = prev.findIndex((p) => slotEntryKey(p.dateIso, p.time) === key);
        if (i >= 0) {
          const next = prev.filter((_, j) => j !== i);
          return next;
        }
        if (slotCap > 0 && prev.length >= slotCap) {
          showToast(t(maxSelectableSlotsErrorKey), "error");
          return prev;
        }
        return sortSlotEntriesChrono([...prev, { dateIso: dateStr.slice(0, 10), time: slot }]);
      });
      return;
    }
    setSelected((prev) => {
      if (!prev || prev.date !== dateStr) {
        return { date: dateStr, times: [slot] };
      }
      const has = prev.times.some((x) => padSlot(x) === slot);
      const nextTimes = has ? prev.times.filter((x) => padSlot(x) !== slot) : [...prev.times, slot];
      const sorted = sortTimesUnique(nextTimes);
      if (sorted.length === 0) return null;
      return { date: dateStr, times: sorted };
    });
  };

  const handleConfirm = async () => {
    if (!selectedInstructorId) return;
    if (mode === "admin" && !studentName.trim()) return;

    if (mode === "student") {
      if (studentBookingPaused) {
        showToast(t("studentBookingPausedBody"), "error");
        return;
      }
      if (!selected) return;
      if (pendingBookingBlocksNew) {
        showToast(t("bookingPendingBlocksNew"), "error");
        return;
      }
      const sorted = sortTimesUnique(selected.times);
      if (studentBookingType === "practical") {
        if (!areConsecutiveInBookableTimes(sorted, planBookableTimes)) {
          showToast(t("bookingSlotsMustBeConsecutive"), "error");
          return;
        }
      } else if (!isConsecutiveHourlySlots(sorted)) {
        showToast(t("bookingSlotsMustBeConsecutive"), "error");
        return;
      }
      if (!studentUserId) {
        showToast(t("bookingStudentAuthRequired"), "error");
        return;
      }
      if (!branchId.trim()) {
        showToast(t("bookingBranchRequired"), "error");
        return;
      }
      setSubmitting(true);
      try {
        const inHorizon = isLessonOnOrBeforePayHorizon(selected.date, todayIsoUtc());
        const body: Record<string, unknown> = {
          instructorId: Number(selectedInstructorId),
          date: selected.date,
          slots: sorted,
          branchId: Number(branchId),
          ...(studentBookingType === "theory_personal" ? { bookingType: "theory_personal" } : {}),
        };
        if (studentBookingType === "practical" && !inHorizon) {
          body.payNow = payNowAtBooking;
        }
        const res = await vivaApiJson<StudentPracticalBookingCreateResponse>("/bookings", {
          method: "POST",
          body,
        });
        setCreatedSummary({ totalPriceAmd: res.totalPriceAmd, slots: res.slots ?? sorted });
        setStudentPaySession(res);
        setServerPaidConfirmed(false);
        setBookingFlowDone(false);
        setConfirmed(true);
        setBusySlotsRefreshKey((k) => k + 1);
        await refreshEntitlements();
        showToast(t("bookingCreatedToast"), "success");
      } catch (e) {
        showToast(getApiErrorMessage(e), "error");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const entries = sortSlotEntriesChrono(adminSlotPick);
    if (entries.length > 0) {
      const first = entries[0];
      const sameDayTimes = entries.filter((e) => e.dateIso === first.dateIso).map((e) => e.time);
      setConfirmed(true);
      onBookingConfirmed?.({
        instructorUserId: selectedInstructorId,
        instructor: selectedInstructorName,
        dateIso: first.dateIso,
        time: padSlot(first.time),
        times: sortTimesUnique(sameDayTimes.length > 0 ? sameDayTimes : [first.time]),
        slotEntries: entries.map((e) => ({ dateIso: e.dateIso.slice(0, 10), time: padSlot(e.time) })),
        studentLabel: studentName.trim(),
      });
      return;
    }

    if (!selected) return;
    const sorted = sortTimesUnique(selected.times);
    if (studentBookingType === "practical") {
      if (!areConsecutiveInBookableTimes(sorted, planBookableTimes)) {
        showToast(t("bookingSlotsMustBeConsecutive"), "error");
        return;
      }
    } else if (!isConsecutiveHourlySlots(sorted)) {
      showToast(t("bookingSlotsMustBeConsecutive"), "error");
      return;
    }
    setConfirmed(true);
    onBookingConfirmed?.({
      instructorUserId: selectedInstructorId,
      instructor: selectedInstructorName,
      dateIso: selected.date,
      time: sorted[0],
      times: sorted,
      slotEntries: sorted.map((time) => ({ dateIso: selected.date.slice(0, 10), time: padSlot(time) })),
      studentLabel: studentName.trim(),
    });
  };

  const resetBooking = () => {
    lastAdminAutoSyncKeyRef.current = null;
    setSelected(null);
    setAdminSlotPick([]);
    setConfirmed(false);
    setCreatedSummary(null);
    setStudentPaySession(null);
    setPayNowAtBooking(false);
    setServerPaidConfirmed(false);
    setBookingFlowDone(false);
    setPosDialogOpen(false);
    setBusySlotsRefreshKey((k) => k + 1);
    if (mode === "admin") {
      onAdminSelectionCleared?.();
    }
  };

  const adminReady = mode === "admin" && !!studentName.trim();

  const adminHasSlotSelection =
    mode === "admin" && (adminSlotPick.length > 0 || (!!selected && selected.times.length > 0));

  const selectedInPayHorizon =
    mode === "admin"
      ? adminFirstDateIso
        ? isLessonOnOrBeforePayHorizon(adminFirstDateIso, todayIsoUtc())
        : selected
          ? isLessonOnOrBeforePayHorizon(selected.date, todayIsoUtc())
          : true
      : selected
        ? isLessonOnOrBeforePayHorizon(selected.date, todayIsoUtc())
        : true;

  const studentPaymentStepActive =
    mode === "student" &&
    confirmed &&
    studentPaySession &&
    !studentPaySession.coveredByPrepaidCredits &&
    !serverPaidConfirmed &&
    !bookingFlowDone;

  const showPendingBookingCallout =
    mode === "student" && pendingBookingBlocksNew && !studentPaymentStepActive;

  const onCompletePayment = async (): Promise<boolean> => {
    if (!studentPaySession) return false;
    setPayBusy(true);
    try {
      await vivaApiJson(`/bookings/${encodeURIComponent(String(studentPaySession.id))}/complete-payment`, {
        method: "POST",
      });
      setServerPaidConfirmed(true);
      setBusySlotsRefreshKey((k) => k + 1);
      await refreshEntitlements();
      showToast(t("bookingPaymentCompletedToast"), "success");
      return true;
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
      return false;
    } finally {
      setPayBusy(false);
    }
  };

  const onExtendHold = async () => {
    if (!studentPaySession) return;
    setPayBusy(true);
    try {
      const r = await vivaApiJson<{
        holdExpiresAt: string;
        holdExtensionCount: number;
        maxHoldExtensions: number;
      }>(`/bookings/${encodeURIComponent(String(studentPaySession.id))}/extend-payment-hold`, { method: "POST" });
      setStudentPaySession((prev) =>
        prev
          ? {
              ...prev,
              holdExpiresAt: r.holdExpiresAt,
              holdExtensionCount: r.holdExtensionCount,
              maxHoldExtensions: r.maxHoldExtensions,
            }
          : null,
      );
      showToast(t("bookingPaymentExtendedToast"), "success");
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setPayBusy(false);
    }
  };

  const onStartPaymentWindow = async () => {
    if (!studentPaySession) return;
    setPayBusy(true);
    try {
      const r = await vivaApiJson<{
        holdExpiresAt: string;
        holdExtensionCount: number;
        maxHoldExtensions: number;
      }>(`/bookings/${encodeURIComponent(String(studentPaySession.id))}/start-payment-window`, { method: "POST" });
      setStudentPaySession((prev) =>
        prev
          ? {
              ...prev,
              holdExpiresAt: r.holdExpiresAt,
              holdExtensionCount: r.holdExtensionCount,
              maxHoldExtensions: r.maxHoldExtensions,
            }
          : null,
      );
      showToast(t("bookingPaymentWindowStartedToast"), "success");
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setPayBusy(false);
    }
  };

  const slotCalendarCard = (
    <Card className="p-5 border-border">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <h3 className="font-semibold text-foreground">
          {t("selectDate")} · {t("selectTime")}
        </h3>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
            disabled={weekOffset === 0}
            className="w-8 h-8 rounded-lg border border-border/60 flex items-center justify-center text-muted-foreground hover:bg-accent disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-foreground">
            {days[0].toLocaleDateString(locale, { month: "short", day: "numeric" })} –{" "}
            {days[6].toLocaleDateString(locale, { month: "short", day: "numeric" })}
          </span>
          <button
            type="button"
            onClick={() => setWeekOffset((w) => w + 1)}
            className="w-8 h-8 rounded-lg border border-border/60 flex items-center justify-center text-muted-foreground hover:bg-accent"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {blocksLoading || branchScheduleLoading ? (
        <p className="text-xs text-muted-foreground mb-3">{t("instructorAvailabilityCalendarLoading")}</p>
      ) : null}

      <DataTableToolbar
        value={slotSearch}
        onChange={setSlotSearch}
        placeholder={`${t("filterByHour")}…`}
        className="border-t border-border bg-muted/20"
      />

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="text-left text-xs text-muted-foreground font-medium pr-4 py-2 w-16">
                <div className="flex min-w-0 items-center gap-0.5">
                  <span className="truncate">{t("bookingGridTimeLabel")}</span>
                  <TableColumnFilter
                    value={periodFilter}
                    onChange={(v) => setPeriodFilter(v as "all" | "morning" | "afternoon")}
                    ariaLabel={t("filter")}
                    options={[
                      { value: "all", label: t("filterOptionAll") },
                      { value: "morning", label: t("bookingSlotFilterMorning") },
                      { value: "afternoon", label: t("bookingSlotFilterAfternoon") },
                    ]}
                    className="h-6 w-6"
                  />
                </div>
              </th>
              {days.map((d, i) => (
                <th key={i} className="text-center py-2 px-1">
                  <div className="text-xs text-muted-foreground font-medium">{dayLabel(d, locale)}</div>
                  <div className="text-sm font-semibold text-foreground">{d.getDate()}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleTimeSlots.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-6 text-center text-xs text-muted-foreground">
                  {t("bookingNoSlotsInWeek")}
                </td>
              </tr>
            ) : null}
            {visibleTimeSlots.map((time) => (
              <tr key={time} className="border-t border-border/50">
                <td className="text-xs text-muted-foreground pr-4 py-1.5 font-medium">{time}</td>
                {days.map((d, j) => {
                  const dateStr = fmt(d);
                  const cell = resolveSlotCell(time, dateStr);
                  const tooltipLabel =
                    cell.status === "unavailable" && cell.reason
                      ? slotUnavailableLabel(cell.reason)
                      : undefined;
                  const isSelected =
                    mode === "admin"
                      ? adminSelectedKeys.has(slotEntryKey(dateStr, time))
                      : !!(
                          selected?.date === dateStr &&
                          selected.times.some((x) => padSlot(x) === padSlot(time))
                        );
                  return (
                    <td key={j} className="py-1 px-1">
                      <div
                        role="button"
                        tabIndex={cell.outsideBranchDayHours ? -1 : 0}
                        aria-disabled={!canClick(cell)}
                        aria-label={`${dateStr} ${time} ${cell.status}${tooltipLabel ? ` — ${tooltipLabel}` : ""}`}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleSlotSelection(dateStr, time, cell);
                          }
                        }}
                        onClick={() => toggleSlotSelection(dateStr, time, cell)}
                        title={tooltipLabel && !cell.outsideBranchDayHours ? tooltipLabel : undefined}
                        className={`h-8 rounded-md border text-xs text-center flex items-center justify-center transition-colors ${slotStyle(cell.status, isSelected, cell.outsideBranchDayHours)}`}
                      >
                        {cell.outsideBranchDayHours
                          ? ""
                          : cell.status === "mine"
                            ? t("mine")
                            : cell.status === "unavailable"
                              ? "—"
                              : ""}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
        {[
          { color: "bg-card border border-border", label: t("available") },
          ...(mode === "student"
            ? [{ color: "bg-primary/10 border border-primary/20", label: t("myBooking") }]
            : []),
          { color: "bg-accent border border-border", label: t("bookingSlotUnavailable") },
          { color: "bg-primary", label: t("selected") },
        ].map((l, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className={`w-4 h-4 rounded ${l.color}`} />
            <span className="text-xs text-muted-foreground">{l.label}</span>
          </div>
        ))}
      </div>
    </Card>
  );

  return (
    <TooltipProvider>
    <>
    <SimulatedAcbaPosDialog
      open={posDialogOpen}
      onOpenChange={setPosDialogOpen}
      amountAmd={studentPaySession?.totalPriceAmd ?? null}
      locale={locale}
      busy={payBusy}
      onApprove={onCompletePayment}
    />
    <div className="@container min-w-0">
    {studentBookingPaused ? <StudentBookingPausedCallout className="mb-4" /> : null}
    <div
      className={
        adminSuppressSummaryCard
          ? "grid grid-cols-1 gap-6"
          : "grid grid-cols-1 @min-[1000px]:grid-cols-4 gap-6 @min-[1000px]:items-stretch"
      }
    >
      <div className={adminSuppressSummaryCard ? "space-y-6 min-w-0" : "@min-[1000px]:col-span-3 space-y-6 min-w-0"}>
        {showInstructorPicker ? (
          <Reveal delay={0.06}>
            <Card
              className={
                instructorPickerVariant === "cards"
                  ? "p-3 sm:p-4 border-border overflow-hidden"
                  : "p-5 border-border"
              }
            >
              <h3
                className={
                  instructorPickerVariant === "cards"
                    ? "text-sm font-semibold text-foreground mb-2"
                    : "font-semibold text-foreground mb-3"
                }
              >
                {t("selectInstructor")}
              </h3>
              {instructorPickerVariant === "cards" ? (
                <div className="flex items-stretch gap-3 overflow-x-auto overscroll-x-contain pb-1 pt-0.5 snap-x snap-mandatory scroll-smooth [-webkit-overflow-scrolling:touch]">
                  {instructors.map((ins) => (
                    <div
                      key={ins.id}
                      className="snap-start shrink-0 w-[min(17.5rem,calc(100vw-4rem))] sm:w-72 flex flex-col self-stretch min-h-0"
                    >
                      <InstructorCard
                        instructor={ins}
                        pickerMode
                        compact
                        isPicked={selectedInstructorId === ins.id}
                        onPick={() => onInstructorChange(ins.id)}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {instructors.map((ins) => (
                    <button
                      key={ins.id}
                      type="button"
                      onClick={() => onInstructorChange(ins.id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        selectedInstructorId === ins.id
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:border-primary/30"
                      }`}
                    >
                      {ins.name}
                    </button>
                  ))}
                </div>
              )}
            </Card>
          </Reveal>
        ) : null}

        {showPendingBookingCallout ? (
          <Reveal delay={0.08}>
            <div
              className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100"
              role="status"
            >
              {t("bookingPendingBlocksNew")}
            </div>
          </Reveal>
        ) : null}

        {mode === "admin" ? slotCalendarCard : <Reveal delay={0.12}>{slotCalendarCard}</Reveal>}
        {adminSuppressSummaryCard && mode === "admin" ? (
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" className="text-muted-foreground text-xs" onClick={resetBooking}>
              {t("clearSelectionLabel")}
            </Button>
          </div>
        ) : null}
      </div>

      {!adminSuppressSummaryCard ? (
      <div className="min-h-0 min-w-0 @min-[1000px]:h-full @min-[1000px]:min-h-0 flex flex-col">
        <Reveal delay={mode === "admin" ? 0 : 0.18} className="@min-[1000px]:h-full @min-[1000px]:min-h-0 flex flex-col min-w-0">
          <Card className="p-5 border-border @min-[1000px]:sticky @min-[1000px]:top-4 @min-[1000px]:z-10 @min-[1000px]:self-start w-full min-w-0">
            <h3 className="font-semibold text-foreground mb-4">{t("bookingSummaryTitle")}</h3>
            {(mode === "admin" ? !adminHasSlotSelection : !selected) ? (
              <p className="text-sm text-muted-foreground">{t("bookingSelectSlotHint")}</p>
            ) : confirmed ? (
              studentPaymentStepActive ? (
                <div className="space-y-4 text-left py-1">
                  {(() => {
                    void countdownTick;
                    const sess = studentPaySession!;
                    const hold = sess.holdExpiresAt;
                    const remainingMs = hold ? new Date(hold).getTime() - Date.now() : 0;
                    if (hold && (sess.status === "pending" || sess.status === "pending_payment")) {
                      const canExtend =
                        remainingMs > 0 &&
                        remainingMs <= 60_000 &&
                        sess.holdExtensionCount < sess.maxHoldExtensions;
                      return (
                        <div className="space-y-3">
                          <p className="text-xs text-muted-foreground leading-relaxed">{t("bookingPaymentCountdownHint")}</p>
                          <div className="rounded-lg border border-border bg-muted/30 px-3 py-3 text-center">
                            <p className="text-2xl font-semibold tabular-nums text-foreground tracking-tight">
                              {formatCountdownMmSs(hold)}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-1">{t("bookingPaymentRemainingLabel")}</p>
                          </div>
                          <Button
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                            disabled={payBusy || remainingMs <= 0}
                            onClick={() => setPosDialogOpen(true)}
                          >
                            {t("bookingCompletePaymentCta")}
                          </Button>
                          {canExtend ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full text-xs"
                              disabled={payBusy}
                              onClick={() => void onExtendHold()}
                            >
                              {t("bookingAddFiveMinutesCta")}
                            </Button>
                          ) : null}
                        </div>
                      );
                    }
                    if (!hold && !sess.paymentRequiredNow) {
                      return (
                        <div className="space-y-3">
                          <p className="text-xs text-muted-foreground leading-relaxed">{t("bookingReservePayLaterHint")}</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-xs"
                            disabled={payBusy}
                            onClick={() => void onStartPaymentWindow()}
                          >
                            {payBusy ? t("loading") : t("bookingStartPaymentWindowCta")}
                          </Button>
                          <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setBookingFlowDone(true)}>
                            {t("bookingReservedDoneCta")}
                          </Button>
                        </div>
                      );
                    }
                    return (
                      <p className="text-xs text-muted-foreground">
                        {t("bookingPaymentNoActiveHoldHint")}
                      </p>
                    );
                  })()}
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="font-semibold text-foreground text-sm">
                    {serverPaidConfirmed ? t("bookingConfirmedPaidTitle") : t("bookingConfirmed")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap break-words text-left max-h-32 overflow-y-auto">
                    {mode === "admin" && adminSortedSlotEntries.length > 0
                      ? adminSortedSlotEntries.map((e) => `${e.dateIso} ${padSlot(e.time)}`).join("\n")
                      : selected
                        ? `${selected.date} · ${sortTimesUnique(selected.times).join(", ")}`
                        : ""}
                  </p>
                  {createdSummary ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("bookingTotalLabel")}: {createdSummary.totalPriceAmd.toLocaleString(locale)} ֏
                    </p>
                  ) : null}
                  {!serverPaidConfirmed && mode === "student" ? (
                    studentPaySession?.coveredByPrepaidCredits ? (
                      <div className="mt-2 space-y-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-2 text-left">
                        <p className="text-[11px] text-emerald-900 dark:text-emerald-200 leading-relaxed">
                          {t("bookingCoveredByPackageLabel")}
                        </p>
                        <p className="text-[11px] text-emerald-800/90 dark:text-emerald-300/90 leading-relaxed">
                          {t("bookingNoPaymentRequiredLabel")}
                        </p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">{t("bookingPendingPayLaterReminder")}</p>
                    )
                  ) : null}
                  <Button variant="outline" size="sm" className="mt-4 w-full text-xs" onClick={resetBooking}>
                    {t("bookAnother")}
                  </Button>
                </div>
              )
            ) : (
              <div className="space-y-3">
                {mode === "admin" && studentName.trim() && (
                  <div className="flex justify-between text-sm gap-2">
                    <span className="text-muted-foreground shrink-0">{t("bookingColStudent")}</span>
                    <span className="font-medium text-foreground text-xs text-right">{studentName.trim()}</span>
                  </div>
                )}
                <div className="bg-accent rounded-lg p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("bookingInstructorLabel")}</span>
                    <span className="font-medium text-foreground text-xs">{selectedInstructorName}</span>
                  </div>
                  {mode === "admin" && adminSortedSlotEntries.length > 0 ? (
                    <>
                      <div className="text-xs text-muted-foreground">{t("bookingTimeLabel")}</div>
                      <ul className="max-h-36 overflow-y-auto space-y-1 pr-1 text-xs font-medium text-foreground">
                        {adminSortedSlotEntries.map((e) => (
                          <li key={slotEntryKey(e.dateIso, e.time)} className="flex justify-between gap-2">
                            <span className="text-muted-foreground shrink-0">{e.dateIso}</span>
                            <span className="tabular-nums">{padSlot(e.time)}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t("bookingDurationLabel")}</span>
                        <span className="font-medium text-foreground text-xs">
                          {adminSortedSlotEntries.length} {t("bookingHoursUnit")}
                        </span>
                      </div>
                    </>
                  ) : selected ? (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t("bookingDateLabel")}</span>
                        <span className="font-medium text-foreground text-xs">{selected.date}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t("bookingTimeLabel")}</span>
                        <span className="font-medium text-foreground text-xs text-right">
                          {sortTimesUnique(selected.times).join(", ")}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{t("bookingDurationLabel")}</span>
                        <span className="font-medium text-foreground text-xs">
                          {selected.times.length} {t("bookingHoursUnit")}
                        </span>
                      </div>
                    </>
                  ) : null}
                  {estimatedTotalAmd != null && selectedInstructorRecord ? (
                    <>
                      <div className="flex justify-between text-sm gap-2 border-t border-border/60 pt-2 mt-1">
                        <span className="text-muted-foreground shrink-0">{t("lessonPrice")}</span>
                        <span className="font-medium text-foreground text-xs text-right tabular-nums">
                          {Math.round(selectedInstructorRecord.hourlyPrice).toLocaleString(locale)} ֏ / {t("perHour")}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm gap-2">
                        <span className="text-muted-foreground shrink-0">{t("bookingTotalLabel")}</span>
                        <span className="font-semibold text-foreground text-sm tabular-nums">
                          {estimatedTotalAmd.toLocaleString(locale)} ֏
                        </span>
                      </div>
                    </>
                  ) : null}
                </div>
                {mode === "student" && studentBookingType === "practical" && selected && !selectedInPayHorizon ? (
                  <p className="text-xs text-muted-foreground leading-relaxed rounded-md border border-border/60 bg-muted/20 px-3 py-2">
                    {t("bookingReserveSlotPayLaterCallout")}
                  </p>
                ) : null}
                {mode === "student" && studentBookingType === "practical" && selected && !selectedInPayHorizon ? (
                  <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={payNowAtBooking}
                      onChange={(e) => setPayNowAtBooking(e.target.checked)}
                      className="mt-0.5 rounded border-border"
                    />
                    <span>{t("bookingPayNowCheckbox")}</span>
                  </label>
                ) : null}
                <Button
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50"
                  disabled={
                    submitting ||
                    studentBookingPaused ||
                    (mode === "admin" && (!adminReady || !adminHasSlotSelection)) ||
                    (mode === "student" && !selected) ||
                    (mode === "student" && pendingBookingBlocksNew)
                  }
                  onClick={() => void handleConfirm()}
                >
                  {submitting ? t("loading") : t("confirmBooking")}
                </Button>
                {mode === "admin" && !studentName.trim() && (
                  <p className="text-xs text-amber-600 dark:text-amber-500">{t("adminLearnPickStudentHint")}</p>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground text-xs"
                  onClick={() => {
                    setSelected(null);
                    setAdminSlotPick([]);
                  }}
                >
                  {t("clearSelectionLabel")}
                </Button>
              </div>
            )}
          </Card>
        </Reveal>
        {mode === "student" ? (
          <Reveal delay={0.22} className="mt-4">
            <BookingCancellationPolicyCallout bookingType={studentBookingType} />
          </Reveal>
        ) : null}
      </div>
      ) : null}
    </div>
    </div>
    </>
    </TooltipProvider>
  );
}
