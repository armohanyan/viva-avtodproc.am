import AdminLayout from "src/components/AdminLayout";
import AdminTableScroll from "src/components/AdminTableScroll";
import { useLang } from "src/lib/i18n";
import { Card } from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import { Input } from "src/components/ui/input";
import { Button } from "src/components/ui/button";
import { AppModal } from "src/components/AppModal";
import DataTableToolbar from "src/components/DataTableToolbar";
import CsvExportButton from "src/components/CsvExportButton";
import TableColumnFilter, { TableColumnHeaderWithFilter } from "src/components/TableColumnFilter";
import PanelPageHeader from "src/components/PanelPageHeader";
import { Landmark, Plus, CreditCard, Wallet, CheckCircle2 } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { branchNameById, useBranches } from "src/modules/branches";
import { useToast } from "src/lib/toast";
import AdminStudentSearchSelect from "src/components/admin/AdminStudentSearchSelect";
import { useAdminStudentsMini } from "src/modules/admin/useAdminStudents";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import {
  type FinanceTx,
  type ManualFormShape,
  type TxChannel,
  type TxMethod,
  type TxStatus,
  channelTKey,
  formatAmd,
  incomeBreakdownCompletedInRange,
  methodTKey,
  monthRange,
  netOf,
  parseAmdInput,
  statusClass,
  statusTKey,
  toDatetimeLocalValue,
} from "./adminFinanceShared";
import { FINANCE_INCOME_PREFILL } from "./adminFinancePrefill";

type ManualForm = ManualFormShape;

