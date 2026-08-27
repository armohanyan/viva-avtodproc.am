import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Loader2, Pencil, Trash2, X } from "lucide-react";
import { AppModal } from "src/components/AppModal";
import RemarkConfirmDialog from "src/components/RemarkConfirmDialog";
import AdminBookingPaymentSection from "src/components/admin/AdminBookingPaymentSection";
import { Button } from "src/components/ui/button";
import type { Instructor } from "src/data/instructors";
import { useLang, type TranslationKey } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { cn } from "src/lib/utils";
import { parseAmdInput } from "src/pages/admin/finance/adminFinanceShared";
import {
  fetchAdminBookingById,
  normalizeAdminBookingRow,
  type AdminBookingRow,
} from "src/modules/admin/booking/adminBookings.api";
import {
  formatGridDateLabel,
  padSlotTime,
  slotEntryKey,
  sortSlotEntriesChrono,
  sortTimesUnique,
} from "src/modules/admin/booking/adminAvailabilityGrid";
import {
  adminPaymentApiPayload,
  adminPaymentFromBooking,
  paidAmountFromState,
  validateAdminBookingPayment,
  type AdminBookingPaymentState,
} from "src/modules/admin/booking/adminBookingPayment";
import AdminInstructorDaySlotsModal from "src/modules/admin/booking/AdminInstructorDaySlotsModal";
import type { Branch } from "src/modules/branches";

type Status = "confirmed" | "pending" | "cancelled" | "refunded";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: number;
  /** Slot the admin clicked in the day grid — highlighted so they can remove that one. */
  focusSlot?: { dateIso: string; time: string } | null;
  instructors: readonly Instructor[];
  branches: readonly Branch[];
  onChanged: () => void;
  onDeleted: () => void;
};

function parseTotalPriceAmd(str: string, fallback: number): number {
  const parsed = parseAmdInput(str);
  if (!Number.isFinite(parsed) || parsed < 0) return Math.max(0, Math.round(fallback));
  return Math.max(0, Math.round(parsed));
}

function financeStatusFromBookingStatus(status: Status): "completed" | "pending" | "failed" | "refunded" {
  if (status === "confirmed") return "completed";
  if (status === "refunded") return "refunded";
  if (status === "cancelled") return "failed";
  return "pending";
}

function slotsFromBooking(booking: AdminBookingRow): { dateIso: string; time: string }[] {
  if (booking.slotEntries && booking.slotEntries.length > 0) {
    return sortSlotEntriesChrono(
      booking.slotEntries.map((e) => ({
        dateIso: e.dateIso.slice(0, 10),
        time: padSlotTime(e.time),
      })),
    );
  }
  return [
    {
      dateIso: booking.dateIso.slice(0, 10),
      time: padSlotTime(booking.time),
    },
  ];
}

function paidKeysFromBooking(booking: AdminBookingRow): Set<string> {
  const keys = new Set<string>();
  const entries = booking.slotEntries ?? [];
  if (entries.length > 0) {
    for (const e of entries) {
      if (e.paymentCovered) {
        keys.add(slotEntryKey(e.dateIso.slice(0, 10), padSlotTime(e.time)));
      }
    }
    return keys;
  }
  return keys;
}

function slotEntriesEqual(
  a: readonly { dateIso: string; time: string }[],
  b: readonly { dateIso: string; time: string }[],
): boolean {
  if (a.length !== b.length) return false;
  return a.every(
    (entry, idx) =>
      entry.dateIso.slice(0, 10) === b[idx]!.dateIso.slice(0, 10) &&
      padSlotTime(entry.time) === padSlotTime(b[idx]!.time),
  );
}

