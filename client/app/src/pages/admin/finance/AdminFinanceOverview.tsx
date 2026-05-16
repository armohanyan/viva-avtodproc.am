import AdminLayout from "src/components/AdminLayout";
import { useLang, type TranslationKey } from "src/lib/i18n";
import { Card } from "src/components/ui/card";
import AdminTableScroll from "src/components/AdminTableScroll";
import PanelPageHeader from "src/components/PanelPageHeader";
import { Landmark, TrendingUp, ArrowDownRight, Undo2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { useOptionalAdminBranchFilterRevision } from "src/modules/admin/AdminBranchFilterProvider";
import { useToast } from "src/lib/toast";
import type { AdminFinanceExpense } from "src/types/admin-finance-expense.types";
import {
  type FinanceTx,
  type FinanceOverviewPeriod,
  formatAmd,
  financePeriodMonthCount,
  rollingCalendarMonthsRange,
  monthStartsInRange,
  monthRange,
  grossCompletedInRange,
  expensesTotalInRange,
  totalRefundMoneyInRange,
} from "./adminFinanceShared";
import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend, Filler);

const CHART_AXIS = "#94a3b8";
const CHART_GRID = "rgba(148, 163, 184, 0.12)";
const INCOME_ORANGE = "#FF8A00";
const EXPENSE_SKY = "rgb(56, 189, 248)";

function localeFromLang(lang: "en" | "ru" | "am") {
  if (lang === "am") return "hy-AM";
  if (lang === "ru") return "ru-RU";
  return "en-US";
}

function monthChartLabel(d: Date, locale: string) {
  return d.toLocaleDateString(locale, { month: "short", year: "numeric" });
}

type AdminBookingRow = {
  id: number;
  dateIso: string;
  status: string;
  type: string;
  totalPriceAmd: number | null;
};

function lessonTypeTKey(type: string): TranslationKey {
  if (type === "theory") return "lessonTypeTheory";
  if (type === "theory_personal") return "lessonTypeTheoryPersonal";
  return "lessonTypePractical";
}

function bookingDateInRange(dateIso: string, rangeStart: Date, rangeEnd: Date): boolean {
  const d = new Date(`${String(dateIso).slice(0, 10)}T12:00:00`);
  return d >= rangeStart && d <= rangeEnd;
}

