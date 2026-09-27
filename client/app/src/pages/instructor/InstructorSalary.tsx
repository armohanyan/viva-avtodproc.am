import InstructorPanelLayout from "src/components/InstructorPanelLayout";
import PanelPageHeader from "src/components/PanelPageHeader";
import TableSkeletonRows from "src/components/TableSkeletonRows";
import DataTableToolbar from "src/components/DataTableToolbar";
import AdminTableScroll from "src/components/AdminTableScroll";
import { Card } from "src/components/ui/card";
import { useLang, type TranslationKey } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { formatAmd } from "src/utils/currency.utils";
import { Banknote } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type PayrollStatus = "calculated" | "approved" | "paid";

type SalaryLine = {
  roleLabel: string;
  quantity: number;
  rateAmd: number;
  subtotalAmd: number;
  description: string;
};

type CurrentPeriod = {
  startDate: string;
  endDate: string;
  totalAmd: number;
  unpaidHoursCount: number;
  cardTransferAmd: number | null;
  status: PayrollStatus;
  lines: SalaryLine[];
};

type SalaryPayment = {
  id: number;
  title: string;
  periodStartIso: string;
  periodEndIso: string;
  totalAmd: number;
  status: "approved" | "paid";
  notes: string | null;
};

type InstructorSalaryOverview = {
  current: CurrentPeriod;
  history: SalaryPayment[];
};

const STATUS_KEY: Record<PayrollStatus, TranslationKey> = {
  calculated: "instructorSalaryStatusCalculated",
  approved: "instructorSalaryStatusApproved",
  paid: "instructorSalaryStatusPaid",
};

function statusBadgeClass(status: PayrollStatus): string {
  if (status === "paid") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
  if (status === "approved") return "bg-sky-500/15 text-sky-700 dark:text-sky-400";
  return "bg-amber-500/15 text-amber-800 dark:text-amber-400";
}

export default function InstructorSalary() {
  const { t } = useLang();
  const { showToast } = useToast();
  const [overview, setOverview] = useState<InstructorSalaryOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await vivaApiJson<InstructorSalaryOverview>("/instructor/salary");
      setOverview(data);
    } catch (e) {
      setOverview(null);
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const current = overview?.current ?? null;
  const history = overview?.history ?? [];

  const filteredHistory = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return history;
    return history.filter((row) => {
      const status = t(row.status === "approved" ? "instructorSalaryStatusApproved" : "instructorSalaryStatusPaid");
      const hay = [
        row.title,
        row.periodStartIso,
        row.periodEndIso,
        row.notes ?? "",
        status,
        formatAmd(row.totalAmd),
        String(row.totalAmd),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [history, search, t]);

  const expectedLabel =
    current?.status === "paid"
      ? t("instructorSalaryStatusPaid")
      : current?.status === "approved"
        ? t("instructorSalaryStatusApproved")
        : t("instructorSalaryExpectedLabel");

  return (
    <InstructorPanelLayout>
      <PanelPageHeader icon={Banknote} title={t("instructorSalaryTitle")} subtitle={t("instructorSalarySubtitle")} />

      <Card className="p-5 border-border mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{t("instructorSalaryCurrentTitle")}</p>
            <p className="text-sm tabular-nums text-muted-foreground">
              {loading ? "…" : current ? `${current.startDate} — ${current.endDate}` : "—"}
            </p>
          </div>
          {current ? (
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass(current.status)}`}
            >
              {t(STATUS_KEY[current.status])}
            </span>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground mt-4 mb-1">{expectedLabel}</p>
        <p className="text-2xl font-bold tabular-nums">{loading ? "…" : formatAmd(current?.totalAmd ?? 0)}</p>
        {current && current.unpaidHoursCount > 0 ? (
          <p className="text-xs text-muted-foreground mt-2">
            {current.unpaidHoursCount} {t("instructorSalaryUnpaidHours")}
          </p>
        ) : null}
        {current?.cardTransferAmd != null && current.cardTransferAmd > 0 ? (
          <p className="text-xs text-muted-foreground mt-1 tabular-nums">
            {t("instructorSalaryCardTransfer")}: {formatAmd(current.cardTransferAmd)}
          </p>
        ) : null}

        <div className="mt-5 space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">…</p>
          ) : !current || current.lines.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("instructorSalaryNoLines")}</p>
          ) : (
            current.lines.map((line, idx) => (
              <div
                key={`${line.roleLabel}-${idx}`}
                className="rounded-md border border-border px-3 py-2.5 space-y-1"
              >
                <div className="font-medium text-foreground text-sm">{line.roleLabel}</div>
                <div className="text-muted-foreground text-xs">{line.description}</div>
                <div className="flex justify-between tabular-nums pt-1 text-sm">
                  <span>
                    {line.quantity} × {formatAmd(line.rateAmd)}
                  </span>
                  <span className="font-medium">{formatAmd(line.subtotalAmd)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card className="border-border overflow-hidden min-w-0">
        <div className="p-5 border-b border-border">
          <h3 className="font-semibold text-foreground">{t("instructorSalaryHistoryTitle")}</h3>
        </div>
        <DataTableToolbar value={search} onChange={setSearch} placeholder={`${t("search")}…`} />
        <AdminTableScroll>
          <table className="w-full text-sm min-w-[36rem]">
            <thead className="bg-muted/40">
              <tr>
                {[
                  t("instructorSalaryColPeriod"),
                  t("instructorSalaryColTitle"),
                  t("instructorSalaryColStatus"),
                  t("instructorSalaryColAmount"),
                ].map((h, i) => (
                  <th
                    key={h}
                    className={`text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider whitespace-nowrap ${i === 3 ? "text-right" : "text-left"}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <TableSkeletonRows cols={4} cellClassName="px-4 py-3" />
              ) : filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    {history.length === 0 ? t("instructorSalaryHistoryEmpty") : t("instructorSalaryHistoryNoMatch")}
                  </td>
                </tr>
              ) : (
                filteredHistory.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                      {row.periodStartIso} — {row.periodEndIso}
                    </td>
                    <td className="px-4 py-3">
                      <div>{row.title}</div>
                      {row.notes ? <div className="text-xs text-muted-foreground mt-0.5">{row.notes}</div> : null}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${statusBadgeClass(row.status)}`}
                      >
                        {t(row.status === "approved" ? "instructorSalaryStatusApproved" : "instructorSalaryStatusPaid")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">{formatAmd(row.totalAmd)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </AdminTableScroll>
      </Card>
    </InstructorPanelLayout>
  );
}
