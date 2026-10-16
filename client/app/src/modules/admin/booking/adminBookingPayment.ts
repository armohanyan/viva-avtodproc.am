import { parseAmdInput, toDatetimeLocalValue, type TxMethod } from "src/pages/admin/finance/adminFinanceShared";
import type { TranslationKey } from "src/lib/i18n";

/** Admin booking payment status (maps to API `adminPaymentStatus`). */
export type AdminBookingPaymentStatus = "paid" | "partial" | "unpaid";

/** Booking lifecycle status follows payment: paid → confirmed, otherwise → pending. */
export function bookingStatusFromAdminPayment(
  paymentStatus: AdminBookingPaymentStatus,
  currentStatus?: string,
): "confirmed" | "pending" | "cancelled" | "refunded" {
  const explicit = String(currentStatus ?? "").trim().toLowerCase();
  if (explicit === "cancelled" || explicit === "refunded") return explicit;
  return paymentStatus === "paid" ? "confirmed" : "pending";
}

export type AdminBookingPaymentSessionSource = "manual" | "system" | "legacy";

/** One office or online payment toward a booking. */
export type AdminBookingPaymentSession = {
  key: string;
  financeTxId: number | null;
  source: AdminBookingPaymentSessionSource;
  /** Online (vPOS) rows cannot be edited or removed. */
  locked: boolean;
  paidStr: string;
  datetimeLocal: string;
  method: TxMethod;
  note: string;
};

export type AdminBookingPaymentInstallmentPayload = {
  id?: number;
  amountAmd: number;
  recordedAt: string;
  method: TxMethod;
  note: string | null;
};

export type AdminBookingPaymentState = {
  status: AdminBookingPaymentStatus;
  /** Sum of session amounts. Kept so older callers that read one paid field stay correct. */
  paidStr: string;
  /** Method of the first editable session. */
  method: TxMethod;
  /** Datetime of the first editable session. */
  datetimeLocal: string;
  /** Session notes joined with newlines. */
  paymentNotes: string;
  paymentReminderDate: string;
  sessions?: AdminBookingPaymentSession[];
};

const TX_METHODS: readonly TxMethod[] = ["card", "idram", "cash", "transfer"];

function isTxMethod(value: string): value is TxMethod {
  return (TX_METHODS as readonly string[]).includes(value);
}

let paymentSessionSeq = 0;

function newPaymentSessionKey(): string {
  paymentSessionSeq += 1;
  return `pay-${paymentSessionSeq}`;
}

export function emptyPaymentSession(
  partial?: Partial<AdminBookingPaymentSession>,
): AdminBookingPaymentSession {
  return {
    key: partial?.key ?? newPaymentSessionKey(),
    financeTxId: partial?.financeTxId ?? null,
    source: partial?.source ?? "manual",
    locked: partial?.locked ?? false,
    paidStr: partial?.paidStr ?? "0",
    datetimeLocal: partial?.datetimeLocal ?? toDatetimeLocalValue(new Date()),
    method: partial?.method ?? "cash",
    note: partial?.note ?? "",
  };
}

export function sessionAmountAmd(session: AdminBookingPaymentSession): number {
  const raw = parseAmdInput(session.paidStr);
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return Math.round(raw);
}

export function sessionsPaidSum(sessions: readonly AdminBookingPaymentSession[]): number {
  return sessions.reduce((sum, session) => sum + sessionAmountAmd(session), 0);
}

function stateSessions(state: AdminBookingPaymentState): AdminBookingPaymentSession[] {
  if (state.sessions && state.sessions.length > 0) return state.sessions;
  return [
    emptyPaymentSession({
      paidStr: state.paidStr,
      datetimeLocal: state.datetimeLocal,
      method: state.method,
      note: state.paymentNotes,
      source: "legacy",
    }),
  ];
}

function joinedSessionNotes(sessions: readonly AdminBookingPaymentSession[]): string {
  return sessions
    .map((session) => session.note.trim())
    .filter(Boolean)
    .join("\n");
}

