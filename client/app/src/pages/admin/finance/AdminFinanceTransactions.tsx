import AdminLayout from "src/components/AdminLayout";
import AdminTableScroll from "src/components/AdminTableScroll";
import { useLang } from "src/lib/i18n";
import { Card } from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import DataTableToolbar from "src/components/DataTableToolbar";
import PanelPageHeader from "src/components/PanelPageHeader";
import { ArrowDownRight, Landmark, TrendingUp, Wallet } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { branchNameById, useBranches } from "src/modules/branches";
import { useToast } from "src/lib/toast";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { useOptionalAdminBranchFilterRevision } from "src/modules/admin/AdminBranchFilterProvider";
import {
  type FinanceLedgerPeriod,
  type FinanceTx,
  channelTKey,
  formatAmd,
  financeOutcomeTotalInRange,
  grossCompletedInRange,
  ledgerPeriodRange,
  methodTKey,
  netOf,
  statusClass,
  statusTKey,
  bookingRefundExpenseCompletedInRange,
  legacyRefundedIncomeGrossInRange,
} from "./adminFinanceShared";

function localeFromLang(lang: "en" | "ru" | "am") {
  if (lang === "am") return "hy-AM";
  if (lang === "ru") return "ru-RU";
  return "en-US";
}

function txInRange(tx: FinanceTx, start: Date, end: Date): boolean {
  const d = new Date(tx.createdAt);
  return d >= start && d <= end;
}

