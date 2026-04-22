import AdminLayout from "src/components/AdminLayout";
import { useLang } from "src/lib/i18n";
import { Card } from "src/components/ui/card";
import PanelPageHeader from "src/components/PanelPageHeader";
import { Landmark, TrendingUp, ArrowDownRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { useToast } from "src/lib/toast";
import type { CarExpense } from "src/modules/cars";
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

export default function AdminFinanceOverview() {
  const { t, lang } = useLang();
  const { showToast } = useToast();
  const [transactions, setTransactions] = useState<FinanceTx[]>([]);
  const [expenses, setExpenses] = useState<CarExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<FinanceOverviewPeriod>("1m");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [txs, ex] = await Promise.all([
        vivaApiJson<FinanceTx[]>("/finance/transactions"),
        vivaApiJson<CarExpense[]>("/fleet/expenses"),
      ]);
      setTransactions(Array.isArray(txs) ? txs : []);
      setExpenses(Array.isArray(ex) ? ex : []);
    } catch (e) {
      setTransactions([]);
      setExpenses([]);
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const locale = localeFromLang(lang);

  const { grossTotal, expenseTotal, monthLabels, incomeByMonth, expensesByMonth } = useMemo(() => {
    const n = financePeriodMonthCount(period);
    const { start: rangeStartInner, end: rangeEndInner } = rollingCalendarMonthsRange(n);
    const gross = grossCompletedInRange(transactions, rangeStartInner, rangeEndInner);
    const exp = expensesTotalInRange(expenses, rangeStartInner, rangeEndInner);
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
      monthLabels: labels,
      incomeByMonth: income,
      expensesByMonth: expM,
    };
  }, [transactions, expenses, period, locale]);

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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
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