export default function PracticalBookingDetailModal({
  open,
  onOpenChange,
  bookingId,
  focusSlot = null,
  instructors,
  branches,
  onChanged,
  onDeleted,
}: Props) {
  const formId = useId();
  const { t } = useLang();
  const { showToast } = useToast();

  const [booking, setBooking] = useState<AdminBookingRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("pending");
  const [branchId, setBranchId] = useState("");
  const [totalPriceStr, setTotalPriceStr] = useState("");
  const [bookingPayment, setBookingPayment] = useState<AdminBookingPaymentState>(() =>
    adminPaymentFromBooking({}),
  );
  const [paymentErrorKey, setPaymentErrorKey] = useState<TranslationKey | null>(null);
  const [slotEntries, setSlotEntries] = useState<{ dateIso: string; time: string }[]>([]);
  /** Slot keys marked as paid when booking payment is partial. */
  const [paidSlotKeys, setPaidSlotKeys] = useState<Set<string>>(() => new Set());
  const [submitting, setSubmitting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [slotsModalOpen, setSlotsModalOpen] = useState(false);
  const [slotToRemove, setSlotToRemove] = useState<{ dateIso: string; time: string } | null>(null);
  const [removingSlot, setRemovingSlot] = useState(false);

  const load = useCallback(async () => {
    if (!bookingId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const raw = await fetchAdminBookingById(bookingId);
      const row = normalizeAdminBookingRow(raw);
      setBooking(row);
      setStatus((row.status as Status) || "pending");
      setBranchId(String(row.branchId));
      setTotalPriceStr(
        row.totalPriceAmd != null && Number.isFinite(Number(row.totalPriceAmd))
          ? String(Math.round(Number(row.totalPriceAmd)))
          : "",
      );
      const finance = row.manualFinanceTx ?? row.systemFinanceTx;
      setBookingPayment(
        adminPaymentFromBooking(row, finance
          ? {
              method: (finance.method as AdminBookingPaymentState["method"]) || "cash",
              createdAt: finance.createdAt,
            }
          : null),
      );
      setSlotEntries(slotsFromBooking(row));
      setPaidSlotKeys(paidKeysFromBooking(row));
      setPaymentErrorKey(null);
    } catch (e) {
      setLoadError(getApiErrorMessage(e));
      setBooking(null);
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  const instructor = useMemo(() => {
    if (!booking) return null;
    const byName = instructors.find((i) => i.name === booking.instructorName);
    if (byName) return byName;
    return null;
  }, [booking, instructors]);

  const branchOptions = useMemo(() => {
    const available = instructor?.availableBranchIds ?? [];
    if (available.length === 0) return branches;
    const allowed = new Set(available.map(String));
    if (branchId) allowed.add(String(branchId));
    const filtered = branches.filter((b) => allowed.has(String(b.id)));
    return filtered.length > 0 ? filtered : branches;
  }, [instructor, branches, branchId]);

  const totalPriceAmd = useMemo(
    () => parseTotalPriceAmd(totalPriceStr, Number(booking?.totalPriceAmd) || 0),
    [totalPriceStr, booking?.totalPriceAmd],
  );

  const sortedEntries = useMemo(() => sortSlotEntriesChrono(slotEntries), [slotEntries]);
  const firstEntry = sortedEntries[0];
  const showPaidSlotPickers = bookingPayment.status === "partial" && sortedEntries.length > 1;

  const dateLabel = useMemo(() => {
    const dates = Array.from(new Set(sortedEntries.map((e) => e.dateIso)));
    if (dates.length === 0) return "";
    if (dates.length === 1) return formatGridDateLabel(dates[0]!);
    return `${formatGridDateLabel(dates[0]!)} – ${formatGridDateLabel(dates[dates.length - 1]!)}`;
  }, [sortedEntries]);

  const togglePaidSlot = (entry: { dateIso: string; time: string }) => {
    const key = slotEntryKey(entry.dateIso, entry.time);
    setPaidSlotKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking || submitting || !firstEntry) return;

    const payErr = validateAdminBookingPayment(bookingPayment, totalPriceAmd);
    if (payErr) {
      setPaymentErrorKey(payErr);
      showToast(t(payErr), "error");
      return;
    }
    setPaymentErrorKey(null);

    if (showPaidSlotPickers && paidSlotKeys.size === 0) {
      showToast(t("adminDrivingPaidSlotsRequired"), "error");
      return;
    }

    const paymentBody = adminPaymentApiPayload(bookingPayment, totalPriceAmd);
    const paid =
      paymentBody.adminPaymentStatus === "paid"
        ? totalPriceAmd
        : paymentBody.paidAmountAmd ?? paidAmountFromState(bookingPayment);

    setSubmitting(true);
    try {
      const sameDayTimes = sortedEntries
        .filter((entry) => entry.dateIso === firstEntry.dateIso)
        .map((entry) => entry.time);
      const times = sortTimesUnique(sameDayTimes.length > 0 ? sameDayTimes : [firstEntry.time]);
      const instructorName = instructor?.name ?? booking.instructorName;
      const scheduleChanged = !slotEntriesEqual(slotsFromBooking(booking), sortedEntries);
      const customEnd = booking.endTime ? padSlotTime(String(booking.endTime)) : "";
      const keepCustomWindow =
        sortedEntries.length === 1 &&
        Boolean(customEnd) &&
        (!scheduleChanged || padSlotTime(sortedEntries[0]!.time) === padSlotTime(booking.time));

      const paidSlotEntries =
        paymentBody.adminPaymentStatus === "partial"
          ? sortedEntries.length === 1
            ? sortedEntries.map((entry) => ({ dateIso: entry.dateIso, time: entry.time }))
            : sortedEntries
                .filter((entry) => paidSlotKeys.has(slotEntryKey(entry.dateIso, entry.time)))
                .map((entry) => ({ dateIso: entry.dateIso, time: entry.time }))
          : undefined;

      await vivaApiJson(`/bookings/${encodeURIComponent(booking.id)}`, {
        method: "PATCH",
        body: {
          studentId: Number(booking.studentId),
          branchId: Number(branchId),
          status,
          totalPriceAmd,
          ...paymentBody,
          ...(paidSlotEntries ? { paidSlotEntries } : {}),
          ...(scheduleChanged
            ? {
                type: "practical" as const,
                dateIso: firstEntry.dateIso,
                slots: times,
                instructorName,
                ...(instructor && Number.isFinite(Number(instructor.id))
                  ? { instructorUserId: Number(instructor.id) }
                  : {}),
                slotEntries: sortedEntries.map((entry) => ({
                  dateIso: entry.dateIso,
                  time: entry.time,
                })),
                ...(keepCustomWindow
                  ? { allowCustomPracticalTime: true, customSlotEndTime: customEnd }
                  : {}),
              }
            : {}),
        },
      });

      const hasSystemTx = Boolean(booking.systemFinanceTx);
      if (!hasSystemTx && paid > 0) {
        const bookingIdNum = Number(booking.id);
        if (booking.manualFinanceTx?.id) {
          await vivaApiJson(`/finance/transactions/${booking.manualFinanceTx.id}`, {
            method: "PATCH",
            body: {
              createdAt: new Date(bookingPayment.datetimeLocal).toISOString(),
              method: bookingPayment.method,
              grossAmd: paid,
              status: financeStatusFromBookingStatus(status),
              branchId: Number(branchId),
              bookingId: bookingIdNum,
            },
          });
        } else {
          await vivaApiJson("/finance/transactions", {
            method: "POST",
            body: {
              createdAt: new Date(bookingPayment.datetimeLocal).toISOString(),
              customer: (booking.studentName ?? "").trim() || `Student #${booking.studentId}`,
              email: (booking.studentEmail ?? "").trim(),
              branchId: Number(branchId),
              method: bookingPayment.method,
              grossAmd: paid,
              status: financeStatusFromBookingStatus(status),
              source: "manual",
              bookingId: bookingIdNum,
            },
          });
        }
      }

      showToast(t("bookingUpdatedToast"), "success");
      onChanged();
      onOpenChange(false);
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (remark: string) => {
    if (!booking) return;
    try {
      await vivaApiJson(`/bookings/${encodeURIComponent(booking.id)}/archive`, {
        method: "POST",
        body: { remark },
      });
      setDeleteOpen(false);
      showToast(t("bookingArchivedMsg"), "success");
      onDeleted();
      onOpenChange(false);
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
      throw e;
    }
  };

  const focusKey = focusSlot
    ? slotEntryKey(focusSlot.dateIso.slice(0, 10), padSlotTime(focusSlot.time))
    : null;
  const canRemoveIndividualSlot = sortedEntries.length > 1;

  const handleRemoveSlot = async (remark: string) => {
    if (!booking || !slotToRemove) return;
    setRemovingSlot(true);
    try {
      await vivaApiJson(`/bookings/${encodeURIComponent(booking.id)}/remove-slot`, {
        method: "POST",
        body: {
          dateIso: slotToRemove.dateIso.slice(0, 10),
          time: padSlotTime(slotToRemove.time),
          remark,
        },
      });
      setSlotToRemove(null);
      showToast(t("adminDrivingSlotRemovedToast"), "success");
      await load();
      onChanged();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
      throw e;
    } finally {
      setRemovingSlot(false);
    }
  };

  return (
    <>
      <AppModal
        open={open}
        onOpenChange={(o) => {
          if (submitting || removingSlot) return;
          onOpenChange(o);
        }}
        title={t("adminDrivingBookingDetailTitle")}
        contentClassName="w-full max-w-[calc(100%-2rem)] sm:max-w-xl"
        footer={
          booking && !loading ? (
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <Button
                type="button"
                variant="destructive"
                className="sm:mr-auto"
                disabled={submitting || removingSlot}
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                {t("delete")}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
                disabled={submitting || removingSlot}
              >
                {t("cancel")}
              </Button>
              <Button
                type="submit"
                form={formId}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={submitting || removingSlot}
              >
                {submitting ? t("saving") : t("saveChanges")}
              </Button>
            </div>
          ) : undefined
        }
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("loading")}
          </div>
        ) : loadError ? (
          <p className="text-sm text-destructive">{loadError}</p>
        ) : booking ? (
          <form id={formId} onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {t("adminDrivingQuickBookingInstructorLabel")}
                </p>
                {instructor ? (
                  <button
                    type="button"
                    onClick={() => setSlotsModalOpen(true)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    <Pencil className="h-3 w-3" />
                    {t("adminDrivingQuickBookingChangeSlots")}
                  </button>
                ) : null}
              </div>
              <p className="text-sm font-semibold text-foreground">
                {instructor?.name ?? booking.instructorName}
              </p>
              <div>
                <p className="text-xs font-medium text-muted-foreground mt-1">
                  {t("adminDrivingQuickBookingSlotsLabel")}
                  {dateLabel ? (
                    <span className="ml-1 tabular-nums text-foreground">· {dateLabel}</span>
                  ) : null}
                </p>
                {showPaidSlotPickers ? (
                  <p className="mt-1 text-[11px] text-muted-foreground">{t("adminDrivingPaidSlotsHint")}</p>
                ) : null}
                <ul className="mt-1 max-h-48 overflow-y-auto space-y-1 text-sm text-foreground">
                  {sortedEntries.map((entry) => {
                    const key = slotEntryKey(entry.dateIso, entry.time);
                    const isFocus = focusKey === key;
                    const isPaidHour = paidSlotKeys.has(key);
                    return (
                      <li
                        key={key}
                        className={cn(
                          "flex items-center justify-between gap-2 rounded-md px-1.5 py-1 tabular-nums",
                          isFocus ? "bg-primary/10 ring-1 ring-primary/30" : "",
                        )}
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          {showPaidSlotPickers ? (
                            <label className="inline-flex shrink-0 items-center gap-1.5 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={isPaidHour}
                                disabled={submitting || removingSlot}
                                onChange={() => togglePaidSlot(entry)}
                                className="h-3.5 w-3.5 rounded border-input accent-primary"
                                aria-label={t("adminDrivingSlotPaidCheckbox")}
                              />
                              <span className="sr-only">{t("adminDrivingSlotPaidCheckbox")}</span>
                            </label>
                          ) : null}
                          <span className="min-w-0 truncate">
                            {formatGridDateLabel(entry.dateIso)} · {entry.time}
                            {isFocus ? (
                              <span className="ml-1.5 text-[11px] font-medium text-primary">
                                {t("adminDrivingClickedSlotHint")}
                              </span>
                            ) : null}
                            {showPaidSlotPickers && isPaidHour ? (
                              <span className="ml-1.5 text-[11px] font-medium text-emerald-700">
                                {t("adminDrivingSlotPaidBadge")}
                              </span>
                            ) : null}
                          </span>
                        </div>
                        <button
                          type="button"
                          disabled={submitting || removingSlot}
                          title={
                            canRemoveIndividualSlot
                              ? t("adminDrivingRemoveSlot")
                              : t("adminDrivingRemoveSlotLastHint")
                          }
                          aria-label={t("adminDrivingRemoveSlot")}
                          onClick={() => {
                            if (!canRemoveIndividualSlot) {
                              showToast(t("adminDrivingRemoveSlotLastHint"), "error");
                              return;
                            }
                            setSlotToRemove(entry);
                          }}
                          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                        >
                          <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">{t("bookingColStudent")}</p>
              <p className="text-sm font-semibold text-foreground">{booking.studentName}</p>
              {booking.studentPhone ? (
                <p className="text-sm tabular-nums text-muted-foreground">{booking.studentPhone}</p>
              ) : null}
              {booking.studentPhone2 ? (
                <p className="text-sm tabular-nums text-muted-foreground">{booking.studentPhone2}</p>
              ) : null}
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
                  {branchOptions.map((br) => (
                    <option key={br.id} value={br.id}>
                      {br.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  {t("status")}
                </label>
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
            />
          </form>
        ) : null}
      </AppModal>

      {instructor && booking && slotsModalOpen ? (
        <AdminInstructorDaySlotsModal
          open
          onOpenChange={(o) => {
            if (!o) setSlotsModalOpen(false);
          }}
          instructorId={instructor.id}
          instructorName={instructor.name}
          branchId={String(branchId || booking.branchId)}
          dateIso={firstEntry?.dateIso ?? booking.dateIso}
          slotSource="practical"
          ignoreBusyBookingId={String(booking.id)}
          initialSelected={sortedEntries}
          t={t}
          onConfirm={(entries) => {
            const next = sortSlotEntriesChrono(entries);
            setSlotEntries(next);
            setPaidSlotKeys((prev) => {
              const allowed = new Set(next.map((e) => slotEntryKey(e.dateIso, e.time)));
              return new Set([...prev].filter((k) => allowed.has(k)));
            });
            setSlotsModalOpen(false);
          }}
        />
      ) : null}

      <RemarkConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title={t("bookingArchiveTitle")}
        description={t("bookingArchiveDesc")}
        confirmLabel={t("adminArchiveConfirm")}
        danger
      />

      <RemarkConfirmDialog
        open={slotToRemove != null}
        onClose={() => {
          if (removingSlot) return;
          setSlotToRemove(null);
        }}
        onConfirm={handleRemoveSlot}
        title={t("adminDrivingRemoveSlotTitle")}
        description={
          slotToRemove
            ? `${t("adminDrivingRemoveSlotDesc")} ${formatGridDateLabel(slotToRemove.dateIso)} · ${padSlotTime(slotToRemove.time)}`
            : t("adminDrivingRemoveSlotDesc")
        }
        confirmLabel={t("adminDrivingRemoveSlot")}
        danger
      />
    </>
  );
}
