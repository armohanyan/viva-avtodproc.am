import AdminLayout from "src/components/AdminLayout";
import AdminTableScroll from "src/components/AdminTableScroll";
import AdminTableRowActions, { AdminTableRowContextMenu } from "src/components/AdminTableRowActions";
import ConfirmDialog from "src/components/ConfirmDialog";
import DataTableToolbar from "src/components/DataTableToolbar";
import PanelPageHeader from "src/components/PanelPageHeader";
import TableSkeletonRows from "src/components/TableSkeletonRows";
import { AppModal } from "src/components/AppModal";
import { TableColumnHeaderWithFilter } from "src/components/TableColumnFilter";
import { Button } from "src/components/ui/button";
import { Card } from "src/components/ui/card";
import { Input } from "src/components/ui/input";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { formatAmd, parseAmdInput } from "src/utils/currency.utils";
import { Banknote, CheckCircle2, Plus, Trash2, Wallet } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import type { TranslationKey } from "src/lib/i18n";

type SalaryEmployeeKind = "instructor" | "theory_teacher";
type SalaryPaymentKind = SalaryEmployeeKind | "other";

type SalaryReportRow = {
  kind: SalaryEmployeeKind;
  employeeUserId: number;
  employeeName: string;
  lessonsCount: number;
  ratePerLessonAmd: number;
  totalAmd: number;
  paid: {
    paymentId: number;
    title: string;
    periodStartIso: string;
    periodEndIso: string;
    lessonsCount: number | null;
    totalAmd: number;
    paidAtIso: string;
  } | null;
};

type SalaryReport = {
  startDate: string;
  endDate: string;
  instructorRateAmd: number;
  theoryTeacherRateAmd: number;
  rows: SalaryReportRow[];
};

type SalaryPayment = {
  id: number;
  title: string;
  kind: SalaryPaymentKind;
  employeeUserId: number | null;
  employeeName: string;
  periodStartIso: string;
  periodEndIso: string;
  lessonsCount: number | null;
  ratePerLessonAmd: number | null;
  totalAmd: number;
  notes: string | null;
  createdAtIso: string;
  createdByName: string | null;
};

