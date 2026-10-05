import { useMemo, useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "src/components/ui/button";
import { Card } from "src/components/ui/card";
import AdminTableScroll from "src/components/AdminTableScroll";
import DataTableToolbar from "src/components/DataTableToolbar";
import { DIRECTOR_PAYMENT_LABELS } from "src/modules/director/director.consts";
import { formatAmd } from "src/pages/admin/finance/adminFinanceShared";
import type { CashRegisterPeriodSummary, CashShiftSummary } from "./cash-register.types";
import { printCashRegisterPeriodReport } from "./cashRegisterPrint";

type Props = {
  summary: CashRegisterPeriodSummary;
  startDate: string;
  endDate: string;
  branchScope: string;
  printedBy?: string;
  shifts: CashShiftSummary[];
};

function statCard(label: string, value: string) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums mt-1">{value}</p>
    </Card>
  );
}

function MethodTable({
  title,
  rows,
  showManager,
}: {
  title: string;
  rows: Array<{
    key: string;
    managerName?: string;
    branchName: string;
    cash: number;
    card: number;
    total: number;
    paymentCount: number;
  }>;
  showManager: boolean;
}) {
  return (
    <section>
      <h3 className="text-base font-semibold mb-2">{title}</h3>
      <Card className="overflow-hidden">
        <AdminTableScroll>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                {showManager ? <th className="p-3 font-medium">Մենեջեր</th> : null}
                <th className="p-3 font-medium">Մասնաճյուղ</th>
                <th className="p-3 font-medium text-end">Կանխիկ</th>
                <th className="p-3 font-medium text-end">Քարտ</th>
                <th className="p-3 font-medium text-end">Հասույթ</th>
                <th className="p-3 font-medium text-end">Վճարումների քանակ</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={showManager ? 6 : 5} className="p-6 text-center text-muted-foreground">
                    Տվյալներ չկան
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.key} className="border-b last:border-0 hover:bg-muted/30">
                    {showManager ? <td className="p-3">{r.managerName}</td> : null}
                    <td className="p-3">{r.branchName}</td>
                    <td className="p-3 text-end tabular-nums">{formatAmd(r.cash)}</td>
                    <td className="p-3 text-end tabular-nums">{formatAmd(r.card)}</td>
                    <td className="p-3 text-end tabular-nums font-medium">{formatAmd(r.total)}</td>
                    <td className="p-3 text-end tabular-nums">{r.paymentCount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </AdminTableScroll>
      </Card>
    </section>
  );
}

export default function CashRegisterPeriodPanel({
  summary,
  startDate,
  endDate,
  branchScope,
  printedBy,
  shifts,
}: Props) {
  const [paymentSearch, setPaymentSearch] = useState("");
  const { totals, byManager, byBranch, entries } = summary;

  const paymentRows = useMemo(() => {
    const q = paymentSearch.trim().toLowerCase();
    const income = entries.filter((e) => e.direction === "in");
    if (!q) return income;
    return income.filter((e) => {
      const hay = [
        e.date,
        e.occurredAt,
        e.branchName,
        e.comment,
        e.performedByName,
        DIRECTOR_PAYMENT_LABELS[e.paymentMethod],
        formatAmd(e.amount),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [entries, paymentSearch]);

  const managerRows = byManager.map((r, i) => ({
    key: `m-${i}-${r.managerName}-${r.branchId}`,
    managerName: r.managerName,
    branchName: r.branchName,
    cash: r.cash,
    card: r.card,
    total: r.total,
    paymentCount: r.paymentCount,
  }));

  const branchRows = byBranch.map((r, i) => ({
    key: `b-${i}-${r.branchId}`,
    branchName: r.branchName,
    cash: r.cash,
    card: r.card,
    total: r.total,
    paymentCount: r.paymentCount,
  }));

  return (
    <div className="space-y-8 mb-10">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            printCashRegisterPeriodReport({
              startDate,
              endDate,
              branchScope,
              printedBy,
              period: summary,
              shifts,
            })
          }
        >
          <Printer className="h-4 w-4 me-1" />
          Տպել A4
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statCard("Ընթացիկ ժամանակահատվածի հասույթ", formatAmd(totals.periodIn))}
        {statCard("Կանխիկ մուտք", formatAmd(totals.periodCashIn))}
        {statCard("Անկանխիկ մուտք", formatAmd(totals.periodCardIn))}
        {statCard("Կանխիկ ելք", formatAmd(totals.periodCashOut))}
        {statCard("Անկանխիկ ելք", formatAmd(totals.periodCardOut))}
        {statCard("Ընդամենը ելք", formatAmd(totals.periodOut))}
      </div>

      <MethodTable title="Հասույթն ըստ մենեջերի և մասնաճյուղի" rows={managerRows} showManager />
      <MethodTable title="Վճարումներ ըստ մասնաճյուղի" rows={branchRows} showManager={false} />

      <section>
        <h3 className="text-base font-semibold mb-2">Վճարումներ</h3>
        <Card className="overflow-hidden">
          <DataTableToolbar
            value={paymentSearch}
            onChange={setPaymentSearch}
            placeholder="Որոնել վճարում…"
          />
          <AdminTableScroll>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="p-3 font-medium">Ամսաթիվ</th>
                  <th className="p-3 font-medium">Մենեջեր / Մասնաճյուղ</th>
                  <th className="p-3 font-medium text-end">Գումար</th>
                  <th className="p-3 font-medium">Եղանակ</th>
                  <th className="p-3 font-medium">Նշում</th>
                </tr>
              </thead>
              <tbody>
                {paymentRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-muted-foreground">
                      Վճարումներ չկան
                    </td>
                  </tr>
                ) : (
                  paymentRows.map((e) => (
                    <tr
                      key={`${e.source}:${e.sourceId}:${e.occurredAt}`}
                      className="border-b last:border-0 hover:bg-muted/30"
                    >
                      <td className="p-3 whitespace-nowrap">{e.date}</td>
                      <td className="p-3">
                        <div>{e.performedByName ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">{e.branchName}</div>
                      </td>
                      <td className="p-3 text-end tabular-nums font-medium">{formatAmd(e.amount)}</td>
                      <td className="p-3">{DIRECTOR_PAYMENT_LABELS[e.paymentMethod]}</td>
                      <td className="p-3 text-muted-foreground max-w-[16rem] truncate">
                        {e.comment ?? "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </AdminTableScroll>
        </Card>
      </section>
    </div>
  );
}