/** Recompute status, remaining inputs, and the legacy single-amount fields from sessions. */
export function syncAdminPaymentFromSessions(
  state: AdminBookingPaymentState,
  totalAmd: number,
): AdminBookingPaymentState {
  const sessions = stateSessions(state);
  const paid = sessionsPaidSum(sessions);
  const total = Math.max(0, Math.round(totalAmd));
  const status = inferAdminPaymentStatusFromAmounts(total, paid);
  const primary = sessions.find((session) => !session.locked) ?? sessions[0];
  return {
    ...state,
    sessions,
    status,
    paidStr: String(paid),
    method: primary?.method ?? state.method,
    datetimeLocal: primary?.datetimeLocal ?? state.datetimeLocal,
    paymentNotes: joinedSessionNotes(sessions),
    ...(status === "paid" ? { paymentReminderDate: "" } : {}),
  };
}

export function defaultAdminBookingPayment(status: AdminBookingPaymentStatus = "unpaid"): AdminBookingPaymentState {
  const session = emptyPaymentSession({ paidStr: "0" });
  return {
    status,
    paidStr: "0",
    method: session.method,
    datetimeLocal: session.datetimeLocal,
    paymentNotes: "",
    paymentReminderDate: "",
    sessions: [session],
  };
}

function paidTargetFromStr(paidStr: string): number {
  if (paidStr.trim() === "") return 0;
  const raw = parseAmdInput(paidStr);
  return Number.isFinite(raw) && raw > 0 ? Math.round(raw) : 0;
}

/**
 * Set the collected total without collapsing several sessions into one row.
 * A matching sum is left as-is. One session takes the new amount. Several sessions
 * adjust only the last editable amount.
 */
export function withAdminBookingPaidStr(
  state: AdminBookingPaymentState,
  paidStr: string,
  totalAmd: number,
): AdminBookingPaymentState {
  const target = paidTargetFromStr(paidStr);
  const sessions = stateSessions(state);
  if (sessionsPaidSum(sessions) === target) {
    return syncAdminPaymentFromSessions({ ...state, sessions }, totalAmd);
  }
  const locked = sessions.filter((session) => session.locked);
  const lockedSum = sessionsPaidSum(locked);
  if (target === 0) {
    const first = sessions.find((session) => !session.locked) ?? sessions[0];
    return syncAdminPaymentFromSessions(
      {
        ...state,
        sessions: [
          ...locked,
          emptyPaymentSession({
            method: first?.method ?? "cash",
            datetimeLocal: first?.datetimeLocal ?? toDatetimeLocalValue(new Date()),
            paidStr: "0",
            note: "",
          }),
        ],
      },
      totalAmd,
    );
  }
  const unlocked = sessions.filter((session) => !session.locked);
  const unlockedTarget = Math.max(0, target - lockedSum);
  if (unlocked.length <= 1) {
    const current = unlocked[0];
    const nextUnlocked = emptyPaymentSession({
      ...(current ?? {}),
      key: current?.key,
      financeTxId: current?.financeTxId ?? null,
      source: current?.source ?? "manual",
      locked: false,
      paidStr: String(unlockedTarget),
      method: current?.method ?? "cash",
      datetimeLocal: current?.datetimeLocal ?? toDatetimeLocalValue(new Date()),
      note: current?.note ?? "",
    });
    return syncAdminPaymentFromSessions({ ...state, sessions: [...locked, nextUnlocked] }, totalAmd);
  }
  const head = unlocked.slice(0, -1);
  const headSum = sessionsPaidSum(head);
  const last = unlocked[unlocked.length - 1]!;
  const nextLast = { ...last, paidStr: String(Math.max(0, unlockedTarget - headSum)) };
  return syncAdminPaymentFromSessions(
    { ...state, sessions: [...locked, ...head, nextLast] },
    totalAmd,
  );
}

export function updateAdminPaymentSession(
  state: AdminBookingPaymentState,
  key: string,
  patch: Partial<Pick<AdminBookingPaymentSession, "paidStr" | "datetimeLocal" | "method" | "note">>,
  totalAmd: number,
): AdminBookingPaymentState {
  const sessions = stateSessions(state).map((session) => {
    if (session.key !== key || session.locked) return session;
    return { ...session, ...patch };
  });
  return syncAdminPaymentFromSessions({ ...state, sessions }, totalAmd);
}

