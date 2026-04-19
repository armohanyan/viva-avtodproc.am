/** Query keys for `/admin/finance/income` — prefills the manual payment dialog. */
export const FINANCE_INCOME_PREFILL = {
  student: "student",
  booking: "booking",
  branch: "branch",
  amount: "amount",
  desc: "desc",
} as const;

export type FinanceIncomePrefill = {
  studentId?: string;
  bookingId?: string;
  branchId?: string;
  /** Gross amount in AMD (integer). */
  amountAmd?: number;
  /** Short line item text (stored as finance description). */
  description?: string;
};

export function adminFinanceIncomePrefillHref(p: FinanceIncomePrefill): string {
  const q = new URLSearchParams();
  if (p.studentId) q.set(FINANCE_INCOME_PREFILL.student, p.studentId);
  if (p.bookingId) q.set(FINANCE_INCOME_PREFILL.booking, p.bookingId);
  if (p.branchId) q.set(FINANCE_INCOME_PREFILL.branch, p.branchId);
  if (p.amountAmd != null && Number.isFinite(p.amountAmd) && p.amountAmd > 0) {
    q.set(FINANCE_INCOME_PREFILL.amount, String(Math.round(p.amountAmd)));
  }
  if (p.description?.trim()) q.set(FINANCE_INCOME_PREFILL.desc, p.description.trim());
  const qs = q.toString();
  return qs ? `/admin/finance/income?${qs}` : "/admin/finance/income";
}
