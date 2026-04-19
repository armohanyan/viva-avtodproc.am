import AdminLayout from "src/components/AdminLayout";
import { useLang } from "src/lib/i18n";
import { Card } from "src/components/ui/card";
import PanelPageHeader from "src/components/PanelPageHeader";
import { Landmark, Wallet, ArrowDownRight, ArrowRightLeft, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { useToast } from "src/lib/toast";
import type { CarExpense } from "src/modules/cars";
import {
  type FinanceTx,
  channelTKey,
  formatAmd,
  methodTKey,
  monthRange,
  netOf,
  outcomesBreakdownInRange,
} from "./adminFinanceShared";

export default function AdminFinanceOverview() {
  const { t } = useLang();
  const { showToast } = useToast();
  const [transactions, setTransactions] = useState<FinanceTx[]>([]);
  const [expenses, setExpenses] = useState<CarExpense[]>([]);
  const [loading, setLoading] = useState(true);

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

  const { grossMonth, netMonth, expenseMonth, netFlowMonth, outcomeBreakdown } = useMemo(() => {
    const { start, end } = monthRange();
    const inMonth = (iso: string) => {
      const d = new Date(iso);
      return d >= start && d <= end;
    };
    const completed = transactions.filter((tx) => tx.status === "completed" && inMonth(tx.createdAt));
    const gross = completed.reduce((s, tx) => s + tx.grossAmd, 0);
    const net = completed.reduce((s, tx) => s + netOf(tx), 0);
    const expRows = expenses.filter((e) => {
      const d = new Date(`${e.date.slice(0, 10)}T12:00:00`);
      return d >= start && d <= end;
    });
    const expTotal = expRows.reduce((s, e) => s + Math.abs(e.amount), 0);
    return {
      grossMonth: gross,
      netMonth: net,
      expenseMonth: expTotal,
      netFlowMonth: net - expTotal,
      outcomeBreakdown: outcomesBreakdownInRange(expenses, start, end),
    };
  }, [transactions, expenses]);

  return (
    <AdminLayout>
      <PanelPageHeader
        icon={Landmark}
        title={t("adminFinanceOverviewTitle")}
        subtitle={t("adminFinanceOverviewSubtitle")}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-10">
        <Card className="p-5 border-border">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground mb-1 leading-snug">{t("adminFinanceKpiGrossMonth")}</p>
              <p className="text-lg font-bold text-foreground tabular-nums break-words">{loading ? "…" : formatAmd(grossMonth)}</p>
            </div>
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
          </div>
        </Card>
        <Card className="p-5 border-border">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground mb-1 leading-snug">{t("adminFinanceKpiNetMonth")}</p>
              <p className="text-lg font-bold text-foreground tabular-nums break-words">{loading ? "…" : formatAmd(netMonth)}</p>
            </div>
            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
        </Card>
        <Card className="p-5 border-border">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground mb-1 leading-snug">{t("adminFinanceKpiExpensesMonth")}</p>
              <p className="text-lg font-bold text-foreground tabular-nums break-words">{loading ? "…" : formatAmd(expenseMonth)}</p>
            </div>
            <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center shrink-0">
              <ArrowDownRight className="w-5 h-5 text-amber-700 dark:text-amber-400" />
            </div>
          </div>
        </Card>
        <Card className="p-5 border-border">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground mb-1 leading-snug">{t("adminFinanceKpiNetFlowMonth")}</p>
              <p className="text-lg font-bold text-foreground tabular-nums break-words">{loading ? "…" : formatAmd(netFlowMonth)}</p>
            </div>
            <div className="w-10 h-10 bg-sky-500/10 rounded-xl flex items-center justify-center shrink-0">
              <ArrowRightLeft className="w-5 h-5 text-sky-700 dark:text-sky-400" />
            </div>
          </div>
        </Card>
      </div>

      <div className="mb-10">
        <h3 className="text-sm font-semibold text-foreground mb-3">{t("adminFinanceBreakdownOutcomesTitle")}</h3>
        {loading ? (
          <p className="text-sm text-muted-foreground">…</p>
        ) : outcomeBreakdown.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("adminFinanceBreakdownOutcomesEmpty")}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {outcomeBreakdown.map((row) => (
              <Card key={row.key} className="p-4 border-border">
                <p className="text-xs text-muted-foreground mb-1">
                  {t(channelTKey(row.channel))} · {t(methodTKey(row.method))}
                </p>
                <p className="text-lg font-bold text-foreground tabular-nums">{formatAmd(row.total)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {row.count} {row.count === 1 ? t("adminFinanceBreakdownTxSingular") : t("adminFinanceBreakdownTxPlural")}
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/admin/finance/income" className="block group">
          <Card className="p-6 border-border h-full transition-colors group-hover:border-primary/40 group-hover:bg-muted/20">
            <h3 className="font-semibold text-foreground mb-1">{t("adminFinanceIncomeNav")}</h3>
            <p className="text-sm text-muted-foreground mb-4">{t("adminFinanceIncomeCardBlurb")}</p>
            <span className="text-sm font-medium text-primary">{t("adminFinanceGotoSection")} →</span>
          </Card>
        </Link>
        <Link href="/admin/finance/outcomes" className="block group">
          <Card className="p-6 border-border h-full transition-colors group-hover:border-primary/40 group-hover:bg-muted/20">
            <h3 className="font-semibold text-foreground mb-1">{t("adminFinanceOutcomesNav")}</h3>
            <p className="text-sm text-muted-foreground mb-4">{t("adminFinanceOutcomesCardBlurb")}</p>
            <span className="text-sm font-medium text-primary">{t("adminFinanceGotoSection")} →</span>
          </Card>
        </Link>
      </div>
    </AdminLayout>
  );
}