export default function AdminFinanceOverview() {
  const branchFilterRevision = useOptionalAdminBranchFilterRevision();
  const { t, lang } = useLang();
  const { showToast } = useToast();
  const [transactions, setTransactions] = useState<FinanceTx[]>([]);
  const [expenses, setExpenses] = useState<AdminFinanceExpense[]>([]);
  const [bookings, setBookings] = useState<AdminBookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<FinanceOverviewPeriod>("1m");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [txs, ex, bks] = await Promise.all([
        vivaApiJson<FinanceTx[]>("/finance/transactions"),
        vivaApiJson<AdminFinanceExpense[]>("/admin/finance/expenses"),
        vivaApiJson<AdminBookingRow[]>("/bookings"),
      ]);
      setTransactions(
        (Array.isArray(txs) ? txs : []).map((tx) => ({
          ...tx,
          entryType: tx.entryType ?? "income",
          expenseKind: tx.expenseKind ?? null,
        })),
      );
      setExpenses(Array.isArray(ex) ? ex : []);
      setBookings(Array.isArray(bks) ? bks : []);
    } catch (e) {
      setTransactions([]);
      setExpenses([]);
      setBookings([]);
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load, branchFilterRevision]);

  const locale = localeFromLang(lang);

  const { grossTotal, expenseTotal, refundMoneyTotal, monthLabels, incomeByMonth, expensesByMonth } =
    useMemo(() => {
    const n = financePeriodMonthCount(period);
    const { start: rangeStartInner, end: rangeEndInner } = rollingCalendarMonthsRange(n);
    const gross = grossCompletedInRange(transactions, rangeStartInner, rangeEndInner);
    const exp = expensesTotalInRange(expenses, rangeStartInner, rangeEndInner);
    const refundMoney = totalRefundMoneyInRange(transactions, rangeStartInner, rangeEndInner);
    const months = monthStartsInRange(rangeStartInner, rangeEndInner);
    const income: number[] = [];
    const expM: number[] = [];
    const labels: string[] = [];
    for (const ms of months) {
      const { start, end } = monthRange(ms);
      labels.push(monthChartLabel(ms, locale));
      income.push(grossCompletedInRange(transactions, start, end));
      expM.push(expensesTotalInRange(expenses, start, end));
    }
    return {
      grossTotal: gross,
      expenseTotal: exp,
      refundMoneyTotal: refundMoney,
      monthLabels: labels,
      incomeByMonth: income,
      expensesByMonth: expM,
    };
  }, [transactions, expenses, period, locale]);

  const refundedBookingStats = useMemo(() => {
    const n = financePeriodMonthCount(period);
    const { start: rangeStartInner, end: rangeEndInner } = rollingCalendarMonthsRange(n);
    const refunded = bookings.filter(
      (b) => String(b.status) === "refunded" && bookingDateInRange(String(b.dateIso), rangeStartInner, rangeEndInner),
    );
    const count = refunded.length;
    const money = refunded.reduce((s, b) => s + (typeof b.totalPriceAmd === "number" && Number.isFinite(b.totalPriceAmd) ? b.totalPriceAmd : 0), 0);
    const byType = new Map<string, { count: number; money: number }>();
    for (const b of refunded) {
      const k = String(b.type || "practical");
      const prev = byType.get(k) ?? { count: 0, money: 0 };
      prev.count += 1;
      prev.money += typeof b.totalPriceAmd === "number" && Number.isFinite(b.totalPriceAmd) ? b.totalPriceAmd : 0;
      byType.set(k, prev);
    }
    const byMonth = new Map<string, { count: number; money: number }>();
    for (const b of refunded) {
      const ym = String(b.dateIso).slice(0, 7);
      const prev = byMonth.get(ym) ?? { count: 0, money: 0 };
      prev.count += 1;
      prev.money += typeof b.totalPriceAmd === "number" && Number.isFinite(b.totalPriceAmd) ? b.totalPriceAmd : 0;
      byMonth.set(ym, prev);
    }
    const byTypeRows = [...byType.entries()].sort((a, b) => b[1].money - a[1].money);
    const byMonthRows = [...byMonth.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    return { refunded, count, money, byTypeRows, byMonthRows };
  }, [bookings, period]);

  const chartMax = useMemo(() => {
    const peak = Math.max(1, ...incomeByMonth, ...expensesByMonth);
    return Math.ceil(peak * 1.08);
  }, [incomeByMonth, expensesByMonth]);

  const chartsEmpty =
    !loading && incomeByMonth.every((v) => v === 0) && expensesByMonth.every((v) => v === 0);

  const barData = useMemo(
    () => ({
      labels: monthLabels,
      datasets: [
        {
          label: t("adminFinanceIncomeNav"),
          data: incomeByMonth,
          backgroundColor: "rgba(255, 138, 0, 0.55)",
          borderColor: INCOME_ORANGE,
          borderWidth: 1,
          borderRadius: 6,
        },
        {
          label: t("adminFinanceOutcomesNav"),
          data: expensesByMonth,
          backgroundColor: "rgba(56, 189, 248, 0.35)",
          borderColor: EXPENSE_SKY,
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    }),
    [monthLabels, incomeByMonth, expensesByMonth, t],
  );

  const lineData = useMemo(
    () => ({
      labels: monthLabels,
      datasets: [
        {
          label: t("adminFinanceIncomeNav"),
          data: incomeByMonth,
          borderColor: INCOME_ORANGE,
          backgroundColor: "rgba(255, 138, 0, 0.12)",
          fill: true,
          tension: 0.25,
          pointRadius: 4,
          pointBackgroundColor: INCOME_ORANGE,
        },
        {
          label: t("adminFinanceOutcomesNav"),
          data: expensesByMonth,
          borderColor: EXPENSE_SKY,
          backgroundColor: "rgba(56, 189, 248, 0.08)",
          fill: true,
          tension: 0.25,
          pointRadius: 4,
          pointBackgroundColor: EXPENSE_SKY,
        },
      ],
    }),
    [monthLabels, incomeByMonth, expensesByMonth, t],
  );

  const barOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false as const,
      plugins: {
        legend: {
          position: "top" as const,
          labels: { color: "#cbd5e1" },
        },
        tooltip: {
          callbacks: {
            label: (ctx: { dataset?: { label?: string }; parsed?: { y?: number } }) => {
              const v = ctx.parsed?.y ?? 0;
              return `${ctx.dataset?.label ?? ""}: ${formatAmd(v)}`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: { color: CHART_AXIS },
          grid: { color: CHART_GRID },
        },
        y: {
          beginAtZero: true,
          suggestedMax: chartMax,
          ticks: {
            color: CHART_AXIS,
            callback: (v: string | number) => (typeof v === "number" ? `${v.toLocaleString(locale)} ֏` : v),
          },
          grid: { color: CHART_GRID },
        },
      },
    }),
    [chartMax, locale],
  );

  const lineOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false as const,
      plugins: {
        legend: {
          position: "top" as const,
          labels: { color: "#cbd5e1" },
        },
        tooltip: {
          callbacks: {
            label: (ctx: { dataset?: { label?: string }; parsed?: { y?: number } }) => {
              const v = ctx.parsed?.y ?? 0;
              return `${ctx.dataset?.label ?? ""}: ${formatAmd(v)}`;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: { color: CHART_AXIS },
          grid: { color: CHART_GRID },
        },
        y: {
          beginAtZero: true,
          suggestedMax: chartMax,
          ticks: {
            color: CHART_AXIS,
            callback: (v: string | number) => (typeof v === "number" ? `${v.toLocaleString(locale)} ֏` : v),
          },
          grid: { color: CHART_GRID },
        },
      },
    }),
    [chartMax, locale],
  );

  const periodSelect = (
    <select
      aria-label={t("adminFinancePeriodFilterAria")}
      value={period}
      onChange={(e) => setPeriod(e.target.value as FinanceOverviewPeriod)}
      className="h-10 w-full min-w-[11rem] rounded-lg border border-border bg-background px-3 text-sm text-foreground shadow-sm sm:w-auto"
    >
      <option value="1m">{t("adminFinancePeriod1m")}</option>
      <option value="3m">{t("adminFinancePeriod3m")}</option>
      <option value="6m">{t("adminFinancePeriod6m")}</option>
      <option value="12m">{t("adminFinancePeriod12m")}</option>
    </select>
  );

  return (
    <AdminLayout>
      <PanelPageHeader
        icon={Landmark}
        title={t("adminFinanceOverviewTitle")}
        subtitle={t("adminFinanceOverviewSubtitle")}
        actions={periodSelect}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
        <Card className="p-5 border-border">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground mb-1 leading-snug">{t("adminFinanceKpiTotalIncome")}</p>
              <p className="text-lg font-bold text-foreground tabular-nums break-words">
                {loading ? "…" : formatAmd(grossTotal)}
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
              <p className="text-xs text-muted-foreground mb-1 leading-snug">{t("adminKpiRefundMoney")}</p>
              <p className="text-lg font-bold text-rose-600 dark:text-rose-400 tabular-nums break-words">
                {loading ? "…" : formatAmd(refundMoneyTotal)}
              </p>
            </div>
            <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center shrink-0">
              <Undo2 className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            </div>
          </div>
        </Card>
        <Card className="p-5 border-border">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground mb-1 leading-snug">{t("adminFinanceKpiOperatingExpenses")}</p>
              <p className="text-lg font-bold text-foreground tabular-nums break-words">
                {loading ? "…" : formatAmd(expenseTotal)}
              </p>
            </div>
            <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center shrink-0">
              <ArrowDownRight className="w-5 h-5 text-amber-700 dark:text-amber-400" />
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-5 border-border mb-8">
        <h3 className="text-sm font-semibold text-foreground mb-1">{t("adminFinanceRefundStatsTitle")}</h3>
        <p className="text-xs text-muted-foreground mb-4">{t("adminFinanceRefundStatsSubtitle")}</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-xs text-muted-foreground">{t("adminFinanceRefundCountLabel")}</p>
            <p className="text-lg font-semibold tabular-nums">{loading ? "…" : refundedBookingStats.count}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("adminFinanceRefundTableAmount")} (bookings)</p>
            <p className="text-lg font-semibold tabular-nums">{loading ? "…" : formatAmd(refundedBookingStats.money)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("adminFinanceRefundLedgerLabel")}</p>
            <p className="text-lg font-semibold tabular-nums text-rose-600 dark:text-rose-400">
              {loading ? "…" : formatAmd(refundMoneyTotal)}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              {t("adminFinanceRefundByTypeTitle")}
            </p>
            {refundedBookingStats.byTypeRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("adminFinanceRefundEmpty")}</p>
            ) : (
              <ul className="text-sm space-y-1.5">
                {refundedBookingStats.byTypeRows.map(([type, v]) => (
                  <li key={type} className="flex justify-between gap-3">
                    <span className="text-foreground">{t(lessonTypeTKey(type))}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {v.count} · {formatAmd(v.money)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              {t("adminFinanceRefundByMonthTitle")}
            </p>
            {refundedBookingStats.byMonthRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("adminFinanceRefundEmpty")}</p>
            ) : (
              <ul className="text-sm space-y-1.5">
                {refundedBookingStats.byMonthRows.map(([ym, v]) => (
                  <li key={ym} className="flex justify-between gap-3">
                    <span className="text-foreground font-mono">{ym}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {v.count} · {formatAmd(v.money)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        {!loading && refundedBookingStats.refunded.length > 0 ? (
          <div className="mt-6 border-t border-border pt-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              {t("adminFinanceRefundTableBooking")}
            </p>
            <AdminTableScroll>
              <table className="min-w-[36rem] w-full text-sm">
                <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wide">
                  <tr className="text-left border-b border-border">
                    <th className="px-3 py-2 font-medium">ID</th>
                    <th className="px-3 py-2 font-medium">{t("adminFinanceRefundTableLessonDate")}</th>
                    <th className="px-3 py-2 font-medium">{t("adminFinanceRefundTableLessonType")}</th>
                    <th className="px-3 py-2 font-medium">{t("adminFinanceRefundTableAmount")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {refundedBookingStats.refunded.slice(0, 50).map((b) => (
                    <tr key={b.id} className="hover:bg-muted/30">
                      <td className="px-3 py-2 font-mono text-muted-foreground">{b.id}</td>
                      <td className="px-3 py-2">{String(b.dateIso).slice(0, 10)}</td>
                      <td className="px-3 py-2">{t(lessonTypeTKey(String(b.type)))}</td>
                      <td className="px-3 py-2 tabular-nums">
                        {typeof b.totalPriceAmd === "number" && Number.isFinite(b.totalPriceAmd)
                          ? formatAmd(b.totalPriceAmd)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </AdminTableScroll>
            {refundedBookingStats.refunded.length > 50 ? (
              <p className="text-xs text-muted-foreground mt-2">{refundedBookingStats.refunded.length} total — showing 50.</p>
            ) : null}
          </div>
        ) : null}
      </Card>

      {loading ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card className="p-4 sm:p-5 border-border">
            <p className="text-sm text-muted-foreground">…</p>
          </Card>
          <Card className="p-4 sm:p-5 border-border">
            <p className="text-sm text-muted-foreground">…</p>
          </Card>
        </div>
      ) : chartsEmpty ? (
        <p className="text-sm text-muted-foreground">{t("adminFinanceChartEmpty")}</p>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Card className="p-4 sm:p-5 border-border overflow-hidden">
            <h3 className="text-sm font-semibold text-foreground mb-3">{t("adminFinanceChartByMonthTitle")}</h3>
            <div className="h-[min(22rem,50vh)] min-h-[200px]">
              <Bar data={barData} options={barOptions} />
            </div>
          </Card>
          <Card className="p-4 sm:p-5 border-border overflow-hidden">
            <h3 className="text-sm font-semibold text-foreground mb-3">{t("adminFinanceChartTrendTitle")}</h3>
            <div className="h-[min(22rem,50vh)] min-h-[200px]">
              <Line data={lineData} options={lineOptions} />
            </div>
          </Card>
        </div>
      )}
    </AdminLayout>
  );
}
