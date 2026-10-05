import { useMemo } from "react";
import DirectorDataTable from "src/modules/director/components/DirectorDataTable";
import {
  DirectorStatCard,
  DirectorStatGrid,
} from "src/modules/director/components/DirectorUi";
import {
  DIRECTOR_CASH_DIRECTION_LABELS,
  DIRECTOR_CASH_SOURCE_LABELS,
  DIRECTOR_PAYMENT_LABELS,
} from "src/modules/director/director.consts";
import type { DirectorCashEntry, DirectorCashSummary } from "src/modules/director/director.types";
import { useDirectorTable } from "src/modules/director/useDirectorTable";
import { useBranches } from "src/modules/branches/useBranches";
import { formatAmd } from "src/pages/admin/finance/adminFinanceShared";
import { cn } from "src/lib/utils";

type Props = {
  kassa: DirectorCashSummary;
  rangeLabel: string;
};

export default function CashRegisterDayLedger({ kassa, rangeLabel }: Props) {
  const { branches } = useBranches();
  const {
    entries,
    balance,
    periodIn: dayIn,
    periodOut: dayOut,
    periodCashIn: dayCashIn,
    periodCardIn: dayCardIn,
    periodCashOut: dayCashOut,
    periodCardOut: dayCardOut,
  } = kassa;
  const dayNet = dayIn - dayOut;

  const branchName = (id: number | null) => {
    if (id == null) return "—";
    const b = branches.find((x) => String(x.id) === String(id));
    return b?.label || b?.name || `#${id}`;
  };

  const columns = useMemo(
    () => [
      {
        id: "date",
        header: "Վճարման ամսաթիվ",
        sortable: true,
        sortValue: (r: DirectorCashEntry) => r.occurredAt || r.date,
        searchValue: (r: DirectorCashEntry) => r.occurredAt || r.date,
        render: (r: DirectorCashEntry) => r.occurredAt || r.date,
      },
      {
        id: "source",
        header: "Աղբյուր",
        sortable: true,
        filterable: true,
        sortValue: (r: DirectorCashEntry) => DIRECTOR_CASH_SOURCE_LABELS[r.source],
        filterValue: (r: DirectorCashEntry) => DIRECTOR_CASH_SOURCE_LABELS[r.source],
        searchValue: (r: DirectorCashEntry) => DIRECTOR_CASH_SOURCE_LABELS[r.source],
        render: (r: DirectorCashEntry) => DIRECTOR_CASH_SOURCE_LABELS[r.source],
      },
      {
        id: "payment",
        header: "Վճարում",
        sortable: true,
        filterable: true,
        sortValue: (r: DirectorCashEntry) => DIRECTOR_PAYMENT_LABELS[r.paymentMethod],
        filterValue: (r: DirectorCashEntry) => DIRECTOR_PAYMENT_LABELS[r.paymentMethod],
        searchValue: (r: DirectorCashEntry) => DIRECTOR_PAYMENT_LABELS[r.paymentMethod],
        render: (r: DirectorCashEntry) => DIRECTOR_PAYMENT_LABELS[r.paymentMethod],
      },
      {
        id: "direction",
        header: "Ուղղություն",
        sortable: true,
        filterable: true,
        sortValue: (r: DirectorCashEntry) => DIRECTOR_CASH_DIRECTION_LABELS[r.direction],
        filterValue: (r: DirectorCashEntry) => DIRECTOR_CASH_DIRECTION_LABELS[r.direction],
        searchValue: (r: DirectorCashEntry) => DIRECTOR_CASH_DIRECTION_LABELS[r.direction],
        render: (r: DirectorCashEntry) => (
          <span
            className={cn(
              r.direction === "in"
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-rose-700 dark:text-rose-400",
            )}
          >
            {DIRECTOR_CASH_DIRECTION_LABELS[r.direction]}
          </span>
        ),
      },
      {
        id: "amount",
        header: "Գումար",
        sortable: true,
        sortValue: (r: DirectorCashEntry) => r.amount,
        searchValue: (r: DirectorCashEntry) => formatAmd(r.amount),
        render: (r: DirectorCashEntry) => (
          <span
            className={cn(
              "font-medium",
              r.direction === "in"
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-rose-700 dark:text-rose-400",
            )}
          >
            {r.direction === "out" ? "-" : "+"}
            {formatAmd(r.amount)}
          </span>
        ),
      },
      {
        id: "performedBy",
        header: "Ադմին",
        searchValue: (r: DirectorCashEntry) => r.performedByName ?? "",
        render: (r: DirectorCashEntry) => r.performedByName ?? "—",
      },
      {
        id: "branch",
        header: "Մասնաճյուղ",
        searchValue: (r: DirectorCashEntry) => branchName(r.branchId),
        render: (r: DirectorCashEntry) => branchName(r.branchId),
      },
      {
        id: "comment",
        header: "Մեկնաբանություն",
        searchValue: (r: DirectorCashEntry) => r.comment ?? "",
        render: (r: DirectorCashEntry) => r.comment ?? "—",
      },
    ],
    [branches],
  );

  const table = useDirectorTable({ rows: entries, columns, defaultSortKey: "date" });

  return (
    <section className="space-y-4 mb-10">
      <h2 className="text-lg font-semibold">Կասսա · {rangeLabel}</h2>
      <p className="text-sm text-muted-foreground">
        Նույն տվյալները, ինչ տնօրենի «Կասսա» էջում՝ մուտք, ելք, վճարումներ, ծախսեր, վառելիք,
        վերանորոգում։
      </p>
      <DirectorStatGrid>
        <DirectorStatCard label="Մուտք" value={formatAmd(dayIn)} />
        <DirectorStatCard label="Մուտք · կանխիկ" value={formatAmd(dayCashIn)} />
        <DirectorStatCard label="Մուտք · քարտ" value={formatAmd(dayCardIn)} />
        <DirectorStatCard label="Ելք" value={formatAmd(dayOut)} />
        <DirectorStatCard label="Ելք · կանխիկ" value={formatAmd(dayCashOut)} />
        <DirectorStatCard label="Ելք · քարտ" value={formatAmd(dayCardOut)} />
        <DirectorStatCard label="Տարբերություն" value={formatAmd(dayNet)} />
        <DirectorStatCard label="Կանխիկ մնացորդ" value={formatAmd(balance)} />
      </DirectorStatGrid>
      <DirectorDataTable
        table={table}
        columns={columns}
        rowKey={(r) => `${r.source}:${r.sourceId}:${r.id}`}
        emptyMessage="Ընտրված ժամանակահատվածում գործարքներ չկան"
      />
    </section>
  );
}
