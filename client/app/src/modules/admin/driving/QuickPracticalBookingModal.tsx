import { useEffect, useId, useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { AppModal } from "src/components/AppModal";
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import AdminStudentPicker from "src/components/admin/AdminStudentPicker";
import AdminBookingPaymentSection from "src/components/admin/AdminBookingPaymentSection";
import { cn } from "src/lib/utils";
import { useLang } from "src/lib/i18n";
import { useAccount } from "src/modules/accounts";
import { useToast } from "src/lib/toast";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { parseAmdInput } from "src/pages/admin/finance/adminFinanceShared";
import { billablePracticalLessonCount } from "src/utils/booking.utils";
import {
  PRACTICAL_LESSON_TYPES,
  getLessonTypeLabel,
  type PracticalLessonType,
} from "src/modules/instructors/instructor-booking";
import type { AdminStudentMini } from "src/modules/admin/useAdminStudents";
import type { Instructor } from "src/data/instructors";
import type { Branch } from "src/modules/branches";
import {
  formatGridDateLabel,
  sortSlotEntriesChrono,
  sortTimesUnique,
} from "src/modules/admin/booking/adminAvailabilityGrid";
import {
  adminPaymentApiPayload,
  defaultAdminBookingPayment,
  paidAmountFromState,
  validateAdminBookingPayment,
  type AdminBookingPaymentState,
} from "src/modules/admin/booking/adminBookingPayment";
import {
  minutesToHHMM,
  normalizeTimeHHMM,
  parseTimeToMinutes,
  rangesOverlapHalfOpen,
} from "src/modules/booking/booking-slot.util";

export type QuickPracticalBookingModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instructor: Instructor;
  branchId: string;
  branches: readonly Branch[];
  slotEntries: readonly { dateIso: string; time: string }[];
  students: readonly AdminStudentMini[];
  onStudentCreated: (student: AdminStudentMini) => void;
  onChangeSlots: () => void;
  onCreated: () => void;
  /** Admin-only custom off-plan slot (e.g. rest hour). */
  customSlot?: boolean;
};

type Status = "confirmed" | "pending" | "cancelled" | "refunded";

type BusyRange = { start: string; end: string };

const MIN_CUSTOM_DURATION_MINUTES = 30;
const DEFAULT_CUSTOM_DURATION_MINUTES = 70;

function financeStatusFromBookingStatus(status: Status): "completed" | "pending" | "failed" | "refunded" {
  if (status === "confirmed") return "completed";
  if (status === "refunded") return "refunded";
  if (status === "cancelled") return "failed";
  return "pending";
}

function parseTotalPriceAmd(str: string, fallback: number): number {
  const parsed = parseAmdInput(str);
  if (!Number.isFinite(parsed) || parsed < 0) return Math.max(0, Math.round(fallback));
  return Math.max(0, Math.round(parsed));
}

/** HTML time inputs may return "14:00:00"; normalize to HH:MM. */
function normalizeUiTime(raw: string): string | null {
  const t = (raw ?? "").trim();
  if (!t) return null;
  return normalizeTimeHHMM(t.length === 8 && t[2] === ":" ? t.slice(0, 5) : t);
}

function addMinutesToTime(time: string, minutes: number): string {
  const start = parseTimeToMinutes(time);
  if (!Number.isFinite(start)) return time;
  return minutesToHHMM(Math.min(23 * 60 + 59, start + minutes));
}

function rangesConflict(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return rangesOverlapHalfOpen(
    { start: parseTimeToMinutes(aStart), end: parseTimeToMinutes(aEnd) },
    { start: parseTimeToMinutes(bStart), end: parseTimeToMinutes(bEnd) },
  );
}

