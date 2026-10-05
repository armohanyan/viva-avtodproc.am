import { useMemo } from "react";
import { Link } from "wouter";
import { Badge } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";
import { Card } from "src/components/ui/card";
import DirectorDataTable from "src/modules/director/components/DirectorDataTable";
import DirectorRecordActions from "src/modules/director/components/DirectorRecordActions";
import {
  DIRECTOR_CASH_DIRECTION_LABELS,
  DIRECTOR_CASH_SOURCE_LABELS,
  DIRECTOR_PAYMENT_LABELS,
} from "src/modules/director/director.consts";
import { useDirectorTable } from "src/modules/director/useDirectorTable";
import { formatAmd } from "src/pages/admin/finance/adminFinanceShared";
import { cn } from "src/lib/utils";
import { formatDateTime } from "src/lib/adminFormat";
import type { CashShiftDetail, CashShiftLine } from "./cash-register.types";
import { printCashRegisterReport } from "./cashRegisterPrint";
import { Copy, Printer } from "lucide-react";
import { useToast } from "src/lib/toast";

type Props = {
  detail: CashShiftDetail;
  onEditEntry?: (line: CashShiftLine) => void;
  onDeleteEntry?: (line: CashShiftLine) => void;
  toolbarActions?: React.ReactNode;
  showShare?: boolean;
};

function statCard(label: string, value: string, className?: string) {
  return (
    <Card className={cn("p-4", className)}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums mt-1">{value}</p>
    </Card>
  );
}

