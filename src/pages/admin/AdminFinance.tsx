import AdminLayout from "src/components/AdminLayout";
import AdminTableScroll from "src/components/AdminTableScroll";
import { useLang } from "src/lib/i18n";
import type { TranslationKey } from "src/lib/i18n";
import { Card } from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import { Input } from "src/components/ui/input";
import { Button } from "src/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "src/components/ui/dialog";
import DataTableToolbar from "src/components/DataTableToolbar";
import CsvExportButton from "src/components/CsvExportButton";
import PanelPageHeader from "src/components/PanelPageHeader";
import { Landmark, Wallet, TrendingUp, Clock, AlertCircle, BarChart3, Plus } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { branchNameById, useBranches } from "src/modules/branches";
import { useToast } from "src/lib/toast";
import { DEMO_STUDENTS, getStudentById } from "src/modules/admin/adminPeople";

type TxStatus = "completed" | "pending" | "failed" | "refunded";
type TxChannel = "online" | "pos" | "office" | "bank";
type TxMethod = "card" | "idram" | "cash" | "transfer";
type TxSource = "system" | "manual";

type FinanceTx = {
  id: string;
  createdAt: string;
  customer: string;
  email: string;
  /** Free-text line item (manual entry or imported description). */
  description: string;
  branchId: string;
  channel: TxChannel;
  method: TxMethod;
  grossAmd: number;
  feeAmd: number;
  status: TxStatus;
  providerRef: string;
  source: TxSource;
};

const MONTH_START = new Date(2026, 3, 1);
const MONTH_END = new Date(2026, 3, 30, 23, 59, 59, 999);

function formatAmd(n: number): string {
  return `${n.toLocaleString("en-US")} ֏`;
}

function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function newManualTxId(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const r = Math.floor(Math.random() * 900 + 100);
  return `TX-MAN-${y}${m}${day}-${r}`;
}

function parseAmdInput(raw: string): number {
  const n = Number.parseFloat(String(raw).replace(/[\s,]/g, ""));
  if (!Number.isFinite(n) || n < 0) return NaN;
  return Math.round(n);
}

const seedTransactions: FinanceTx[] = [
  {
    id: "TX-2026-0412",
    createdAt: "2026-04-06T10:14:00+04:00",
    customer: "Ani Karapetyan",
    email: "ani.k@example.com",
    description: "Standard package",
    branchId: "br-garegin-8",
    channel: "online",
    method: "card",
    grossAmd: 55000,
    feeAmd: 1650,
    status: "completed",
    providerRef: "ARCA-7F3A-99102",
    source: "system",
  },
  {
    id: "TX-2026-0411",
    createdAt: "2026-04-05T16:42:00+04:00",
    customer: "Tigran Mkhitaryan",
    email: "tigran.m@example.com",
    description: "Theory course cohort 12",
    branchId: "br-azatamart-75",
    channel: "online",
    method: "idram",
    grossAmd: 8000,
    feeAmd: 200,
    status: "completed",
    providerRef: "IDR-4482910",
    source: "system",
  },
  {
    id: "TX-2026-0410",
    createdAt: "2026-04-05T11:05:00+04:00",
    customer: "Nare Harutyunyan",
    email: "nare.h@example.com",
    description: "Extra lesson (1×)",
    branchId: "br-masis-125",
    channel: "pos",
    method: "card",
    grossAmd: 4000,
    feeAmd: 120,
    status: "completed",
    providerRef: "POS-YVN-22041",
    source: "system",
  },
  {
    id: "TX-2026-0409",
    createdAt: "2026-04-04T09:30:00+04:00",
    customer: "Suren Danielyan",
    email: "suren.d@example.com",
    description: "Premium package",
    branchId: "br-garegin-8",
    channel: "bank",
    method: "transfer",
    grossAmd: 72000,
    feeAmd: 0,
    status: "pending",
    providerRef: "INB-602884",
    source: "system",
  },
  {
    id: "TX-2026-0408",
    createdAt: "2026-04-03T14:18:00+04:00",
    customer: "Mane Poghosyan",
    email: "mane.p@example.com",
    description: "Exam fee",
    branchId: "br-azatamart-75",
    channel: "online",
    method: "card",
    grossAmd: 12000,
    feeAmd: 360,
    status: "failed",
    providerRef: "ARCA-DECL-88301",
    source: "system",
  },
  {
    id: "TX-2026-0407",
    createdAt: "2026-04-02T10:00:00+04:00",
    customer: "Gevorg Sargsyan",
    email: "gevorg.s@example.com",
    description: "Standard package",
    branchId: "br-masis-125",
    channel: "online",
    method: "idram",
    grossAmd: 55000,
    feeAmd: 1375,
    status: "refunded",
    providerRef: "IDR-RFD-99102",
    source: "system",
  },
  {
    id: "TX-2026-0406",
    createdAt: "2026-04-01T12:45:00+04:00",
    customer: "Lilit Vardanyan",
    email: "lilit.v@example.com",
    description: "Road test preparation",
    branchId: "br-garegin-8",
    channel: "office",
    method: "cash",
    grossAmd: 15000,
    feeAmd: 0,
    status: "completed",
    providerRef: "CASH-REG-14",
    source: "system",
  },
  {
    id: "TX-2026-0405",
    createdAt: "2026-04-01T08:20:00+04:00",
    customer: "Hayk Avetisyan",
    email: "hayk.a@example.com",
    description: "Theory course cohort 12",
    branchId: "br-azatamart-75",
    channel: "online",
    method: "card",
    grossAmd: 8000,
    feeAmd: 240,
    status: "completed",
    providerRef: "ARCA-7E2B-77420",
    source: "system",
  },
];