export function addAdminPaymentSession(
  state: AdminBookingPaymentState,
  totalAmd: number,
): AdminBookingPaymentState {
  return syncAdminPaymentFromSessions(
    {
      ...state,
      sessions: [...stateSessions(state), emptyPaymentSession()],
    },
    totalAmd,
  );
}

export function removeAdminPaymentSession(
  state: AdminBookingPaymentState,
  key: string,
  totalAmd: number,
): AdminBookingPaymentState {
  const sessions = stateSessions(state);
  const target = sessions.find((session) => session.key === key);
  if (!target || target.locked) return syncAdminPaymentFromSessions({ ...state, sessions }, totalAmd);
  const next = sessions.filter((session) => session.key !== key);
  return syncAdminPaymentFromSessions(
    {
      ...state,
      sessions:
        next.length > 0
          ? next
          : [
              emptyPaymentSession({
                method: target.method,
                datetimeLocal: target.datetimeLocal,
              }),
            ],
    },
    totalAmd,
  );
}

/** Paid adds the remainder onto the last editable session. Unpaid clears editable amounts. */
export function adminPaymentStateForStatusChoice(
  state: AdminBookingPaymentState,
  status: AdminBookingPaymentStatus,
  totalAmd: number,
): AdminBookingPaymentState {
  const total = Math.max(0, Math.round(totalAmd));
  const sessions = stateSessions(state);
  if (status === "unpaid") {
    return withAdminBookingPaidStr({ ...state, sessions }, "0", total);
  }
  if (status === "paid") {
    const paid = sessionsPaidSum(sessions);
    const remainder = Math.max(0, total - paid);
    if (remainder <= 0) return syncAdminPaymentFromSessions({ ...state, sessions }, total);
    let idx = -1;
    for (let i = sessions.length - 1; i >= 0; i -= 1) {
      if (!sessions[i]!.locked) {
        idx = i;
        break;
      }
    }
    const next = [...sessions];
    if (idx < 0) {
      next.push(emptyPaymentSession({ paidStr: String(remainder) }));
    } else {
      const current = next[idx]!;
      next[idx] = { ...current, paidStr: String(sessionAmountAmd(current) + remainder) };
    }
    return syncAdminPaymentFromSessions({ ...state, sessions: next }, total);
  }
  return syncAdminPaymentFromSessions({ ...state, sessions }, total);
}

/** Show "Ստեղծել նոր վճարում" while the sum is a real partial payment and the last session has an amount. */
export function canAddAdminPaymentSession(state: AdminBookingPaymentState, totalAmd: number): boolean {
  const total = Math.max(0, Math.round(totalAmd));
  if (total <= 0) return false;
  const sessions = stateSessions(state);
  const paid = sessionsPaidSum(sessions);
  if (paid <= 0 || paid >= total) return false;
  const last = sessions[sessions.length - 1];
  if (!last || sessionAmountAmd(last) <= 0) return false;
  return true;
}

export function paidAmountFromState(state: AdminBookingPaymentState): number {
  if (state.sessions && state.sessions.length > 0) return sessionsPaidSum(state.sessions);
  const paid = parseAmdInput(state.paidStr);
  return Number.isFinite(paid) && paid > 0 ? Math.round(paid) : 0;
}

/** Derive admin payment status from total vs paid (amounts are source of truth in the UI). */
export function inferAdminPaymentStatusFromAmounts(
  totalAmd: number,
  paidAmd: number,
): AdminBookingPaymentStatus {
  const total = Math.max(0, Math.round(totalAmd));
  const paid = Math.max(0, Math.round(paidAmd));
  if (total <= 0) return "paid";
  if (paid <= 0) return "unpaid";
  if (paid >= total) return "paid";
  return "partial";
}

/** After the booking price or a single paid amount changes, keep sessions and status aligned. */
export function adminPaymentStateAfterPaidStrChange(
  state: AdminBookingPaymentState,
  paidStr: string,
  totalAmd: number,
): AdminBookingPaymentState {
  return withAdminBookingPaidStr(state, paidStr, totalAmd);
}