export default function AdminFinanceTransactions() {
  const branchFilterRevision = useOptionalAdminBranchFilterRevision();
  const { t, lang } = useLang();
  const { showToast } = useToast();
  const { branches } = useBranches();
  const [rows, setRows] = useState<FinanceTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<FinanceLedgerPeriod>("month");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await vivaApiJson<FinanceTx[]>("/finance/transactions");
      const list = Array.isArray(data) ? data : [];
      setRows(
        list.map((tx) => ({
          ...tx,
          bookingId: tx.bookingId ?? null,
          entryType: tx.entryType ?? "income",
        })),
      );
    } catch (e) {
      setRows([]);
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load, branchFilterRevision]);

  const { start, end } = useMemo(() => ledgerPeriodRange(period), [period]);
  const locale = localeFromLang(lang);
  const rangeLabel = useMemo(
    () =>
      `${start.toLocaleDateString(locale, { dateStyle: "medium" })} – ${end.toLocaleDateString(locale, { dateStyle: "medium" })}`,
    [start, end, locale],
  );

  const incomeCompleted = useMemo(() => grossCompletedInRange(rows, start, end), [rows, start, end]);
  const expenseCompleted = useMemo(() => financeOutcomeTotalInRange(rows, start, end), [rows, start, end]);
  const netCompleted = incomeCompleted - expenseCompleted;
  const refundMoneyPeriod = useMemo(
    () => bookingRefundExpenseCompletedInRange(rows, start, end) + legacyRefundedIncomeGrossInRange(rows, start, end),
    [rows, start, end],
  );

  const inPeriod = useMemo(() => rows.filter((tx) => txInRange(tx, start, end)), [rows, start, end]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return inPeriod;
    return inPeriod.filter((tx) => {
      const entry = (tx.entryType ?? "income") === "income" ? "income" : "expense";
      const hay = [
        tx.id,
        entry,
        tx.customer,
        tx.email,
        tx.description,
        tx.status,
        tx.providerRef,
        tx.bookingId ?? "",
        tx.employeeName ?? "",
        tx.expenseKind ?? "",
        t("financeTxTypeRefund"),
        branchNameById(branches, tx.branchId),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [inPeriod, search, branches, t]);

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => (new Date(a.createdAt) < new Date(b.createdAt) ? 1 : -1)),
    [filtered],
  );

  const periodSelect = (
    <select
      aria-label={t("adminFinanceTxPeriodFilterAria")}
      value={period}
      onChange={(e) => setPeriod(e.target.value as FinanceLedgerPeriod)}
      className="h-10 w-full min-w-[11rem] rounded-lg border border-border bg-background px-3 text-sm text-foreground shadow-sm sm:w-auto"
    >
      <option value="day">{t("adminFinanceTxPeriodDay")}</option>
      <option value="week">{t("adminFinanceTxPeriodWeek")}</option>
      <option value="month">{t("adminFinanceTxPeriodMonth")}</option>
    </select>
  );

  return (
    <AdminLayout>
      <PanelPageHeader
        icon={Landmark}
        title={t("adminFinanceTransactionsTitle")}
        subtitle={t("adminFinanceTransactionsSubtitle")}
        actions={periodSelect}
      />

      <p className="text-sm text-muted-foreground mb-4">{rangeLabel}</p>

      <p className="text-xs text-muted-foreground mb-2">
        {t("adminFinanceRefundLedgerLabel")}: {loading ? "…" : formatAmd(refundMoneyPeriod)}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-5 border-border">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground mb-1 leading-snug">{t("adminFinanceTxKpiIncomeCompleted")}</p>
              <p className="text-lg font-bold text-foreground tabular-nums break-words">
                {loading ? "…" : formatAmd(incomeCompleted)}
              </p>
            </div>
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
          </div>
        </Card>
        <Card className="p-5 border-border">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground mb-1 leading-snug">{t("adminFinanceTxKpiExpenseCompleted")}</p>
              <p className="text-lg font-bold text-foreground tabular-nums break-words">
                {loading ? "…" : formatAmd(expenseCompleted)}
              </p>
            </div>
            <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center shrink-0">
              <ArrowDownRight className="w-5 h-5 text-amber-700 dark:text-amber-400" />
            </div>
          </div>
        </Card>
        <Card className="p-5 border-border">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground mb-1 leading-snug">{t("adminFinanceTxKpiNetCompleted")}</p>
              <p className="text-lg font-bold text-foreground tabular-nums break-words">
                {loading ? "…" : formatAmd(netCompleted)}
              </p>
            </div>
            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
            </div>
          </div>
        </Card>
      </div>

      <Card className="border-border overflow-hidden min-w-0">
        <div className="p-5 border-b border-border">
          <h3 className="font-semibold text-foreground">{t("adminFinanceTxLedgerHeading")}</h3>
        </div>
        <DataTableToolbar value={search} onChange={setSearch} placeholder={`${t("search")}…`} />
        <AdminTableScroll>
          <table className="min-w-[72rem] w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wide">
              <tr className="text-left border-b border-border">
                <th className="px-4 py-3 font-medium whitespace-nowrap">{t("adminFinanceTxColEntryType")}</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">ID</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">{t("financeColSource")}</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">{t("financeColDateTime")}</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">{t("financeColCustomer")}</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">{t("financeColProduct")}</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">{t("financeColBooking")}</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">{t("adminColBranch")}</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">{t("financeColChannel")}</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">{t("financeColMethod")}</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">{t("financeColGross")}</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">{t("financeColFee")}</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">{t("financeColNet")}</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">{t("status")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={14} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    …
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    {t("adminFinanceTxEmptyPeriod")}
                  </td>
                </tr>
              ) : (
                sorted.map((tx) => {
                  const entry = (tx.entryType ?? "income") === "income" ? "income" : "expense";
                  const isBookingRefund = entry === "expense" && tx.expenseKind === "booking_refund";
                  return (
                    <tr key={tx.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {isBookingRefund ? (
                          <Badge
                            variant="secondary"
                            className="text-xs bg-rose-100 text-rose-900 dark:bg-rose-950/50 dark:text-rose-200"
                          >
                            {t("financeTxTypeRefund")}
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className={
                              entry === "income"
                                ? "text-xs bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200"
                                : "text-xs bg-sky-100 text-sky-900 dark:bg-sky-950/50 dark:text-sky-200"
                            }
                          >
                            {entry === "income" ? t("adminFinanceTxEntryIncome") : t("adminFinanceTxEntryExpense")}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground text-xs font-mono whitespace-nowrap">{tx.id}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <Badge
                          variant="secondary"
                          className={
                            tx.source === "manual"
                              ? "text-xs bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200"
                              : "text-xs"
                          }
                        >
                          {tx.source === "manual" ? t("financeOriginManual") : t("financeOriginSystem")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">
                        {new Date(tx.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-foreground whitespace-nowrap max-w-[10rem] truncate" title={tx.customer}>
                        {tx.customer}
                      </td>
                      <td className="px-4 py-3.5 text-foreground max-w-[14rem]">{tx.description}</td>
                      <td className="px-4 py-3.5 text-muted-foreground text-xs font-mono whitespace-nowrap">{tx.bookingId ?? "—"}</td>
                      <td
                        className="px-4 py-3.5 text-muted-foreground whitespace-nowrap max-w-[10rem] truncate"
                        title={branchNameById(branches, tx.branchId)}
                      >
                        {branchNameById(branches, tx.branchId)}
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">{t(channelTKey(tx.channel))}</td>
                      <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">{t(methodTKey(tx.method))}</td>
                      <td className="px-4 py-3.5 tabular-nums whitespace-nowrap">
                        {isBookingRefund ? (
                          <span className="font-medium text-rose-600 dark:text-rose-400">−{formatAmd(tx.grossAmd)}</span>
                        ) : (
                          <span className="text-foreground">{formatAmd(tx.grossAmd)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground tabular-nums whitespace-nowrap">{formatAmd(tx.feeAmd)}</td>
                      <td className="px-4 py-3.5 font-medium text-foreground tabular-nums whitespace-nowrap">{formatAmd(netOf(tx))}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <Badge className={`text-xs ${statusClass[tx.status]}`}>{t(statusTKey(tx.status))}</Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </AdminTableScroll>
        <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
          {t("panelShowingLabel")} {sorted.length} / {inPeriod.length}
        </div>
      </Card>
    </AdminLayout>
  );
}