const statusClass: Record<TxStatus, string> = {
  completed: "bg-emerald-100 text-emerald-800",
  pending: "bg-amber-100 text-amber-800",
  failed: "bg-red-100 text-red-700",
  refunded: "bg-slate-200 text-slate-700",
};

function statusTKey(s: TxStatus): TranslationKey {
  switch (s) {
    case "completed":
      return "financeStatusCompleted";
    case "pending":
      return "financeStatusPending";
    case "failed":
      return "financeStatusFailed";
    case "refunded":
      return "financeStatusRefunded";
  }
}

function channelTKey(c: TxChannel): TranslationKey {
  switch (c) {
    case "online":
      return "financeChannelOnline";
    case "pos":
      return "financeChannelPos";
    case "office":
      return "financeChannelOffice";
    case "bank":
      return "financeChannelBank";
  }
}

function methodTKey(m: TxMethod): TranslationKey {
  switch (m) {
    case "card":
      return "financeMethodCard";
    case "idram":
      return "financeMethodIdram";
    case "cash":
      return "financeMethodCash";
    case "transfer":
      return "financeMethodTransfer";
  }
}

function netOf(tx: FinanceTx): number {
  return tx.grossAmd - tx.feeAmd;
}

type ManualForm = {
  /** When set, customer/email were filled from the student directory */
  studentDirectoryId: string;
  customer: string;
  email: string;
  description: string;
  branchId: string;
  channel: TxChannel;
  method: TxMethod;
  grossStr: string;
  feeStr: string;
  status: TxStatus;
  ref: string;
  datetimeLocal: string;
};