function datetimeLocalFromIsoCandidates(...candidates: Array<string | null | undefined>): string {
  for (const raw of candidates) {
    if (!raw) continue;
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return toDatetimeLocalValue(d);
  }
  return toDatetimeLocalValue(new Date());
}

export type AdminBookingPaymentInstallmentSource = {
  id: number;
  source: "manual" | "system";
  method?: string | null;
  createdAt?: string | null;
  grossAmd?: number | null;
  staffNote?: string | null;
  status?: string | null;
};

function activeInstallmentRows(
  rows: readonly AdminBookingPaymentInstallmentSource[] | null | undefined,
): AdminBookingPaymentInstallmentSource[] {
  return (rows ?? []).filter((row) => {
    const status = String(row.status ?? "").trim().toLowerCase();
    return status !== "failed" && status !== "refunded";
  });
}

function sessionFromInstallment(
  row: AdminBookingPaymentInstallmentSource,
  bookingNotes: string,
  onlyOne: boolean,
): AdminBookingPaymentSession {
  const method = isTxMethod(String(row.method ?? "")) ? (row.method as TxMethod) : "cash";
  const staffNote = row.staffNote?.trim() ?? "";
  const note = staffNote || (onlyOne ? bookingNotes : "");
  return emptyPaymentSession({
    financeTxId: row.id,
    source: row.source === "system" ? "system" : "manual",
    locked: row.source === "system",
    paidStr: String(Math.max(0, Math.round(Number(row.grossAmd) || 0))),
    datetimeLocal: datetimeLocalFromIsoCandidates(row.createdAt),
    method,
    note,
  });
}

export function bookingPaymentIsSystemOnly(booking: {
  paymentInstallments?: readonly AdminBookingPaymentInstallmentSource[] | null;
  manualFinanceTx?: { id?: number; source?: string } | null;
  systemFinanceTx?: { id?: number; source?: string } | null;
}): boolean {
  const rows = activeInstallmentRows(booking.paymentInstallments);
  if (rows.length > 0) return rows.every((row) => row.source === "system");
  return !booking.manualFinanceTx && Boolean(booking.systemFinanceTx);
}

export function adminPaymentFromBooking(
  booking: {
    paymentStatus?: string | null;
    paidAmountAmd?: number | null;
    totalPriceAmd?: number | null;
    paymentNotes?: string | null;
    paymentReminderDateIso?: string | null;
    /** Preferred when no finance tx — when payment was captured. */
    paidAtIso?: string | null;
    /** Fallback — when the booking itself was created. */
    createdAt?: string | null;
    paymentInstallments?: readonly AdminBookingPaymentInstallmentSource[] | null;
    manualFinanceTx?: AdminBookingPaymentInstallmentSource | null;
    systemFinanceTx?: AdminBookingPaymentInstallmentSource | null;
  },
  finance?: { method?: TxMethod; createdAt?: string; id?: number; source?: "manual" | "system"; grossAmd?: number } | null,
): AdminBookingPaymentState {
  const ps = String(booking.paymentStatus ?? "").trim().toLowerCase();
  const total = booking.totalPriceAmd ?? 0;
  const paid = booking.paidAmountAmd ?? 0;
  let status: AdminBookingPaymentStatus = "unpaid";
  let paidStr = "0";
  if (ps === "paid" || (total > 0 && paid >= total)) {
    status = "paid";
    paidStr = paid > 0 ? String(paid) : total > 0 ? String(total) : "0";
  } else if (ps === "partial" || (paid > 0 && paid < total)) {
    status = "partial";
    paidStr = paid > 0 ? String(paid) : "0";
  } else if (paid > 0) {
    status = "partial";
    paidStr = String(paid);
  }
  const bookingNotes = booking.paymentNotes?.trim() ?? "";
  const datetimeLocal = datetimeLocalFromIsoCandidates(
    finance?.createdAt,
    booking.paidAtIso,
    booking.createdAt,
  );
  const fromList = activeInstallmentRows(booking.paymentInstallments);
  const fallbackLinks: AdminBookingPaymentInstallmentSource[] = [];
  if (fromList.length === 0) {
    if (booking.manualFinanceTx) fallbackLinks.push({ ...booking.manualFinanceTx, source: "manual" });
    if (booking.systemFinanceTx) fallbackLinks.push({ ...booking.systemFinanceTx, source: "system" });
    if (fallbackLinks.length === 0 && finance?.id) {
      fallbackLinks.push({
        id: finance.id,
        source: finance.source ?? "manual",
        method: finance.method,
        createdAt: finance.createdAt,
        grossAmd: finance.grossAmd,
      });
    }
  }
  const installmentRows = fromList.length > 0 ? fromList : fallbackLinks;
  let sessions: AdminBookingPaymentSession[];
  if (installmentRows.length > 0) {
    sessions = installmentRows.map((row) =>
      sessionFromInstallment(row, bookingNotes, installmentRows.length === 1),
    );
  } else if (paid > 0 || status === "paid") {
    sessions = [
      emptyPaymentSession({
        source: "legacy",
        paidStr,
        datetimeLocal,
        method: finance?.method ?? "cash",
        note: bookingNotes,
      }),
    ];
  } else {
    sessions = [
      emptyPaymentSession({
        paidStr: "0",
        datetimeLocal,
        method: finance?.method ?? "cash",
        note: "",
      }),
    ];
  }
  return syncAdminPaymentFromSessions(
    {
      status,
      paidStr,
      method: finance?.method ?? sessions[0]?.method ?? "cash",
      datetimeLocal,
      paymentNotes: bookingNotes,
      paymentReminderDate: booking.paymentReminderDateIso?.slice(0, 10) ?? "",
      sessions,
    },
    total,
  );
}