function isoDate(year: number, monthIndex: number, day: number): string {
  const m = String(monthIndex + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

/** Half-month pay period (1–15 or 16–end) containing the given date. */
function halfMonthPeriod(date: Date): { start: string; end: string } {
  const y = date.getFullYear();
  const m = date.getMonth();
  if (date.getDate() <= 15) {
    return { start: isoDate(y, m, 1), end: isoDate(y, m, 15) };
  }
  return { start: isoDate(y, m, 16), end: isoDate(y, m, new Date(y, m + 1, 0).getDate()) };
}

/** Half-month period immediately before the one containing the given date. */
function previousHalfMonthPeriod(date: Date): { start: string; end: string } {
  if (date.getDate() <= 15) {
    const prevMonthMid = new Date(date.getFullYear(), date.getMonth(), 0);
    return halfMonthPeriod(prevMonthMid);
  }
  return halfMonthPeriod(new Date(date.getFullYear(), date.getMonth(), 1));
}

const kindLabelKey: Record<SalaryPaymentKind, TranslationKey> = {
  instructor: "adminSalaryKindInstructor",
  theory_teacher: "adminSalaryKindTheoryTeacher",
  other: "adminSalaryKindOther",
};

type OtherFormState = {
  title: string;
  employeeName: string;
  amount: string;
  periodStart: string;
  periodEnd: string;
  notes: string;
};

export default function AdminSalary() {
  const { t } = useLang();
  const { showToast } = useToast();
  const otherFormId = useId();
  const payFormId = useId();

  const [period, setPeriod] = useState(() => previousHalfMonthPeriod(new Date()));
  const [report, setReport] = useState<SalaryReport | null>(null);
  const [reportLoading, setReportLoading] = useState(true);

  const [payments, setPayments] = useState<SalaryPayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [historySearch, setHistorySearch] = useState("");

  const [payRow, setPayRow] = useState<SalaryReportRow | null>(null);
  const [payTitle, setPayTitle] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [paySubmitting, setPaySubmitting] = useState(false);

  const [otherOpen, setOtherOpen] = useState(false);
  const [otherForm, setOtherForm] = useState<OtherFormState | null>(null);

  const [deleteRow, setDeleteRow] = useState<SalaryPayment | null>(null);

  const loadReport = useCallback(async () => {
    setReportLoading(true);
    try {
      const params = new URLSearchParams({ startDate: period.start, endDate: period.end });
      const data = await vivaApiJson<SalaryReport>(`/admin/salary/report?${params.toString()}`);
      setReport(data);
    } catch (e) {
      setReport(null);
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setReportLoading(false);
    }
  }, [period.start, period.end, showToast]);

  const loadPayments = useCallback(async () => {
    setPaymentsLoading(true);
    try {
      const data = await vivaApiJson<{ items: SalaryPayment[] }>("/admin/salary/payments");
      setPayments(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      setPayments([]);
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setPaymentsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  useEffect(() => {
    void loadPayments();
  }, [loadPayments]);

  const rows = report?.rows ?? [];
  const unpaidTotal = useMemo(
    () => rows.filter((r) => !r.paid).reduce((s, r) => s + r.totalAmd, 0),
    [rows],
  );
  const paidTotal = useMemo(
    () => rows.filter((r) => r.paid).reduce((s, r) => s + (r.paid?.totalAmd ?? 0), 0),
    [rows],
  );

  const filteredHistory = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    if (!q) return payments;
    return payments.filter((row) =>
      [row.title, row.employeeName, t(kindLabelKey[row.kind]), row.periodStartIso, row.periodEndIso, String(row.totalAmd), row.createdByName ?? "", row.notes ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [payments, historySearch, t]);

  const openPayModal = (row: SalaryReportRow) => {
    setPayRow(row);
    setPayTitle(`${t(kindLabelKey[row.kind])} — ${row.employeeName} (${period.start} — ${period.end})`);
    setPayNotes("");
  };

  const submitPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payRow || paySubmitting) return;
    const title = payTitle.trim();
    if (!title) {
      showToast(t("fillRequired"), "error");
      return;
    }
    setPaySubmitting(true);
    try {
      await vivaApiJson("/admin/salary/payments", {
        method: "POST",
        body: {
          kind: payRow.kind,
          employeeUserId: payRow.employeeUserId,
          title,
          periodStart: period.start,
          periodEnd: period.end,
          notes: payNotes.trim() || null,
        },
      });
      setPayRow(null);
      showToast(t("adminSalaryPaidToast"), "success");
      await Promise.all([loadReport(), loadPayments()]);
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    } finally {
      setPaySubmitting(false);
    }
  };

  const openOtherModal = () => {
    setOtherForm({
      title: "",
      employeeName: "",
      amount: "",
      periodStart: period.start,
      periodEnd: period.end,
      notes: "",
    });
    setOtherOpen(true);
  };

  const submitOther = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otherForm) return;
    const amount = parseAmdInput(otherForm.amount);
    if (!otherForm.title.trim() || !Number.isFinite(amount) || amount <= 0 || !otherForm.periodStart || !otherForm.periodEnd) {
      showToast(t("fillRequired"), "error");
      return;
    }
    try {
      await vivaApiJson("/admin/salary/payments", {
        method: "POST",
        body: {
          kind: "other",
          title: otherForm.title.trim(),
          employeeName: otherForm.employeeName.trim() || null,
          amountAmd: amount,
          periodStart: otherForm.periodStart,
          periodEnd: otherForm.periodEnd,
          notes: otherForm.notes.trim() || null,
        },
      });
      setOtherOpen(false);
      showToast(t("adminSalaryPaidToast"), "success");
      await loadPayments();
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    }
  };

  const handleDelete = async () => {
    if (!deleteRow) return;
    try {
      await vivaApiJson(`/admin/salary/payments/${encodeURIComponent(deleteRow.id)}`, { method: "DELETE" });
      showToast(t("adminSalaryDeletedToast"), "success");
      await Promise.all([loadReport(), loadPayments()]);
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    }
  };

  const periodChips: Array<{ id: string; label: string; range: { start: string; end: string } }> = [
    { id: "previous", label: t("adminSalaryPreviousPeriod"), range: previousHalfMonthPeriod(new Date()) },
    { id: "current", label: t("adminSalaryCurrentPeriod"), range: halfMonthPeriod(new Date()) },
  ];

  return (
    <AdminLayout>
      <PanelPageHeader
        icon={Wallet}
        title={t("adminSalaryTitle")}
        subtitle={t("adminSalarySubtitle")}
        actions={
          <Button onClick={openOtherModal} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
            <Plus className="w-4 h-4" />
            {t("adminSalaryAddOtherButton")}
          </Button>
        }
      />

      <Card className="p-5 border-border mb-6">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">{t("adminSalaryPeriodLabel")}</label>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={period.start}
                onChange={(e) => setPeriod((p) => ({ ...p, start: e.target.value }))}
                className="h-10 w-40"
              />
              <span className="text-muted-foreground">—</span>
              <Input
                type="date"
                value={period.end}
                onChange={(e) => setPeriod((p) => ({ ...p, end: e.target.value }))}
                className="h-10 w-40"
              />
            </div>
          </div>
          <div className="flex gap-2">
            {periodChips.map((chip) => {
              const active = chip.range.start === period.start && chip.range.end === period.end;
              return (
                <Button
                  key={chip.id}
                  type="button"
                  variant={active ? "default" : "outline"}
                  className="h-10"
                  onClick={() => setPeriod(chip.range)}
                >
                  {chip.label}
                </Button>
              );
            })}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          {t("adminSalaryKindInstructor")} — {formatAmd(report?.instructorRateAmd ?? 1500)} · {t("adminSalaryKindTheoryTeacher")} — {formatAmd(report?.theoryTeacherRateAmd ?? 3000)}
        </p>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Card className="p-5 border-border">
          <p className="text-xs text-muted-foreground mb-1">{t("adminSalaryTotalDueLabel")}</p>
          <p className="text-lg font-bold tabular-nums">{formatAmd(unpaidTotal)}</p>
        </Card>
        <Card className="p-5 border-border">
          <p className="text-xs text-muted-foreground mb-1">{t("adminSalaryTotalPaidLabel")}</p>
          <p className="text-lg font-bold tabular-nums">{formatAmd(paidTotal)}</p>
        </Card>
      </div>

      <Card className="border-border overflow-hidden min-w-0 mb-8">
        <div className="p-5 border-b border-border">
          <h3 className="font-semibold text-foreground">{t("adminSalaryReportTitle")}</h3>
        </div>
        <AdminTableScroll>
          <table className="w-full text-sm min-w-[48rem]">
            <thead className="bg-muted/40">
              <tr>
                <TableColumnHeaderWithFilter title={t("adminSalaryColEmployee")} />
                <TableColumnHeaderWithFilter title={t("adminSalaryColKind")} />
                <TableColumnHeaderWithFilter title={t("adminSalaryColLessons")} />
                <TableColumnHeaderWithFilter title={t("adminSalaryColRate")} />
                <TableColumnHeaderWithFilter title={t("adminSalaryColTotal")} />
                <TableColumnHeaderWithFilter title={t("adminSalaryColStatus")} />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {reportLoading ? (
                <TableSkeletonRows cols={6} />
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    {t("adminSalaryNoRows")}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={`${row.kind}:${row.employeeUserId}`} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{row.employeeName}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{t(kindLabelKey[row.kind])}</td>
                    <td className="px-4 py-3 tabular-nums">{row.lessonsCount}</td>
                    <td className="px-4 py-3 tabular-nums whitespace-nowrap">{formatAmd(row.ratePerLessonAmd)}</td>
                    <td className="px-4 py-3 font-medium tabular-nums whitespace-nowrap">{formatAmd(row.totalAmd)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {row.paid ? (
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-1 text-xs font-medium"
                          title={`${row.paid.title} · ${formatAmd(row.paid.totalAmd)} · ${row.paid.paidAtIso.slice(0, 10)}`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {t("adminSalaryPaidBadge")}
                        </span>
                      ) : (
                        <Button size="sm" className="gap-1.5" onClick={() => openPayModal(row)}>
                          <Banknote className="w-4 h-4" />
                          {t("adminSalaryPayButton")}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </AdminTableScroll>
      </Card>

      <Card className="border-border overflow-hidden min-w-0">
        <div className="p-5 border-b border-border">
          <h3 className="font-semibold text-foreground">{t("adminSalaryHistoryTitle")}</h3>
        </div>
        <DataTableToolbar value={historySearch} onChange={setHistorySearch} placeholder={`${t("search")}…`} />
        <AdminTableScroll>
          <table className="w-full text-sm min-w-[64rem]">
            <thead className="bg-muted/40">
              <tr>
                <TableColumnHeaderWithFilter title={t("adminSalaryTitleFieldLabel")} />
                <TableColumnHeaderWithFilter title={t("adminSalaryColEmployee")} />
                <TableColumnHeaderWithFilter title={t("adminSalaryColKind")} />
                <TableColumnHeaderWithFilter title={t("adminSalaryColPeriod")} />
                <TableColumnHeaderWithFilter title={t("adminSalaryColLessons")} />
                <TableColumnHeaderWithFilter title={t("adminSalaryColTotal")} />
                <TableColumnHeaderWithFilter title={t("adminSalaryColCreatedBy")} />
                <TableColumnHeaderWithFilter title={t("adminSalaryColCreatedAt")} />
                <TableColumnHeaderWithFilter title={t("actions")} />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paymentsLoading ? (
                <TableSkeletonRows cols={9} />
              ) : filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    {t("tableNoMatches")}
                  </td>
                </tr>
              ) : (
                filteredHistory.map((row) => {
                  const actions = [
                    {
                      kind: "item" as const,
                      id: "delete",
                      label: t("delete"),
                      icon: Trash2,
                      destructive: true,
                      onClick: () => setDeleteRow(row),
                    },
                  ];
                  return (
                    <AdminTableRowContextMenu key={row.id} actions={actions}>
                      <tr className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium max-w-[16rem]">{row.title}</td>
                        <td className="px-4 py-3">{row.employeeName}</td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{t(kindLabelKey[row.kind])}</td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {row.periodStartIso} — {row.periodEndIso}
                        </td>
                        <td className="px-4 py-3 tabular-nums">{row.lessonsCount ?? "—"}</td>
                        <td className="px-4 py-3 font-medium tabular-nums whitespace-nowrap">{formatAmd(row.totalAmd)}</td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{row.createdByName ?? "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{row.createdAtIso.slice(0, 10)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <AdminTableRowActions toolbarOnly actions={actions} />
                        </td>
                      </tr>
                    </AdminTableRowContextMenu>
                  );
                })
              )}
            </tbody>
          </table>
        </AdminTableScroll>
        <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
          {t("panelShowingLabel")} {filteredHistory.length} / {payments.length}
        </div>
      </Card>

      <AppModal
        open={!!payRow}
        onOpenChange={(o) => !o && !paySubmitting && setPayRow(null)}
        title={t("adminSalaryPayModalTitle")}
        contentClassName="max-w-lg"
        footer={
          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" disabled={paySubmitting} onClick={() => setPayRow(null)}>
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              form={payFormId}
              disabled={paySubmitting}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {t("adminSalaryPayButton")}
            </Button>
          </div>
        }
      >
        {payRow ? (
          <form id={payFormId} onSubmit={submitPay} className="space-y-3">
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-1.5 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">{t("adminSalaryColEmployee")}</span>
                <span className="font-medium">{payRow.employeeName}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">{t("adminSalaryColKind")}</span>
                <span>{t(kindLabelKey[payRow.kind])}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">{t("adminSalaryColPeriod")}</span>
                <span className="tabular-nums">
                  {period.start} — {period.end}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">{t("adminSalaryColLessons")}</span>
                <span className="tabular-nums">{payRow.lessonsCount}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">{t("adminSalaryColRate")}</span>
                <span className="tabular-nums">{formatAmd(payRow.ratePerLessonAmd)}</span>
              </div>
              <div className="flex justify-between gap-3 border-t border-border pt-1.5">
                <span className="text-muted-foreground">{t("adminSalaryColTotal")}</span>
                <span className="font-bold tabular-nums">{formatAmd(payRow.totalAmd)}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{`${t("adminSalaryTitleFieldLabel")} *`}</label>
              <Input value={payTitle} onChange={(e) => setPayTitle(e.target.value)} className="h-10" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("adminSalaryNotesFieldLabel")}</label>
              <textarea
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[4.5rem]"
              />
            </div>
          </form>
        ) : null}
      </AppModal>

      <AppModal
        open={otherOpen}
        onOpenChange={(o) => !o && setOtherOpen(false)}
        title={t("adminSalaryOtherModalTitle")}
        contentClassName="max-w-lg"
        footer={
          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOtherOpen(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" form={otherFormId} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">
              {t("save")}
            </Button>
          </div>
        }
      >
        {otherForm ? (
          <form id={otherFormId} onSubmit={submitOther} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{`${t("adminSalaryTitleFieldLabel")} *`}</label>
              <Input
                value={otherForm.title}
                onChange={(e) => setOtherForm((f) => (f ? { ...f, title: e.target.value } : f))}
                className="h-10"
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("adminSalaryEmployeeNameLabel")}</label>
                <Input
                  value={otherForm.employeeName}
                  onChange={(e) => setOtherForm((f) => (f ? { ...f, employeeName: e.target.value } : f))}
                  className="h-10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{`${t("adminSalaryAmountLabel")} *`}</label>
                <Input
                  inputMode="decimal"
                  value={otherForm.amount}
                  onChange={(e) => setOtherForm((f) => (f ? { ...f, amount: e.target.value } : f))}
                  className="h-10"
                  placeholder="0"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{`${t("adminSalaryColPeriod")} *`}</label>
                <Input
                  type="date"
                  value={otherForm.periodStart}
                  onChange={(e) => setOtherForm((f) => (f ? { ...f, periodStart: e.target.value } : f))}
                  className="h-10"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">&nbsp;</label>
                <Input
                  type="date"
                  value={otherForm.periodEnd}
                  onChange={(e) => setOtherForm((f) => (f ? { ...f, periodEnd: e.target.value } : f))}
                  className="h-10"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("adminSalaryNotesFieldLabel")}</label>
              <textarea
                value={otherForm.notes}
                onChange={(e) => setOtherForm((f) => (f ? { ...f, notes: e.target.value } : f))}
                rows={3}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[4.5rem]"
              />
            </div>
          </form>
        ) : null}
      </AppModal>

      <ConfirmDialog
        open={!!deleteRow}
        onClose={() => setDeleteRow(null)}
        onConfirm={handleDelete}
        title={t("adminSalaryDeleteConfirmTitle")}
        description={t("adminSalaryDeleteConfirmDescription")}
        confirmLabel={t("delete")}
        danger
      />
    </AdminLayout>
  );
}