export default function QuickPracticalBookingModal({
  open,
  onOpenChange,
  instructor,
  branchId: initialBranchId,
  branches,
  slotEntries,
  students,
  onStudentCreated,
  onChangeSlots,
  onCreated,
  customSlot = false,
}: QuickPracticalBookingModalProps) {
  const formId = useId();
  const { t } = useLang();
  const { showToast } = useToast();
  const { user: accountUser } = useAccount();
  const isSuperAdminUser = accountUser?.accountType === "super_admin";
  const [studentId, setStudentId] = useState("");
  /** Kept in sync with the picker so finance customer does not depend on directory id type / refresh races. */
  const [selectedStudent, setSelectedStudent] = useState<AdminStudentMini | null>(null);
  const [branchId, setBranchId] = useState(initialBranchId);
  const [lessonType, setLessonType] = useState<PracticalLessonType | "">("");
  const [status, setStatus] = useState<Status>("pending");
  const [totalPriceStr, setTotalPriceStr] = useState("");
  const [bookingPayment, setBookingPayment] = useState<AdminBookingPaymentState>(() =>
    defaultAdminBookingPayment(),
  );
  const [paymentErrorKey, setPaymentErrorKey] = useState<import("src/lib/i18n").TranslationKey | null>(null);
  /** Gift lesson (free, super admin must approve). */
  const [isGift, setIsGift] = useState(false);
  const [giftNote, setGiftNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [customTimeStart, setCustomTimeStart] = useState("14:00");
  const [customTimeEnd, setCustomTimeEnd] = useState(
    addMinutesToTime("14:00", DEFAULT_CUSTOM_DURATION_MINUTES),
  );
  const [setDelayedRest, setSetDelayedRest] = useState(false);
  const [delayedRestStart, setDelayedRestStart] = useState("15:10");
  const [delayedRestEnd, setDelayedRestEnd] = useState("16:10");
  const [busyRanges, setBusyRanges] = useState<BusyRange[]>([]);

  const dateIso = slotEntries[0]?.dateIso?.slice(0, 10) ?? "";

  const sortedEntries = useMemo(() => {
    if (customSlot) {
      const time = normalizeUiTime(customTimeStart);
      if (!dateIso || !time) return [];
      return [{ dateIso, time }];
    }
    return sortSlotEntriesChrono(slotEntries);
  }, [customSlot, customTimeStart, dateIso, slotEntries]);

  const customEndNorm = useMemo(() => normalizeUiTime(customTimeEnd), [customTimeEnd]);

  const suggestedTotalAmd = useMemo(
    () =>
      Math.max(
        0,
        Math.round(Number(instructor.hourlyPrice) || 0) * billablePracticalLessonCount(sortedEntries.length),
      ),
    [instructor.hourlyPrice, sortedEntries.length],
  );

  const totalPriceAmd = useMemo(
    () => parseTotalPriceAmd(totalPriceStr, suggestedTotalAmd),
    [totalPriceStr, suggestedTotalAmd],
  );

  useEffect(() => {
    if (!open) return;
    setStudentId("");
    setSelectedStudent(null);
    setBranchId(initialBranchId);
    setLessonType("");
    setStatus("pending");
    setTotalPriceStr(String(suggestedTotalAmd));
    setBookingPayment(defaultAdminBookingPayment());
    setPaymentErrorKey(null);
    setIsGift(false);
    setGiftNote("");
    const start = normalizeUiTime(slotEntries[0]?.time ?? "") ?? "14:00";
    const end = addMinutesToTime(start, DEFAULT_CUSTOM_DURATION_MINUTES);
    setCustomTimeStart(start);
    setCustomTimeEnd(end);
    setSetDelayedRest(false);
    setDelayedRestStart(end);
    setDelayedRestEnd(addMinutesToTime(end, 60));
    setBusyRanges([]);
  }, [open, initialBranchId, customSlot]);

  useEffect(() => {
    if (!open) return;
    setTotalPriceStr(String(suggestedTotalAmd));
    setBookingPayment((prev) => {
      if (prev.status !== "paid") return prev;
      const total = Math.max(0, Math.round(suggestedTotalAmd));
      if (total <= 0) return prev;
      return { ...prev, paidStr: String(total) };
    });
  }, [open, suggestedTotalAmd]);

  /** Load instructor busy ranges for the day (start/end) so custom times cannot overlap lessons. */
  useEffect(() => {
    if (!open || !customSlot || !dateIso || !Number.isFinite(Number(instructor.id))) {
      setBusyRanges([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const qs = new URLSearchParams({
          view: "day",
          startDate: dateIso,
          lessonType: "practical",
        });
        const res = await vivaApiJson<{
          items?: Array<{
            bookingId: number;
            instructor?: { id: number | null };
            startTime: string;
            endTime: string;
            date: string;
          }>;
        }>(`/admin/class-schedule?${qs.toString()}`);
        if (cancelled) return;
        const id = Number(instructor.id);
        const byBooking = new Map<number, BusyRange>();
        for (const item of res.items ?? []) {
          if (item.date?.slice(0, 10) !== dateIso || Number(item.instructor?.id) !== id) continue;
          const start = normalizeUiTime(item.startTime) ?? item.startTime;
          const end = normalizeUiTime(item.endTime) ?? item.endTime;
          if (!start || !end) continue;
          const prev = byBooking.get(item.bookingId);
          if (!prev) {
            byBooking.set(item.bookingId, { start, end });
            continue;
          }
          const nextStart =
            parseTimeToMinutes(start) < parseTimeToMinutes(prev.start) ? start : prev.start;
          const nextEnd = parseTimeToMinutes(end) > parseTimeToMinutes(prev.end) ? end : prev.end;
          byBooking.set(item.bookingId, { start: nextStart, end: nextEnd });
        }
        setBusyRanges([...byBooking.values()]);
      } catch {
        if (!cancelled) setBusyRanges([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, customSlot, dateIso, instructor.id]);

  const firstEntry = sortedEntries[0];
  const dateLabel = useMemo(() => {
    const dates = Array.from(new Set(sortedEntries.map((e) => e.dateIso)));
    if (dates.length === 0) return formatGridDateLabel(dateIso);
    if (dates.length === 1) return formatGridDateLabel(dates[0]);
    return `${formatGridDateLabel(dates[0])} – ${formatGridDateLabel(dates[dates.length - 1])}`;
  }, [sortedEntries, dateIso]);

  const validateCustomWindow = (start: string, end: string): string | null => {
    const startM = parseTimeToMinutes(start);
    const endM = parseTimeToMinutes(end);
    if (!Number.isFinite(startM) || !Number.isFinite(endM) || endM <= startM) {
      return t("adminDrivingQuickBookingCustomTimeOrder");
    }
    if (endM - startM < MIN_CUSTOM_DURATION_MINUTES) {
      return t("adminDrivingQuickBookingCustomTimeMinDuration");
    }
    for (const busy of busyRanges) {
      if (rangesConflict(start, end, busy.start, busy.end)) {
        return t("adminDrivingQuickBookingCustomTimeBusy");
      }
    }
    return null;
  };

  const handleCustomStartChange = (raw: string) => {
    setCustomTimeStart(raw);
    const start = normalizeUiTime(raw);
    if (!start) return;
    const prevStart = normalizeUiTime(customTimeStart);
    const prevEnd = normalizeUiTime(customTimeEnd);
    const prevDur =
      prevStart && prevEnd
        ? Math.max(DEFAULT_CUSTOM_DURATION_MINUTES, parseTimeToMinutes(prevEnd) - parseTimeToMinutes(prevStart))
        : DEFAULT_CUSTOM_DURATION_MINUTES;
    const nextEnd = addMinutesToTime(start, Number.isFinite(prevDur) ? prevDur : DEFAULT_CUSTOM_DURATION_MINUTES);
    setCustomTimeEnd(nextEnd);
    if (!setDelayedRest) {
      setDelayedRestStart(nextEnd);
      setDelayedRestEnd(addMinutesToTime(nextEnd, 60));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!studentId) {
      showToast(t("adminBookingValSelectStudent"), "error");
      return;
    }
    if (!lessonType) {
      showToast(t("fillRequired"), "error");
      return;
    }
    if (!firstEntry) {
      showToast(
        customSlot ? t("adminDrivingQuickBookingCustomTimeRequired") : t("adminBookingValSelectSlots"),
        "error",
      );
      return;
    }

    if (customSlot) {
      if (!customEndNorm) {
        showToast(t("adminDrivingQuickBookingCustomTimeRequired"), "error");
        return;
      }
      const customErr = validateCustomWindow(firstEntry.time, customEndNorm);
      if (customErr) {
        showToast(customErr, "error");
        return;
      }
    }

    if (customSlot && setDelayedRest) {
      const restStart = normalizeUiTime(delayedRestStart);
      const restEnd = normalizeUiTime(delayedRestEnd);
      if (!restStart || !restEnd) {
        showToast(t("adminDrivingQuickBookingDelayedLunchRequired"), "error");
        return;
      }
      if (parseTimeToMinutes(restStart) >= parseTimeToMinutes(restEnd)) {
        showToast(t("adminDrivingQuickBookingDelayedLunchOrder"), "error");
        return;
      }
      if (customEndNorm && rangesConflict(firstEntry.time, customEndNorm, restStart, restEnd)) {
        showToast(t("adminDrivingQuickBookingDelayedLunchOverlap"), "error");
        return;
      }
      for (const busy of busyRanges) {
        if (rangesConflict(restStart, restEnd, busy.start, busy.end)) {
          showToast(t("adminDrivingQuickBookingDelayedLunchBusy"), "error");
          return;
        }
      }
    }

    const payErr = isGift ? null : validateAdminBookingPayment(bookingPayment, totalPriceAmd);
    if (payErr) {
      setPaymentErrorKey(payErr);
      showToast(t(payErr), "error");
      return;
    }
    setPaymentErrorKey(null);

    const paymentBody = isGift
      ? { isGift: true, ...(giftNote.trim() ? { giftNote: giftNote.trim() } : {}) }
      : adminPaymentApiPayload(bookingPayment, totalPriceAmd);
    const paid = isGift
      ? 0
      : "adminPaymentStatus" in paymentBody && paymentBody.adminPaymentStatus === "paid"
        ? totalPriceAmd
        : ("paidAmountAmd" in paymentBody ? paymentBody.paidAmountAmd : undefined) ??
          paidAmountFromState(bookingPayment);

    setSubmitting(true);
    try {
      const sameDayTimes = sortedEntries.filter((e) => e.dateIso === firstEntry.dateIso).map((e) => e.time);
      const times = sortTimesUnique(sameDayTimes.length > 0 ? sameDayTimes : [firstEntry.time]);
      const body = {
        studentId: Number(studentId),
        branchId: Number(branchId),
        status,
        type: "practical" as const,
        dateIso: firstEntry.dateIso,
        slots: times,
        instructorName: instructor.name,
        ...(Number.isFinite(Number(instructor.id)) ? { instructorUserId: Number(instructor.id) } : {}),
        ...(sortedEntries.length > 0
          ? { slotEntries: sortedEntries.map((e) => ({ dateIso: e.dateIso, time: e.time })) }
          : {}),
        totalPriceAmd,
        ...(customSlot && customEndNorm
          ? { allowCustomPracticalTime: true, customSlotEndTime: customEndNorm }
          : {}),
        ...paymentBody,
      };
      const created = await vivaApiJson<{ id: number }>("/bookings", { method: "POST", body });
      const bookingIdNum = Number(created.id);

      if (paid > 0 && Number.isFinite(bookingIdNum) && bookingIdNum > 0) {
        const createdAtIso = new Date(bookingPayment.datetimeLocal).toISOString();
        const stu =
          selectedStudent && String(selectedStudent.id) === String(studentId)
            ? selectedStudent
            : students.find((s) => String(s.id) === String(studentId));
        const customer = (stu?.name ?? "").trim() || `Student #${studentId}`;

        await vivaApiJson("/finance/transactions", {
          method: "POST",
          body: {
            createdAt: createdAtIso,
            customer,
            email: (stu?.email ?? "").trim(),
            branchId: Number(branchId),
            method: bookingPayment.method,
            grossAmd: paid,
            status: financeStatusFromBookingStatus(status),
            source: "manual",
            bookingId: bookingIdNum,
          },
        });
      }

      if (customSlot && setDelayedRest && Number.isFinite(Number(instructor.id))) {
        const restStart = normalizeUiTime(delayedRestStart);
        const restEnd = normalizeUiTime(delayedRestEnd);
        if (restStart && restEnd) {
          try {
            await vivaApiJson(`/instructors/${encodeURIComponent(instructor.id)}/availability-blocks`, {
              method: "POST",
              body: {
                ruleKind: "date_busy",
                dateIso: firstEntry.dateIso,
                timeStart: restStart,
                timeEnd: restEnd,
              },
            });
          } catch (restErr) {
            showToast(getApiErrorMessage(restErr), "error");
            showToast(t("bookingCreatedToast"), "success");
            onCreated();
            onOpenChange(false);
            return;
          }
        }
      }

      showToast(t("bookingCreatedToast"), "success");
      onCreated();
      onOpenChange(false);
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppModal
      open={open}
      onOpenChange={(o) => {
        if (submitting) return;
        onOpenChange(o);
      }}
      title={t("adminDrivingQuickBookingTitle")}
      contentClassName="w-full max-w-[calc(100%-2rem)] sm:max-w-xl"
      footer={
        <div className="flex gap-3 w-full">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            {t("cancel")}
          </Button>
          <Button
            type="submit"
            form={formId}
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
            disabled={submitting}
          >
            {submitting ? t("adminDrivingQuickBookingSubmitting") : t("adminDrivingQuickBookingSubmit")}
          </Button>
        </div>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground">
              {t("adminDrivingQuickBookingInstructorLabel")}
            </p>
            {!customSlot ? (
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  onChangeSlots();
                }}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <Pencil className="h-3 w-3" />
                {t("adminDrivingQuickBookingChangeSlots")}
              </button>
            ) : null}
          </div>
          <p className="text-sm font-semibold text-foreground">{instructor.name}</p>
          <div>
            <p className="text-xs font-medium text-muted-foreground mt-1">
              {t("adminDrivingQuickBookingSlotsLabel")}
              {dateLabel ? <span className="ml-1 tabular-nums text-foreground">· {dateLabel}</span> : null}
            </p>
            {customSlot ? (
              <div className="mt-2 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                      {t("adminDrivingQuickBookingCustomStart")}
                    </label>
                    <Input
                      type="time"
                      step={60}
                      value={customTimeStart}
                      onChange={(e) => handleCustomStartChange(e.target.value)}
                      className="h-10 tabular-nums"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                      {t("adminDrivingQuickBookingCustomEnd")}
                    </label>
                    <Input
                      type="time"
                      step={60}
                      value={customTimeEnd}
                      onChange={(e) => {
                        setCustomTimeEnd(e.target.value);
                        const end = normalizeUiTime(e.target.value);
                        if (end && !setDelayedRest) {
                          setDelayedRestStart(end);
                          setDelayedRestEnd(addMinutesToTime(end, 60));
                        }
                      }}
                      className="h-10 tabular-nums"
                      required
                    />
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  {t("adminDrivingQuickBookingCustomSlotHint")}
                </p>
                <div className="rounded-md border border-border/80 bg-background/60 px-3 py-2.5 space-y-2">
                  <p className="text-xs font-medium text-foreground">
                    {t("adminDrivingQuickBookingDelayedLunchAsk")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={setDelayedRest ? "default" : "outline"}
                      className="h-8"
                      onClick={() => setSetDelayedRest(true)}
                    >
                      {t("yes")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={!setDelayedRest ? "default" : "outline"}
                      className="h-8"
                      onClick={() => setSetDelayedRest(false)}
                    >
                      {t("no")}
                    </Button>
                  </div>
                  {setDelayedRest ? (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                          {t("adminDrivingQuickBookingDelayedLunchStart")}
                        </label>
                        <Input
                          type="time"
                          step={60}
                          value={delayedRestStart}
                          onChange={(e) => setDelayedRestStart(e.target.value)}
                          className="h-9 tabular-nums"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                          {t("adminDrivingQuickBookingDelayedLunchEnd")}
                        </label>
                        <Input
                          type="time"
                          step={60}
                          value={delayedRestEnd}
                          onChange={(e) => setDelayedRestEnd(e.target.value)}
                          className="h-9 tabular-nums"
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <ul className="mt-1 max-h-24 overflow-y-auto space-y-0.5 text-sm text-foreground">
                {sortedEntries.map((entry) => (
                  <li key={`${entry.dateIso}|${entry.time}`} className="tabular-nums">
                    {formatGridDateLabel(entry.dateIso)} · {entry.time}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">{t("bookingColStudent")}</label>
          <AdminStudentPicker
            students={students}
            value={studentId}
            onChange={(s) => {
              setSelectedStudent(s);
              setStudentId(s ? String(s.id) : "");
            }}
            branchIdForNewStudent={branchId}
            onStudentCreated={(s) => {
              setSelectedStudent(s);
              setStudentId(String(s.id));
              onStudentCreated(s);
            }}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            {t("bookingStepLessonType")}
          </label>
          <select
            value={lessonType}
            onChange={(e) => setLessonType(e.target.value as PracticalLessonType | "")}
            className={cn(
              "w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring",
            )}
          >
            <option value="">{t("bookingSelectLessonTypePlaceholder")}</option>
            {PRACTICAL_LESSON_TYPES.map((value) => (
              <option key={value} value={value}>
                {getLessonTypeLabel(value)}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              {t("adminDrivingQuickBookingBranchLabel")}
            </label>
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {branches.map((br) => (
                <option key={br.id} value={br.id}>
                  {br.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">{t("status")}</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Status)}
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="confirmed">{t("confirmed")}</option>
              <option value="pending">{t("pending")}</option>
              <option value="cancelled">{t("cancelled")}</option>
              <option value="refunded">{t("refunded")}</option>
            </select>
          </div>
        </div>

        <AdminBookingPaymentSection
          totalPriceAmd={totalPriceAmd}
          totalPriceStr={totalPriceStr}
          onTotalPriceStrChange={setTotalPriceStr}
          totalPriceEditable
          value={bookingPayment}
          onChange={setBookingPayment}
          errorKey={paymentErrorKey}
          giftEnabled
          giftAutoApproved={isSuperAdminUser}
          isGift={isGift}
          onIsGiftChange={setIsGift}
          giftNote={giftNote}
          onGiftNoteChange={setGiftNote}
        />
      </form>
    </AppModal>
  );
}