export function bookingRemainingAmd(totalAmd: number, state: AdminBookingPaymentState): number {
  const total = Math.max(0, Math.round(totalAmd));
  return Math.max(0, total - paidAmountFromState(state));
}

export function validateAdminBookingPayment(
  state: AdminBookingPaymentState,
  totalAmd: number,
): TranslationKey | null {
  const total = Math.max(0, Math.round(totalAmd));
  if (total <= 0) return null;
  const sessions = stateSessions(state);
  let sum = 0;
  for (const session of sessions) {
    const raw = parseAmdInput(session.paidStr);
    const paid = Number.isFinite(raw) ? raw : session.paidStr.trim() === "" ? 0 : NaN;
    if (!Number.isFinite(paid)) return "adminBookingPaymentPartialRequired";
    if (paid < 0) return "adminBookingPaymentPartialPositive";
    sum += Math.round(paid);
    if (paid > 0 && !session.locked) {
      const created = new Date(session.datetimeLocal);
      if (Number.isNaN(created.getTime())) return "financeManualErrorDate";
    }
  }
  if (sum > total) return "adminBookingPaymentPartialLessThanTotal";
  const status = inferAdminPaymentStatusFromAmounts(total, sum);
  if (status === "partial" && sum <= 0) return "adminBookingPaymentPartialPositive";
  return null;
}

function paymentRecordedAtIso(datetimeLocal: string): string | undefined {
  const created = new Date(datetimeLocal);
  if (Number.isNaN(created.getTime())) return undefined;
  return created.toISOString();
}

function paymentInstallmentsFromState(
  state: AdminBookingPaymentState,
): AdminBookingPaymentInstallmentPayload[] {
  return stateSessions(state)
    .filter((session) => sessionAmountAmd(session) > 0)
    .map((session) => ({
      ...(session.financeTxId != null ? { id: session.financeTxId } : {}),
      amountAmd: sessionAmountAmd(session),
      recordedAt: paymentRecordedAtIso(session.datetimeLocal) ?? new Date().toISOString(),
      method: session.method,
      note: session.note.trim() ? session.note.trim() : null,
    }));
}