export default function AdminFinanceIncome() {
  const manualTxFormId = useId();
  /** Captured once on first client render so StrictMode does not double-apply prefills. */
  const prefillSearchRef = useRef<string | null>(null);
  if (prefillSearchRef.current === null && typeof window !== "undefined") {
    prefillSearchRef.current = window.location.search || "";
  }
  const { t } = useLang();
  const { showToast } = useToast();
  const { branches } = useBranches();
  const { students: studentDirectory, loading: studentDirectoryLoading } = useAdminStudentsMini({ enrollmentStatus: "all" });
  const [transactions, setTransactions] = useState<FinanceTx[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | TxStatus>("all");
  const [manualOpen, setManualOpen] = useState(false);
  const [manualForm, setManualForm] = useState<ManualForm>(() => ({
    studentDirectoryId: "",
    customer: "",
    email: "",
    description: "",
    branchId: "",
    channel: "office",
    method: "cash",
    grossStr: "",
    feeStr: "0",
    status: "completed",
    ref: "",
    datetimeLocal: toDatetimeLocalValue(new Date()),
    bookingIdStr: "",
  }));

  const refreshTransactions = useCallback(async () => {
    setTransactionsLoading(true);
    try {
      const data = await vivaApiJson<FinanceTx[]>("/finance/transactions");
      setTransactions(
        Array.isArray(data)
          ? data
              .map((tx) => ({ ...tx, bookingId: tx.bookingId ?? null, entryType: tx.entryType ?? "income" }))
              .filter((tx) => tx.entryType === "income")
          : [],
      );
    } catch (e) {
      setTransactions([]);
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setTransactionsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void refreshTransactions();
  }, [refreshTransactions]);

  const resetManualForm = useCallback((defaultBranchId: string) => {
    setManualForm({
      studentDirectoryId: "",
      customer: "",
      email: "",
      description: "",
      branchId: defaultBranchId,
      channel: "office",
      method: "cash",
      grossStr: "",
      feeStr: "0",
      status: "completed",
      ref: "",
      datetimeLocal: toDatetimeLocalValue(new Date()),
      bookingIdStr: "",
    });
  }, []);

  const openManualDialog = () => {
    resetManualForm(branches[0]?.id ?? "");
    setManualOpen(true);
  };

  useEffect(() => {
    const raw = prefillSearchRef.current;
    if (!raw || raw.length <= 1) return;
    const params = new URLSearchParams(raw);
    const studentId = params.get(FINANCE_INCOME_PREFILL.student)?.trim() ?? "";
    const bookingId = params.get(FINANCE_INCOME_PREFILL.booking)?.trim() ?? "";
    const branchParam = params.get(FINANCE_INCOME_PREFILL.branch)?.trim() ?? "";
    const amountStr = params.get(FINANCE_INCOME_PREFILL.amount)?.trim() ?? "";
    const desc = params.get(FINANCE_INCOME_PREFILL.desc)?.trim() ?? "";
    const hasPrefill = !!(studentId || bookingId || branchParam || amountStr || desc);
    if (!hasPrefill) {
      prefillSearchRef.current = "";
      return;
    }
    if (branches.length === 0) return;
    if (studentId && studentDirectoryLoading) return;

    prefillSearchRef.current = "";
    const student = studentId ? studentDirectory.find((x) => x.id === studentId) : undefined;
    const branchOk = branchParam && branches.some((b) => b.id === branchParam) ? branchParam : "";
    const branchId = branchOk || branches[0]?.id || "";

    setManualForm({
      studentDirectoryId: student ? studentId : "",
      customer: student?.name ?? "",
      email: student?.email ?? "",
      description: desc,
      branchId,
      channel: "office",
      method: "cash",
      grossStr: /^\d+$/.test(amountStr) ? amountStr : "",
      feeStr: "0",
      status: "completed",
      ref: "",
      datetimeLocal: toDatetimeLocalValue(new Date()),
      bookingIdStr: bookingId,
    });
    setManualOpen(true);
    try {
      window.history.replaceState({}, "", "/admin/finance/income");
    } catch {
      /* ignore */
    }
  }, [studentDirectoryLoading, studentDirectory, branches]);

  const submitManual = async (e: React.FormEvent) => {
    e.preventDefault();
    const gross = parseAmdInput(manualForm.grossStr);
    const fee = manualForm.feeStr.trim() === "" ? 0 : parseAmdInput(manualForm.feeStr);
    if (!manualForm.customer.trim() || !manualForm.description.trim() || !manualForm.branchId) {
      showToast(t("financeManualErrorRequired"), "error");
      return;
    }
    if (!Number.isFinite(gross) || gross <= 0) {
      showToast(t("financeManualErrorAmount"), "error");
      return;
    }
    if (!Number.isFinite(fee) || fee < 0 || fee > gross) {
      showToast(t("financeManualErrorFee"), "error");
      return;
    }
    const created = new Date(manualForm.datetimeLocal);
    if (Number.isNaN(created.getTime())) {
      showToast(t("financeManualErrorDate"), "error");
      return;
    }

    const bookingIdTrim = manualForm.bookingIdStr.trim();
    let bookingId: number | undefined;
    if (bookingIdTrim) {
      const parsed = Number.parseInt(bookingIdTrim, 10);
      if (!Number.isFinite(parsed) || parsed <= 0 || String(parsed) !== bookingIdTrim) {
        showToast(t("financeManualErrorBookingId"), "error");
        return;
      }
      bookingId = parsed;
    }

    try {
      await vivaApiJson("/finance/transactions", {
        method: "POST",
        body: {
          createdAt: created.toISOString(),
          customer: manualForm.customer.trim(),
          email: manualForm.email.trim(),
          description: manualForm.description.trim(),
          branchId: manualForm.branchId,
          channel: manualForm.channel,
          method: manualForm.method,
          grossAmd: gross,
          feeAmd: fee,
          status: manualForm.status,
          providerRef: manualForm.ref.trim() || "—",
          source: "manual",
          entryType: "income",
          ...(bookingId !== undefined ? { bookingId } : {}),
        },
      });
      setManualOpen(false);
      showToast(t("financeManualTxRecordedToast"), "success");
      await refreshTransactions();
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions.filter((tx) => {
      const branchLabel = branchNameById(branches, tx.branchId);
      const hay = [
        tx.id,
        tx.customer,
        tx.email,
        tx.description,
        branchLabel,
        t(channelTKey(tx.channel)),
        t(methodTKey(tx.method)),
        tx.status,
        tx.providerRef,
        tx.bookingId ?? "",
        tx.source === "manual" ? t("financeOriginManual") : t("financeOriginSystem"),
        formatAmd(tx.grossAmd),
        formatAmd(tx.feeAmd),
        formatAmd(netOf(tx)),
      ]
        .join(" ")
        .toLowerCase();
      const matchSearch = !q || hay.includes(q);
      const matchBranch = branchFilter === "all" || tx.branchId === branchFilter;
      const matchStatus = statusFilter === "all" || tx.status === statusFilter;
      return matchSearch && matchBranch && matchStatus;
    });
  }, [search, branchFilter, statusFilter, branches, t, transactions]);

  const breakdownRows = useMemo(() => {
    const { start, end } = monthRange();
    return incomeBreakdownCompletedInRange(transactions, start, end);
  }, [transactions]);

  const monthlyTotals = useMemo(() => {
    const { start, end } = monthRange();
    let gross = 0;
    let net = 0;
    let count = 0;
    for (const tx of transactions) {
      if (tx.status !== "completed") continue;
      const d = new Date(tx.createdAt);
      if (d < start || d > end) continue;
      gross += tx.grossAmd;
      net += netOf(tx);
      count += 1;
    }
    return { gross, net, count };
  }, [transactions]);

  return (
    <AdminLayout>
      <PanelPageHeader
        icon={Landmark}
        title={t("adminFinanceIncomeTitle")}
        subtitle={t("adminFinanceIncomeSubtitle")}
        actions={
          <Button
            type="button"
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
            onClick={openManualDialog}
          >
            <Plus className="w-4 h-4" />
            {t("financeManualEntryTitle")}
          </Button>
        }
      />

      <div className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Card className="p-4 border-border">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">{t("adminFinanceKpiGrossMonth")}</p>
                <p className="text-lg font-bold tabular-nums">{formatAmd(monthlyTotals.gross)}</p>
              </div>
              <CreditCard className="w-4 h-4 text-primary mt-1" />
            </div>
          </Card>
          <Card className="p-4 border-border">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">{t("adminFinanceKpiNetMonth")}</p>
                <p className="text-lg font-bold tabular-nums">{formatAmd(monthlyTotals.net)}</p>
              </div>
              <Wallet className="w-4 h-4 text-emerald-600 mt-1" />
            </div>
          </Card>
          <Card className="p-4 border-border">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground">{t("adminFinanceBreakdownIncomeTitle")}</p>
                <p className="text-lg font-bold tabular-nums">{monthlyTotals.count}</p>
              </div>
              <CheckCircle2 className="w-4 h-4 text-muted-foreground mt-1" />
            </div>
          </Card>
        </div>
        <h3 className="text-sm font-semibold text-foreground mb-3">{t("adminFinanceBreakdownIncomeTitle")}</h3>
        {transactionsLoading ? (
          <p className="text-sm text-muted-foreground">…</p>
        ) : breakdownRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("adminFinanceBreakdownEmpty")}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {breakdownRows.map((row) => (
              <Card key={row.key} className="p-4 border-border">
                <p className="text-xs text-muted-foreground mb-1">
                  {t(channelTKey(row.channel))} · {t(methodTKey(row.method))}
                </p>
                <p className="text-lg font-bold text-foreground tabular-nums">{formatAmd(row.gross)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("financeColNet")}: {formatAmd(row.net)} · {row.count}{" "}
                  {row.count === 1 ? t("adminFinanceBreakdownTxSingular") : t("adminFinanceBreakdownTxPlural")}
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Card className="border-border overflow-hidden min-w-0">
        <div className="p-5 border-b border-border">
          <h3 className="font-semibold text-foreground">{t("adminFinanceTransactionsTitle")}</h3>
        </div>
        <DataTableToolbar value={search} onChange={setSearch} placeholder={`${t("search")}…`}>
          <CsvExportButton
            filename="admin-finance-income.csv"
            headers={[
              t("tableColId"),
              t("financeColSource"),
              t("financeColDateTime"),
              t("financeColCustomer"),
              t("accountsColEmail"),
              t("financeColProduct"),
              t("financeColBooking"),
              t("adminColBranch"),
              t("financeColChannel"),
              t("financeColMethod"),
              t("financeColGross"),
              t("financeColFee"),
              t("financeColNet"),
              t("status"),
              t("financeColProviderRef"),
            ]}
            rows={filtered.map((tx) => [
              String(tx.id),
              tx.source === "manual" ? t("financeOriginManual") : t("financeOriginSystem"),
              new Date(tx.createdAt).toLocaleString(),
              tx.customer,
              tx.email,
              tx.description,
              tx.bookingId ?? "",
              branchNameById(branches, tx.branchId),
              t(channelTKey(tx.channel)),
              t(methodTKey(tx.method)),
              String(tx.grossAmd),
              String(tx.feeAmd),
              String(netOf(tx)),
              t(statusTKey(tx.status)),
              tx.providerRef,
            ])}
          />
        </DataTableToolbar>

        <AdminTableScroll>
          <table className="w-full text-sm min-w-[88rem]">
            <thead className="bg-muted/40">
              <tr>
                <TableColumnHeaderWithFilter title={t("tableColId")} />
                <TableColumnHeaderWithFilter title={t("financeColSource")} />
                <TableColumnHeaderWithFilter title={t("financeColDateTime")} />
                <TableColumnHeaderWithFilter title={t("financeColCustomer")} />
                <TableColumnHeaderWithFilter title={t("accountsColEmail")} />
                <TableColumnHeaderWithFilter title={t("financeColProduct")} />
                <TableColumnHeaderWithFilter title={t("financeColBooking")} />
                <TableColumnHeaderWithFilter
                  title={t("adminColBranch")}
                  filter={
                    <TableColumnFilter
                      value={branchFilter}
                      onChange={setBranchFilter}
                      ariaLabel={t("filterByBranch")}
                      options={[
                        { value: "all", label: t("filterOptionAll") },
                        ...branches.map((b) => ({ value: b.id, label: b.name })),
                      ]}
                    />
                  }
                />
                <TableColumnHeaderWithFilter title={t("financeColChannel")} />
                <TableColumnHeaderWithFilter title={t("financeColMethod")} />
                <TableColumnHeaderWithFilter title={t("financeColGross")} />
                <TableColumnHeaderWithFilter title={t("financeColFee")} />
                <TableColumnHeaderWithFilter title={t("financeColNet")} />
                <TableColumnHeaderWithFilter
                  title={t("status")}
                  filter={
                    <TableColumnFilter
                      value={statusFilter}
                      onChange={(v) => setStatusFilter(v as "all" | TxStatus)}
                      ariaLabel={t("filterByStatus")}
                      options={[
                        { value: "all", label: t("filterOptionAll") },
                        { value: "completed", label: t("financeStatusCompleted") },
                        { value: "pending", label: t("financeStatusPending") },
                        { value: "failed", label: t("financeStatusFailed") },
                        { value: "refunded", label: t("financeStatusRefunded") },
                      ]}
                    />
                  }
                />
                <TableColumnHeaderWithFilter title={t("financeColProviderRef")} />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    {t("tableNoMatches")}
                  </td>
                </tr>
              ) : (
                filtered.map((tx) => (
                  <tr key={tx.id} className="hover:bg-muted/30">
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
                    <td className="px-4 py-3.5 font-medium text-foreground whitespace-nowrap">{tx.customer}</td>
                    <td className="px-4 py-3.5 text-muted-foreground max-w-[12rem] truncate" title={tx.email}>
                      {tx.email || "—"}
                    </td>
                    <td className="px-4 py-3.5 text-foreground max-w-[14rem]">{tx.description}</td>
                    <td className="px-4 py-3.5 text-muted-foreground text-xs font-mono whitespace-nowrap" title={tx.bookingId ?? undefined}>
                      {tx.bookingId ?? "—"}
                    </td>
                    <td
                      className="px-4 py-3.5 text-muted-foreground whitespace-nowrap max-w-[10rem] truncate"
                      title={branchNameById(branches, tx.branchId)}
                    >
                      {branchNameById(branches, tx.branchId)}
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">{t(channelTKey(tx.channel))}</td>
                    <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">{t(methodTKey(tx.method))}</td>
                    <td className="px-4 py-3.5 text-foreground tabular-nums whitespace-nowrap">{formatAmd(tx.grossAmd)}</td>
                    <td className="px-4 py-3.5 text-muted-foreground tabular-nums whitespace-nowrap">{formatAmd(tx.feeAmd)}</td>
                    <td className="px-4 py-3.5 font-medium text-foreground tabular-nums whitespace-nowrap">{formatAmd(netOf(tx))}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <Badge className={`text-xs ${statusClass[tx.status]}`}>{t(statusTKey(tx.status))}</Badge>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground text-xs font-mono whitespace-nowrap">{tx.providerRef}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </AdminTableScroll>
        <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
          {t("panelShowingLabel")} {filtered.length} / {transactions.length}
        </div>
      </Card>

      <AppModal
        open={manualOpen}
        onOpenChange={setManualOpen}
        title={t("financeManualEntryTitle")}
        description={t("financeManualEntrySubtitle")}
        contentClassName="max-w-lg max-h-[min(90vh,720px)]"
        footer={
          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setManualOpen(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" form={manualTxFormId} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">
              {t("save")}
            </Button>
          </div>
        }
      >
        <form id={manualTxFormId} onSubmit={submitManual} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("financeManualSelectStudentPlaceholder")}</label>
              <AdminStudentSearchSelect
                students={studentDirectory}
                value={manualForm.studentDirectoryId}
                onChange={(id) => {
                  if (!id) {
                    setManualForm((f) => ({ ...f, studentDirectoryId: "" }));
                    return;
                  }
                  const s = studentDirectory.find((x) => x.id === id);
                  setManualForm((f) => ({
                    ...f,
                    studentDirectoryId: id,
                    customer: s?.name ?? "",
                    email: s?.email ?? "",
                  }));
                }}
                allowClear
                disabled={studentDirectoryLoading}
                searchPlaceholder={t("adminStudentPickerSearchPlaceholder")}
                selectPlaceholder="—"
                noResultsLabel={t("tableNoMatches")}
                emptyListLabel={t("couldNotLoadData")}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("financeColCustomer")}</label>
              <Input
                value={manualForm.customer}
                onChange={(e) => setManualForm((f) => ({ ...f, customer: e.target.value, studentDirectoryId: "" }))}
                className="h-10"
                placeholder={t("placeholderFullName")}
                autoComplete="name"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("accountsColEmail")}</label>
              <Input
                type="email"
                value={manualForm.email}
                onChange={(e) => setManualForm((f) => ({ ...f, email: e.target.value, studentDirectoryId: "" }))}
                className="h-10"
                placeholder={t("placeholderEmailExample")}
                autoComplete="email"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("adminSelectBranch")}</label>
              <select
                value={manualForm.branchId}
                onChange={(e) => setManualForm((f) => ({ ...f, branchId: e.target.value }))}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                required
              >
                <option value="">{t("financeSelectBranchPlaceholder")}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("financeColProduct")}</label>
              <Input
                value={manualForm.description}
                onChange={(e) => setManualForm((f) => ({ ...f, description: e.target.value }))}
                className="h-10"
                placeholder={t("financeManualTxDescriptionPlaceholder")}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("financeColBooking")}</label>
              <Input
                value={manualForm.bookingIdStr}
                onChange={(e) => setManualForm((f) => ({ ...f, bookingIdStr: e.target.value }))}
                className="h-10 font-mono text-sm"
                placeholder={t("financeManualBookingIdPlaceholder")}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("financeColChannel")}</label>
              <select
                value={manualForm.channel}
                onChange={(e) => setManualForm((f) => ({ ...f, channel: e.target.value as TxChannel }))}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="office">{t("financeChannelOffice")}</option>
                <option value="pos">{t("financeChannelPos")}</option>
                <option value="online">{t("financeChannelOnline")}</option>
                <option value="bank">{t("financeChannelBank")}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("financeColMethod")}</label>
              <select
                value={manualForm.method}
                onChange={(e) => setManualForm((f) => ({ ...f, method: e.target.value as TxMethod }))}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="cash">{t("financeMethodCash")}</option>
                <option value="card">{t("financeMethodCard")}</option>
                <option value="transfer">{t("financeMethodTransfer")}</option>
                <option value="idram">{t("financeMethodIdram")}</option>
              </select>
            </div>
            <p className="sm:col-span-2 text-xs text-muted-foreground -mt-1">{t("financeManualChannelHint")}</p>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("financeManualTxGrossLabel")}</label>
              <Input
                inputMode="decimal"
                value={manualForm.grossStr}
                onChange={(e) => setManualForm((f) => ({ ...f, grossStr: e.target.value }))}
                className="h-10 tabular-nums"
                placeholder="55000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("financeManualTxFeeLabel")}</label>
              <Input
                inputMode="decimal"
                value={manualForm.feeStr}
                onChange={(e) => setManualForm((f) => ({ ...f, feeStr: e.target.value }))}
                className="h-10 tabular-nums"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("status")}</label>
              <select
                value={manualForm.status}
                onChange={(e) => setManualForm((f) => ({ ...f, status: e.target.value as TxStatus }))}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="completed">{t("financeStatusCompleted")}</option>
                <option value="pending">{t("financeStatusPending")}</option>
                <option value="failed">{t("financeStatusFailed")}</option>
                <option value="refunded">{t("financeStatusRefunded")}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("financeColDateTime")}</label>
              <Input
                type="datetime-local"
                value={manualForm.datetimeLocal}
                onChange={(e) => setManualForm((f) => ({ ...f, datetimeLocal: e.target.value }))}
                className="h-10"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("financeColProviderRef")}</label>
              <Input
                value={manualForm.ref}
                onChange={(e) => setManualForm((f) => ({ ...f, ref: e.target.value }))}
                className="h-10 font-mono text-sm"
                placeholder={t("financeManualTxRefPlaceholder")}
              />
            </div>
          </div>
        </form>
      </AppModal>
    </AdminLayout>
  );
}