export default function CashRegisterShiftView({
  detail,
  onEditEntry,
  onDeleteEntry,
  toolbarActions,
  showShare = true,
}: Props) {
  const { showToast } = useToast();
  const { shift, entries } = detail;

  const columns = useMemo(
    () => [
      {
        id: "occurredAt",
        header: "Ամսաթիվ",
        sortable: true,
        sortValue: (r: CashShiftLine) => r.occurredAt,
        searchValue: (r: CashShiftLine) => r.occurredAt,
        render: (r: CashShiftLine) => r.occurredAt,
      },
      {
        id: "source",
        header: "Աղբյուր",
        sortable: true,
        filterable: true,
        sortValue: (r: CashShiftLine) => DIRECTOR_CASH_SOURCE_LABELS[r.source],
        filterValue: (r: CashShiftLine) => DIRECTOR_CASH_SOURCE_LABELS[r.source],
        searchValue: (r: CashShiftLine) => DIRECTOR_CASH_SOURCE_LABELS[r.source],
        render: (r: CashShiftLine) => DIRECTOR_CASH_SOURCE_LABELS[r.source],
      },
      {
        id: "payment",
        header: "Վճարում",
        sortable: true,
        filterable: true,
        sortValue: (r: CashShiftLine) => DIRECTOR_PAYMENT_LABELS[r.paymentMethod],
        filterValue: (r: CashShiftLine) => DIRECTOR_PAYMENT_LABELS[r.paymentMethod],
        searchValue: (r: CashShiftLine) => DIRECTOR_PAYMENT_LABELS[r.paymentMethod],
        render: (r: CashShiftLine) => DIRECTOR_PAYMENT_LABELS[r.paymentMethod],
      },
      {
        id: "direction",
        header: "Ուղղություն",
        sortable: true,
        filterValue: (r: CashShiftLine) => DIRECTOR_CASH_DIRECTION_LABELS[r.direction],
        searchValue: (r: CashShiftLine) => DIRECTOR_CASH_DIRECTION_LABELS[r.direction],
        render: (r: CashShiftLine) => (
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
        sortValue: (r: CashShiftLine) => r.amount,
        searchValue: (r: CashShiftLine) => formatAmd(r.amount),
        render: (r: CashShiftLine) => (
          <span
            className={cn(
              "font-medium",
              r.direction === "in"
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-rose-700 dark:text-rose-400",
              r.unassigned && "opacity-60",
            )}
          >
            {r.direction === "out" ? "-" : "+"}
            {formatAmd(r.amount)}
            {r.unassigned ? " · չի հաշվվում" : null}
          </span>
        ),
      },
      {
        id: "performedBy",
        header: "Կատարող",
        searchValue: (r: CashShiftLine) => r.performedByName ?? "",
        render: (r: CashShiftLine) => r.performedByName ?? "—",
      },
      {
        id: "comment",
        header: "Մեկնաբանություն",
        searchValue: (r: CashShiftLine) => r.comment ?? "",
        render: (r: CashShiftLine) => r.comment ?? "—",
      },
      {
        id: "actions",
        header: "",
        align: "end" as const,
        render: (r: CashShiftLine) =>
          r.editable && onEditEntry && onDeleteEntry ? (
            <DirectorRecordActions
              onEdit={() => onEditEntry(r)}
              onDelete={() => onDeleteEntry(r)}
            />
          ) : (
            <span className="text-xs text-muted-foreground">Ավտոմատ</span>
          ),
      },
    ],
    [onDeleteEntry, onEditEntry],
  );

  const table = useDirectorTable({ rows: entries, columns, defaultSortKey: "occurredAt" });

  const share = async () => {
    const url = `${window.location.origin}/admin/cash-register/shifts/${shift.id}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast("Հղումը պատճենված է", "success");
    } catch {
      showToast(url, "info");
    }
  };

  return (
    <div className="space-y-6 print:hidden">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={shift.status === "OPEN" ? "default" : "secondary"}>
          {shift.status === "OPEN" ? "Բաց" : "Փակ"}
        </Badge>
        <span className="text-sm text-muted-foreground">
          {shift.branchName} · {shift.adminName}
        </span>
        <span className="text-sm text-muted-foreground">
          {formatDateTime(shift.openedAt)}
          {shift.closedAt ? ` — ${formatDateTime(shift.closedAt)}` : " — …"}
        </span>
        <div className="flex flex-wrap gap-2 ms-auto">
          <Button type="button" variant="outline" size="sm" onClick={() => printCashRegisterReport(detail)}>
            <Printer className="h-4 w-4 me-1" />
            Տպել
          </Button>
          {showShare ? (
            <Button type="button" variant="outline" size="sm" onClick={() => void share()}>
              <Copy className="h-4 w-4 me-1" />
              Կիսվել
            </Button>
          ) : null}
          <Button type="button" variant="ghost" size="sm" asChild>
            <Link href={`/admin/cash-register/shifts/${shift.id}`}>Մանրամասն</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statCard("Սկզբնական մնացորդ", formatAmd(shift.openingBalance))}
        {statCard("Կանխիկ մուտք", formatAmd(shift.cashInTotal))}
        {statCard("Կանխիկ ելք", formatAmd(shift.cashOutTotal))}
        {statCard("Հաշվարկային մնացորդ", formatAmd(shift.expectedBalance))}
        {statCard("Քարտ · մուտք", formatAmd(shift.cardInTotal))}
        {statCard("Քարտ · ելք", formatAmd(shift.cardOutTotal))}
        {shift.actualBalance != null
          ? statCard("Փաստացի մնացորդ", formatAmd(shift.actualBalance))
          : null}
        {shift.difference != null
          ? statCard(
              "Տարբերություն",
              shift.difference === 0
                ? formatAmd(0)
                : shift.difference > 0
                  ? `+${formatAmd(shift.difference)}`
                  : `−${formatAmd(Math.abs(shift.difference))}`,
              shift.difference !== 0 ? "border-amber-500/50" : undefined,
            )
          : null}
      </div>

      <DirectorDataTable
        table={table}
        columns={columns}
        rowKey={(r) => `${r.source}:${r.sourceId}:${r.occurredAt}`}
        toolbarActions={toolbarActions}
      />
    </div>
  );
}