export default function AdminFinance() {
  const { t } = useLang();
  const { showToast } = useToast();
  const { branches } = useBranches();
  const [transactions, setTransactions] = useState<FinanceTx[]>(() => [...seedTransactions]);
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
  }));

  const resetManualForm = useCallback(
    (defaultBranchId: string) => {
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
      });
    },
    [],
  );

  const openManualDialog = () => {
    resetManualForm(branches[0]?.id ?? "");
    setManualOpen(true);
  };

  const submitManual = (e: React.FormEvent) => {
    e.preventDefault();
    const gross = parseAmdInput(manualForm.grossStr);
    const fee =
      manualForm.feeStr.trim() === "" ? 0 : parseAmdInput(manualForm.feeStr);
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

    const row: FinanceTx = {
      id: newManualTxId(),
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
    };

    setTransactions((prev) => [row, ...prev]);
    setManualOpen(false);
    showToast(t("financeManualTxRecordedToast"), "success");
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

  const kpis = useMemo(() => {
    const inMonth = (tx: FinanceTx) => {
      const d = new Date(tx.createdAt);
      return d >= MONTH_START && d <= MONTH_END;
    };
    const completedInMonth = transactions.filter((tx) => tx.status === "completed" && inMonth(tx));
    const grossMonth = completedInMonth.reduce((s, tx) => s + tx.grossAmd, 0);
    const netMonth = completedInMonth.reduce((s, tx) => s + netOf(tx), 0);
    const pendingTotal = transactions.filter((tx) => tx.status === "pending").reduce((s, tx) => s + netOf(tx), 0);
    const failedRefunded = transactions.filter((tx) => tx.status === "failed" || tx.status === "refunded");
    const failedRefundedGross = failedRefunded.reduce((s, tx) => s + tx.grossAmd, 0);
    const avgTicket =
      completedInMonth.length > 0 ? Math.round(grossMonth / completedInMonth.length) : 0;
    return {
      grossMonth,
      netMonth,
      pendingTotal,
      failedRefundedCount: failedRefunded.length,
      failedRefundedGross,
      avgTicket,
    };
  }, [transactions]);

  const kpiCards = [
    {
      labelKey: "adminFinanceKpiGrossMonth" as const,
      value: formatAmd(kpis.grossMonth),
      icon: Wallet,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      labelKey: "adminFinanceKpiNetMonth" as const,
      value: formatAmd(kpis.netMonth),
      icon: TrendingUp,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      labelKey: "adminFinanceKpiPendingSettlement" as const,
      value: formatAmd(kpis.pendingTotal),
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-500/10",
    },
    {
      labelKey: "adminFinanceKpiFailedRefunded" as const,
      value: `${kpis.failedRefundedCount} · ${formatAmd(kpis.failedRefundedGross)}`,
      icon: AlertCircle,
      color: "text-red-600",
      bg: "bg-red-500/10",
    },
    {
      labelKey: "adminFinanceKpiAvgTicket" as const,
      value: formatAmd(kpis.avgTicket),
      icon: BarChart3,
      color: "text-primary",
      bg: "bg-primary/10",
    },
  ];

  return (
    <AdminLayout>
      <PanelPageHeader
        icon={Landmark}
        title={t("adminFinance")}
        subtitle={t("adminFinancePageSubtitle")}
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

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-8">
        {kpiCards.map((k, i) => (
          <Card key={i} className="p-5 border-border">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground mb-1 leading-snug">{t(k.labelKey)}</p>
                <p className="text-lg font-bold text-foreground tabular-nums break-words">{k.value}</p>
              </div>
              <div className={`w-10 h-10 ${k.bg} rounded-xl flex items-center justify-center shrink-0`}>
                <k.icon className={`w-5 h-5 ${k.color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="border-border overflow-hidden min-w-0">
        <div className="p-5 border-b border-border">
          <h3 className="font-semibold text-foreground">{t("adminFinanceTransactionsTitle")}</h3>
        </div>
        <DataTableToolbar value={search} onChange={setSearch} placeholder={`${t("search")}…`}>
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground min-w-0 w-full sm:min-w-[11rem] sm:w-auto"
            aria-label={t("filterByBranch")}
          >
            <option value="all">{t("adminBranchFilterAll")}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | TxStatus)}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground min-w-0 w-full sm:min-w-[10rem] sm:w-auto"
            aria-label={t("filterByStatus")}
          >
            <option value="all">{t("filterOptionAll")}</option>
            <option value="completed">{t("financeStatusCompleted")}</option>
            <option value="pending">{t("financeStatusPending")}</option>
            <option value="failed">{t("financeStatusFailed")}</option>
            <option value="refunded">{t("financeStatusRefunded")}</option>
          </select>
          <CsvExportButton
            filename="admin-finance-transactions.csv"
            headers={[
              t("tableColId"),
              t("financeColSource"),
              t("financeColDateTime"),
              t("financeColCustomer"),
              t("accountsColEmail"),
              t("financeColProduct"),
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
              tx.id,
              tx.source === "manual" ? t("financeOriginManual") : t("financeOriginSystem"),
              new Date(tx.createdAt).toLocaleString(),
              tx.customer,
              tx.email,
              tx.description,
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
          <table className="w-full text-sm min-w-[80rem]">
            <thead className="bg-muted/40">
              <tr>
                {[
                  t("tableColId"),
                  t("financeColSource"),
                  t("financeColDateTime"),
                  t("financeColCustomer"),
                  t("accountsColEmail"),
                  t("financeColProduct"),
                  t("adminColBranch"),
                  t("financeColChannel"),
                  t("financeColMethod"),
                  t("financeColGross"),
                  t("financeColFee"),
                  t("financeColNet"),
                  t("status"),
                  t("financeColProviderRef"),
                ].map((h, i) => (
                  <th
                    key={i}
                    className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-4 py-10 text-center text-sm text-muted-foreground">
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
                    <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap max-w-[10rem] truncate" title={branchNameById(branches, tx.branchId)}>
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

      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="max-w-lg max-h-[min(90vh,720px)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("financeManualEntryTitle")}</DialogTitle>
            <DialogDescription>{t("financeManualEntrySubtitle")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitManual} className="space-y-4 mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("financeManualSelectStudentPlaceholder")}</label>
                <select
                  value={manualForm.studentDirectoryId}
                  onChange={(e) => {
                    const id = e.target.value;
                    if (!id) {
                      setManualForm((f) => ({ ...f, studentDirectoryId: "" }));
                      return;
                    }
                    const s = getStudentById(id);
                    setManualForm((f) => ({
                      ...f,
                      studentDirectoryId: id,
                      customer: s?.name ?? "",
                      email: s?.email ?? "",
                    }));
                  }}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">—</option>
                  {DEMO_STUDENTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
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
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setManualOpen(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">
                {t("save")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