export function adminPaymentApiPayload(
  state: AdminBookingPaymentState,
  totalAmd: number,
): {
  adminPaymentStatus: AdminBookingPaymentStatus;
  paidAmountAmd?: number;
  paymentNotes?: string | null;
  paymentReminderDate?: string | null;
  paymentMethod: TxMethod;
  paymentRecordedAt?: string;
  paymentInstallments: AdminBookingPaymentInstallmentPayload[];
} {
  const total = Math.max(0, Math.round(totalAmd));
  const normalized = withAdminBookingPaidStr(state, state.paidStr, total);
  const paidFromField = Math.min(total, Math.max(0, paidAmountFromState(normalized)));
  const notes = normalized.paymentNotes.trim() ? normalized.paymentNotes.trim() : null;
  const status = inferAdminPaymentStatusFromAmounts(total, paidFromField);
  const reminderDate =
    status === "paid"
      ? null
      : normalized.paymentReminderDate.trim()
        ? normalized.paymentReminderDate.trim().slice(0, 10)
        : null;
  const paymentMethod = normalized.method;
  const paymentRecordedAt = paymentRecordedAtIso(normalized.datetimeLocal);
  const recorded = paymentRecordedAt ? { paymentRecordedAt } : {};
  const paymentInstallments = status === "unpaid" ? [] : paymentInstallmentsFromState(normalized);
  if (status === "paid") {
    return {
      adminPaymentStatus: "paid",
      paidAmountAmd: total,
      paymentNotes: notes,
      paymentReminderDate: null,
      paymentMethod,
      paymentInstallments,
      ...recorded,
    };
  }
  if (status === "unpaid") {
    return {
      adminPaymentStatus: "unpaid",
      paidAmountAmd: 0,
      paymentNotes: notes,
      paymentReminderDate: reminderDate,
      paymentMethod,
      paymentInstallments,
      ...recorded,
    };
  }
  return {
    adminPaymentStatus: "partial",
    paidAmountAmd: paidFromField,
    paymentNotes: notes,
    paymentReminderDate: reminderDate,
    paymentMethod,
    paymentInstallments,
    ...recorded,
  };
}

export type BookingListPaymentRow = {
  totalAmd: number;
  paidAmd: number;
  remainingAmd: number;
  status: AdminBookingPaymentStatus | "pending" | "failed" | "na";
  /** Catalog package name when the lesson is covered by a package order. */
  packageName?: string | null;
};

/** Cash-like income from booking payment fields (paid or partial only). */
export function recognizedBookingIncomeAmd(booking: {
  status?: string;
  paymentStatus?: string | null;
  paidAmountAmd?: number | null;
  totalPriceAmd?: number | null;
  coveredByPackage?: boolean;
}): number {
  const lifecycle = String(booking.status ?? "").trim().toLowerCase();
  if (lifecycle === "cancelled" || lifecycle === "refunded") return 0;
  if (booking.coveredByPackage) return 0;
  const row = bookingListPaymentRow(booking);
  if (row.status === "paid" || row.status === "partial") return row.paidAmd;
  return 0;
}

export function bookingListPaymentRow(booking: {
  paymentStatus?: string | null;
  paidAmountAmd?: number | null;
  totalPriceAmd?: number | null;
  coveredByPackage?: boolean;
  packageName?: string | null;
  isGift?: boolean;
}): BookingListPaymentRow {
  const packageName = booking.packageName?.trim() || null;
  // Package-credit lessons follow the package payment. Unpaid package → unpaid lesson.
  if (booking.coveredByPackage) {
    const ps = String(booking.paymentStatus ?? "").trim().toLowerCase();
    if (ps === "unpaid" || ps === "pending" || ps === "failed") {
      return { totalAmd: 0, paidAmd: 0, remainingAmd: 0, status: "unpaid", packageName };
    }
    return { totalAmd: 0, paidAmd: 0, remainingAmd: 0, status: "paid", packageName };
  }
  const totalAmd = Math.max(0, Math.round(booking.totalPriceAmd ?? 0));
  const ps = String(booking.paymentStatus ?? "").trim().toLowerCase();
  if (totalAmd <= 0) {
    return { totalAmd: 0, paidAmd: 0, remainingAmd: 0, status: "na", packageName };
  }
  if (ps === "pending") return { totalAmd, paidAmd: 0, remainingAmd: totalAmd, status: "pending", packageName };
  if (ps === "failed") return { totalAmd, paidAmd: 0, remainingAmd: totalAmd, status: "failed", packageName };
  let paidAmd =
    booking.paidAmountAmd != null && Number.isFinite(Number(booking.paidAmountAmd))
      ? Math.round(Number(booking.paidAmountAmd))
      : 0;
  if (paidAmd <= 0 && ps === "paid") paidAmd = totalAmd;
  const remainingAmd = Math.max(0, totalAmd - paidAmd);
  let status: BookingListPaymentRow["status"] = "unpaid";
  if (ps === "paid" || remainingAmd === 0) status = "paid";
  else if (ps === "partial" || (paidAmd > 0 && paidAmd < totalAmd)) status = "partial";
  else if (paidAmd > 0) status = "partial";
  return { totalAmd, paidAmd, remainingAmd, status, packageName };
}

export function bookingListPaymentLabelKey(status: BookingListPaymentRow["status"]): TranslationKey {
  if (status === "paid") return "adminBookingPaymentStatusPaid";
  if (status === "partial") return "adminBookingPaymentStatusPartial";
  if (status === "unpaid") return "adminBookingPaymentStatusUnpaid";
  if (status === "pending") return "studentDetailsPaymentPending";
  if (status === "failed") return "studentDetailsPaymentFailed";
  return "studentDetailsPaymentNa";
}

export const BOOKING_LIST_PAYMENT_BADGE_CLASS: Record<BookingListPaymentRow["status"], string> = {
  paid: "bg-emerald-100 text-emerald-700",
  partial: "bg-sky-100 text-sky-800",
  unpaid: "bg-amber-100 text-amber-700",
  pending: "bg-amber-100 text-amber-700",
  failed: "bg-red-100 text-red-600",
  na: "bg-slate-100 text-slate-500",
};

/** True when the booking has any slot on `dateIso` (primary row date or `slotEntries`). */
export function bookingOccursOnDateIso(
  booking: { dateIso: string; slotEntries?: readonly { dateIso: string }[] },
  dateIso: string,
): boolean {
  const day = dateIso.slice(0, 10);
  if (!day) return true;
  if (String(booking.dateIso).slice(0, 10) === day) return true;
  return (booking.slotEntries ?? []).some((e) => String(e.dateIso).slice(0, 10) === day);
}

export type BookingPaymentFilter = "all" | "paid" | "partial" | "unpaid" | "outstanding";

export function bookingHasDebtPaymentStatus(
  booking: {
    paymentStatus?: string | null;
    paidAmountAmd?: number | null;
    totalPriceAmd?: number | null;
    coveredByPackage?: boolean;
  },
): boolean {
  if (booking.coveredByPackage) return false;
  const row = bookingListPaymentRow(booking);
  return row.status === "partial" || row.status === "unpaid";
}

export function bookingMatchesPaymentFilter(
  booking: {
    paymentStatus?: string | null;
    paidAmountAmd?: number | null;
    totalPriceAmd?: number | null;
    coveredByPackage?: boolean;
  },
  filter: BookingPaymentFilter,
): boolean {
  if (filter === "all") return true;
  if (booking.coveredByPackage) {
    // Package-covered lessons follow the package payment status.
    const row = bookingListPaymentRow(booking);
    if (filter === "outstanding") return row.status === "unpaid";
    if (filter === "paid") return row.status === "paid";
    if (filter === "partial") return false;
    return row.status === "unpaid";
  }
  const row = bookingListPaymentRow(booking);
  if (filter === "outstanding") return row.remainingAmd > 0 && row.totalAmd > 0;
  if (filter === "paid") return row.status === "paid";
  if (filter === "partial") return row.status === "partial";
  return row.status === "unpaid";
}

export function adminPaymentStatusLabelKey(status: AdminBookingPaymentStatus): TranslationKey {
  if (status === "paid") return "adminBookingPaymentStatusPaid";
  if (status === "partial") return "adminBookingPaymentStatusPartial";
  return "adminBookingPaymentStatusUnpaid";
}

/** Suggested paid string when admin changes payment status (paid field stays editable). */
export function paidStrForStatusChange(
  status: AdminBookingPaymentStatus,
  totalAmd: number,
  currentPaidStr: string,
): string {
  const total = Math.max(0, Math.round(totalAmd));
  if (status === "paid") return total > 0 ? String(total) : currentPaidStr;
  if (status === "unpaid") return "0";
  return currentPaidStr;
}
