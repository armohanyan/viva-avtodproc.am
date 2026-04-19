import AdminLayout from "src/components/AdminLayout";
import AdminTableScroll from "src/components/AdminTableScroll";
import AdminTableRowActions, { AdminTableRowContextMenu } from "src/components/AdminTableRowActions";
import { useLang, type TranslationKey } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { formatShortDateFromIso, todayIsoDate } from "src/lib/adminFormat";
import { Card } from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import { Input } from "src/components/ui/input";
import { Button } from "src/components/ui/button";
import { AppModal } from "src/components/AppModal";
import ConfirmDialog from "src/components/ConfirmDialog";
import DataTableToolbar from "src/components/DataTableToolbar";
import CsvExportButton from "src/components/CsvExportButton";
import TableColumnFilter, { TableColumnHeaderWithFilter } from "src/components/TableColumnFilter";
import PanelPageHeader from "src/components/PanelPageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "src/components/ui/tabs";
import { Plus, Edit2, Trash2, CalendarRange } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { formatBookingSlotRangeLabel } from "src/data/studentDemoBookings";
import { branchNameById, DEFAULT_PRIMARY_BRANCH_ID, useBranches } from "src/modules/branches";
import { allInstructorNames } from "src/modules/admin/adminPeople";
import { useInstructors } from "src/modules/instructors/useInstructors";
import {
  type FinanceTx,
  type TxChannel,
  type TxMethod,
  type TxStatus,
  channelTKey,
  formatAmd,
  methodTKey,
  parseAmdInput,
  toDatetimeLocalValue,
} from "./finance/adminFinanceShared";

type StudentRow = { id: string; name: string; email?: string };

type Booking = {
  id: string;
  studentId: string;
  instructorName: string;
  dateIso: string;
  time: string;
  endTime?: string | null;
  totalPriceAmd?: number | null;
  type: "practical" | "theory";
  status: string;
  branchId: string;
};

/** Canonical booking statuses; coerce legacy API/DB values for labels and filters. */
type CanonicalBookingStatus = "confirmed" | "pending" | "cancelled" | "refunded";

function toCanonicalBookingStatus(raw: string): CanonicalBookingStatus {
  if (raw === "confirmed" || raw === "pending" || raw === "cancelled" || raw === "refunded") return raw;
  if (raw === "completed") return "confirmed";
  if (raw === "pending_prebook" || raw === "pending_payment") return "pending";
  return "pending";
}

const statusColor: Record<CanonicalBookingStatus, string> = {
  confirmed: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  cancelled: "bg-red-100 text-red-600",
  refunded: "bg-slate-200 text-slate-700",
};
const typeColor: Record<string, string> = {
  practical: "bg-blue-100 text-blue-700",
  theory: "bg-purple-100 text-purple-700",
};

type BookingPaymentFields = {
  description: string;
  channel: TxChannel;
  method: TxMethod;
  grossStr: string;
  feeStr: string;
  status: TxStatus;
  ref: string;
  datetimeLocal: string;
};

function defaultPaymentFields(): BookingPaymentFields {
  return {
    description: "",
    channel: "office",
    method: "cash",
    grossStr: "",
    feeStr: "0",
    status: "completed",
    ref: "",
    datetimeLocal: toDatetimeLocalValue(new Date()),
  };
}

function paymentDescriptionLine(b: Pick<Booking, "type" | "dateIso" | "id">): string {
  const typeEn = b.type === "theory" ? "Theory" : "Practical";
  return b.id ? `${typeEn} lesson ${b.dateIso} · #${b.id}` : `${typeEn} lesson ${b.dateIso}`;
}

function studentContact(students: StudentRow[], studentId: string): { name: string; email: string } {
  const s = students.find((x) => x.id === studentId);
  return { name: s?.name ?? "", email: (s?.email ?? "").trim() };
}

export default function AdminBookings() {
  const editBookingFormId = useId();
  const addBookingFormId = useId();
  const { t, lang } = useLang();
  const { showToast } = useToast();
  const { branches } = useBranches();
  const { instructors } = useInstructors();
  const instructorNames = useMemo(() => allInstructorNames(instructors), [instructors]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [studentNames, setStudentNames] = useState<Record<string, string>>({});
  const [studentsMini, setStudentsMini] = useState<StudentRow[]>([]);
  const [financeTxs, setFinanceTxs] = useState<FinanceTx[]>([]);

  const studentLabel = useCallback((id: string) => studentNames[id] ?? id, [studentNames]);

  const refresh = useCallback(async () => {
    try {
      const [bk, st, fin] = await Promise.all([
        vivaApiJson<Booking[]>("/bookings"),
        vivaApiJson<StudentRow[]>("/students"),
        vivaApiJson<FinanceTx[]>("/finance/transactions"),
      ]);
      setBookings(Array.isArray(bk) ? bk : []);
      const m: Record<string, string> = {};
      if (Array.isArray(st)) {
        setStudentsMini(st.map((r) => ({ id: r.id, name: r.name, email: r.email })));
        for (const r of st) m[r.id] = r.name;
      } else {
        setStudentsMini([]);
      }
      setStudentNames(m);
      setFinanceTxs(
        Array.isArray(fin) ? fin.map((tx) => ({ ...tx, bookingId: tx.bookingId ?? null })) : [],
      );
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    }
  }, [showToast]);

  useEffect(() => {
    void refresh();
  }, [refresh]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [lessonTypeFilter, setLessonTypeFilter] = useState<"all" | "practical" | "theory">("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editBooking, setEditBooking] = useState<Booking | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState<Booking | null>(null);
  const [bookingModalTab, setBookingModalTab] = useState<"booking" | "payment">("booking");
  const [addPayment, setAddPayment] = useState<BookingPaymentFields>(() => defaultPaymentFields());
  const [editPayment, setEditPayment] = useState<BookingPaymentFields>(() => defaultPaymentFields());
  /** Manual finance row id when editing a booking that already has a manual payment. */
  const [editManualTxId, setEditManualTxId] = useState<number | null>(null);
  /** When set, booking has a system-generated payment — show notice instead of form. */
  const [editSystemPayment, setEditSystemPayment] = useState<FinanceTx | null>(null);

  const openAdd = () => {
    const newDraft: Booking = {
      id: "",
      studentId: studentsMini[0]?.id ?? "",
      instructorName: instructorNames[0] ?? "",
      dateIso: todayIsoDate(),
      time: "10:00",
      type: "practical",
      status: "confirmed",
      branchId: branches[0]?.id ?? DEFAULT_PRIMARY_BRANCH_ID,
    };
    setDraft(newDraft);
    setAddPayment({
      ...defaultPaymentFields(),
      description: paymentDescriptionLine(newDraft),
    });
    setBookingModalTab("booking");
    setAddOpen(true);
  };

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      const q = search.trim().toLowerCase();
      const branchLabel = branchNameById(branches, b.branchId);
      const stu = studentLabel(b.studentId);
      const dateLabel = formatShortDateFromIso(b.dateIso, lang);
      const timeLabel = formatBookingSlotRangeLabel(b.time, b.endTime);
      const hay = [b.id, stu, b.instructorName, dateLabel, timeLabel, b.time, b.type, b.status, branchLabel].join(" ").toLowerCase();
      const matchSearch = !q || hay.includes(q);
      const matchStatus = statusFilter === "all" || toCanonicalBookingStatus(b.status) === statusFilter;
      const matchBranch = branchFilter === "all" || b.branchId === branchFilter;
      const matchLessonType = lessonTypeFilter === "all" || b.type === lessonTypeFilter;
      return matchSearch && matchStatus && matchBranch && matchLessonType;
    });
  }, [bookings, search, statusFilter, branchFilter, lessonTypeFilter, branches, lang, studentLabel]);

  useEffect(() => {
    if (!editBooking) {
      setEditManualTxId(null);
      setEditSystemPayment(null);
      return;
    }
    const bid = String(editBooking.id);
    const linked = financeTxs.filter((tx) => tx.bookingId === bid);
    const manual = linked.find((x) => x.source === "manual");
    const system = linked.find((x) => x.source === "system");
    if (manual) {
      setEditManualTxId(manual.id);
      setEditSystemPayment(null);
      setEditPayment({
        description: manual.description,
        channel: manual.channel,
        method: manual.method,
        grossStr: String(manual.grossAmd),
        feeStr: String(manual.feeAmd),
        status: manual.status,
        ref: manual.providerRef === "—" ? "" : manual.providerRef,
        datetimeLocal: toDatetimeLocalValue(new Date(manual.createdAt)),
      });
    } else if (system) {
      setEditManualTxId(null);
      setEditSystemPayment(system);
      const gross =
        editBooking.totalPriceAmd != null && editBooking.totalPriceAmd > 0 ? String(editBooking.totalPriceAmd) : "";
      setEditPayment({
        ...defaultPaymentFields(),
        description: paymentDescriptionLine(editBooking),
        grossStr: gross,
      });
    } else {
      setEditManualTxId(null);
      setEditSystemPayment(null);
      const gross =
        editBooking.totalPriceAmd != null && editBooking.totalPriceAmd > 0 ? String(editBooking.totalPriceAmd) : "";
      setEditPayment({
        ...defaultPaymentFields(),
        description: paymentDescriptionLine(editBooking),
        grossStr: gross,
      });
    }
  }, [editBooking, financeTxs]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await vivaApiJson(`/bookings/${encodeURIComponent(deleteId)}`, { method: "DELETE" });
      setDeleteId(null);
      await refresh();
      showToast(t("bookingCancelledMsg"), "success");
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    }
  };

  const validatePaymentForSubmit = (
    payment: BookingPaymentFields,
    studentId: string,
    requireAmount: boolean,
  ): boolean => {
    const gross = parseAmdInput(payment.grossStr);
    const fee = payment.feeStr.trim() === "" ? 0 : parseAmdInput(payment.feeStr);
    if (!Number.isFinite(gross) || gross <= 0) {
      if (requireAmount) {
        showToast(t("financeManualErrorAmount"), "error");
        return false;
      }
      return true;
    }
    if (!payment.description.trim()) {
      showToast(t("financeManualErrorRequired"), "error");
      return false;
    }
    if (!Number.isFinite(fee) || fee < 0 || fee > gross) {
      showToast(t("financeManualErrorFee"), "error");
      return false;
    }
    const created = new Date(payment.datetimeLocal);
    if (Number.isNaN(created.getTime())) {
      showToast(t("financeManualErrorDate"), "error");
      return false;
    }
    const { name } = studentContact(studentsMini, studentId);
    if (!name.trim()) {
      showToast(t("financeManualErrorRequired"), "error");
      return false;
    }
    return true;
  };

  const postManualFinance = async (payment: BookingPaymentFields, ctx: { studentId: string; branchId: string; bookingIdNum: number }) => {
    const gross = parseAmdInput(payment.grossStr);
    const fee = payment.feeStr.trim() === "" ? 0 : parseAmdInput(payment.feeStr);
    const created = new Date(payment.datetimeLocal);
    const { name, email } = studentContact(studentsMini, ctx.studentId);
    await vivaApiJson("/finance/transactions", {
      method: "POST",
      body: {
        createdAt: created.toISOString(),
        customer: name.trim(),
        email: email.trim(),
        description: payment.description.trim(),
        branchId: Number(ctx.branchId),
        channel: payment.channel,
        method: payment.method,
        grossAmd: gross,
        feeAmd: fee,
        status: payment.status,
        providerRef: payment.ref.trim() || "—",
        source: "manual",
        bookingId: ctx.bookingIdNum,
      },
    });
  };

  const patchManualFinance = async (txId: number, payment: BookingPaymentFields, ctx: { studentId: string; branchId: string; bookingIdNum: number }) => {
    const gross = parseAmdInput(payment.grossStr);
    const fee = payment.feeStr.trim() === "" ? 0 : parseAmdInput(payment.feeStr);
    const created = new Date(payment.datetimeLocal);
    const { name, email } = studentContact(studentsMini, ctx.studentId);
    await vivaApiJson(`/finance/transactions/${encodeURIComponent(String(txId))}`, {
      method: "PATCH",
      body: {
        customer: name.trim(),
        email: email.trim(),
        description: payment.description.trim(),
        branchId: Number(ctx.branchId),
        channel: payment.channel,
        method: payment.method,
        grossAmd: gross,
        feeAmd: fee,
        status: payment.status,
        providerRef: payment.ref.trim() || "—",
        createdAt: created.toISOString(),
        bookingId: ctx.bookingIdNum,
      },
    });
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBooking) return;
    try {
      await vivaApiJson(`/bookings/${encodeURIComponent(editBooking.id)}`, {
        method: "PATCH",
        body: {
          studentId: editBooking.studentId,
          instructorName: editBooking.instructorName,
          dateIso: editBooking.dateIso,
          time: editBooking.time,
          type: editBooking.type,
          status: editBooking.status,
          branchId: editBooking.branchId,
        },
      });
      const bookingIdNum = Number(editBooking.id);
      if (!editSystemPayment) {
        const gross = parseAmdInput(editPayment.grossStr);
        const wantsNewOrUpdate = editManualTxId != null || (Number.isFinite(gross) && gross > 0);
        if (wantsNewOrUpdate) {
          const ok = validatePaymentForSubmit(editPayment, editBooking.studentId, editManualTxId != null);
          if (!ok) return;
          if (editManualTxId != null) {
            await patchManualFinance(editManualTxId, editPayment, {
              studentId: editBooking.studentId,
              branchId: editBooking.branchId,
              bookingIdNum,
            });
          } else {
            await postManualFinance(editPayment, {
              studentId: editBooking.studentId,
              branchId: editBooking.branchId,
              bookingIdNum,
            });
          }
        }
      }
      setEditBooking(null);
      setBookingModalTab("booking");
      await refresh();
      showToast(t("bookingUpdatedToast"), "success");
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    if (!draft.studentId || !draft.instructorName || !draft.dateIso) {
      showToast(t("fillRequired"), "error");
      return;
    }
    const gross = parseAmdInput(addPayment.grossStr);
    const wantsPayment = Number.isFinite(gross) && gross > 0;
    if (wantsPayment) {
      const ok = validatePaymentForSubmit(addPayment, draft.studentId, true);
      if (!ok) return;
    }
    try {
      const created = await vivaApiJson<{ id: number }>("/bookings", {
        method: "POST",
        body: {
          studentId: draft.studentId,
          instructorName: draft.instructorName,
          dateIso: draft.dateIso,
          time: draft.time,
          type: draft.type,
          status: draft.status,
          branchId: draft.branchId,
        },
      });
      const bookingIdNum = Number(created.id);
      if (wantsPayment && Number.isFinite(bookingIdNum) && bookingIdNum > 0) {
        await postManualFinance(addPayment, {
          studentId: draft.studentId,
          branchId: draft.branchId,
          bookingIdNum,
        });
      }
      setAddOpen(false);
      setDraft(null);
      setBookingModalTab("booking");
      await refresh();
      showToast(t("bookingCreatedToast"), "success");
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    }
  };

  const renderPaymentFields = (
    payment: BookingPaymentFields,
    setPayment: React.Dispatch<React.SetStateAction<BookingPaymentFields>>,
  ) => (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">{t("adminBookingPaymentOptionalHint")}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-muted-foreground mb-1">{t("financeColProduct")}</label>
          <Input
            value={payment.description}
            onChange={(e) => setPayment((p) => ({ ...p, description: e.target.value }))}
            className="h-10"
            placeholder={t("financeManualTxDescriptionPlaceholder")}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-muted-foreground mb-1">{t("financeColChannel")}</label>
          <select
            value={payment.channel}
            onChange={(e) => setPayment((p) => ({ ...p, channel: e.target.value as TxChannel }))}
            className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="office">{t("financeChannelOffice")}</option>
            <option value="pos">{t("financeChannelPos")}</option>
            <option value="online">{t("financeChannelOnline")}</option>
            <option value="bank">{t("financeChannelBank")}</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-muted-foreground mb-1">{t("financeColMethod")}</label>
          <select
            value={payment.method}
            onChange={(e) => setPayment((p) => ({ ...p, method: e.target.value as TxMethod }))}
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
            value={payment.grossStr}
            onChange={(e) => setPayment((p) => ({ ...p, grossStr: e.target.value }))}
            className="h-10 tabular-nums"
            placeholder="55000"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">{t("financeManualTxFeeLabel")}</label>
          <Input
            inputMode="decimal"
            value={payment.feeStr}
            onChange={(e) => setPayment((p) => ({ ...p, feeStr: e.target.value }))}
            className="h-10 tabular-nums"
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">{t("status")}</label>
          <select
            value={payment.status}
            onChange={(e) => setPayment((p) => ({ ...p, status: e.target.value as TxStatus }))}
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
            value={payment.datetimeLocal}
            onChange={(e) => setPayment((p) => ({ ...p, datetimeLocal: e.target.value }))}
            className="h-10"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-muted-foreground mb-1">{t("financeColProviderRef")}</label>
          <Input
            value={payment.ref}
            onChange={(e) => setPayment((p) => ({ ...p, ref: e.target.value }))}
            className="h-10 font-mono text-sm"
            placeholder={t("financeManualTxRefPlaceholder")}
          />
        </div>
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <PanelPageHeader
        icon={CalendarRange}
        title={t("bookings")}
        subtitle={t("adminBookingsPageSubtitle")}
        actions={
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2" onClick={openAdd}>
            <Plus className="w-4 h-4" />
            {t("addNew")}
          </Button>
        }
      />

      <Card className="border-border overflow-hidden min-w-0">
        <DataTableToolbar value={search} onChange={setSearch} placeholder={`${t("search")}…`}>
          <CsvExportButton
            filename="admin-bookings.csv"
            headers={[
              t("tableColId"),
              t("bookingColStudent"),
              t("adminColBranch"),
              t("cohortColInstructor"),
              t("date"),
              t("bookingColTime"),
              t("bookingColType"),
              t("status"),
            ]}
            rows={filtered.map((b) => [
              b.id,
              studentLabel(b.studentId),
              branchNameById(branches, b.branchId),
              b.instructorName,
              formatShortDateFromIso(b.dateIso, lang),
              formatBookingSlotRangeLabel(b.time, b.endTime),
              t(b.type === "theory" ? "lessonTypeTheory" : "lessonTypePractical"),
              t(toCanonicalBookingStatus(b.status) as TranslationKey),
            ])}
          />
        </DataTableToolbar>

        <AdminTableScroll>
          <table className="w-full text-sm min-w-[56rem]">
            <thead className="bg-muted/40">
              <tr>
                <TableColumnHeaderWithFilter title={t("tableColId")} />
                <TableColumnHeaderWithFilter title={t("bookingColStudent")} />
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
                <TableColumnHeaderWithFilter title={t("cohortColInstructor")} />
                <TableColumnHeaderWithFilter title={t("date")} />
                <TableColumnHeaderWithFilter title={t("bookingColTime")} />
                <TableColumnHeaderWithFilter
                  title={t("bookingColType")}
                  filter={
                    <TableColumnFilter
                      value={lessonTypeFilter}
                      onChange={(v) => setLessonTypeFilter(v as "all" | "practical" | "theory")}
                      ariaLabel={t("filterByType")}
                      options={[
                        { value: "all", label: t("filterOptionAll") },
                        { value: "practical", label: t("lessonTypePractical") },
                        { value: "theory", label: t("lessonTypeTheory") },
                      ]}
                    />
                  }
                />
                <TableColumnHeaderWithFilter
                  title={t("status")}
                  filter={
                    <TableColumnFilter
                      value={statusFilter}
                      onChange={setStatusFilter}
                      ariaLabel={t("filterByStatus")}
                      options={[
                        { value: "all", label: t("filterOptionAll") },
                        { value: "confirmed", label: t("confirmed") },
                        { value: "pending", label: t("pending") },
                        { value: "cancelled", label: t("cancelled") },
                        { value: "refunded", label: t("refunded") },
                      ]}
                    />
                  }
                />
                <TableColumnHeaderWithFilter title={t("actions")} align="end" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((b, i) => (
                <AdminTableRowContextMenu
                  key={i}
                  actions={[
                    {
                      kind: "item",
                      id: "edit",
                      label: t("edit"),
                      icon: Edit2,
                      onClick: () => {
                        setBookingModalTab("booking");
                        setEditBooking({ ...b, status: toCanonicalBookingStatus(b.status) });
                      },
                    },
                    {
                      kind: "item",
                      id: "delete",
                      label: t("delete"),
                      icon: Trash2,
                      destructive: true,
                      onClick: () => setDeleteId(b.id),
                    },
                  ]}
                >
                  <tr className="hover:bg-muted/30">
                    <td className="px-4 py-3.5 text-muted-foreground text-xs font-mono whitespace-nowrap">{b.id}</td>
                    <td className="px-4 py-3.5 font-medium text-foreground whitespace-nowrap">{studentLabel(b.studentId)}</td>
                    <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap max-w-[10rem] truncate" title={branchNameById(branches, b.branchId)}>
                      {branchNameById(branches, b.branchId)}
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">{b.instructorName}</td>
                    <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">{formatShortDateFromIso(b.dateIso, lang)}</td>
                    <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">
                      <span className="block">{formatBookingSlotRangeLabel(b.time, b.endTime)}</span>
                      {b.totalPriceAmd != null && b.totalPriceAmd > 0 ? (
                        <span className="text-xs text-muted-foreground/80">{b.totalPriceAmd.toLocaleString()} ֏</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge className={`text-xs ${typeColor[b.type]}`}>{t(b.type === "theory" ? "lessonTypeTheory" : "lessonTypePractical")}</Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge
                        className={`text-xs ${statusColor[toCanonicalBookingStatus(b.status)] ?? statusColor.pending}`}
                      >
                        {t(toCanonicalBookingStatus(b.status) as TranslationKey)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <AdminTableRowActions
                        toolbarOnly
                        actions={[
                          {
                            kind: "item",
                            id: "edit",
                            label: t("edit"),
                            icon: Edit2,
                            onClick: () => {
                              setBookingModalTab("booking");
                              setEditBooking({ ...b, status: toCanonicalBookingStatus(b.status) });
                            },
                          },
                          {
                            kind: "item",
                            id: "delete",
                            label: t("delete"),
                            icon: Trash2,
                            destructive: true,
                            onClick: () => setDeleteId(b.id),
                          },
                        ]}
                      />
                    </td>
                  </tr>
                </AdminTableRowContextMenu>
              ))}
            </tbody>
          </table>
        </AdminTableScroll>
        <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
          {t("panelShowingLabel")} {filtered.length} / {bookings.length} {t("bookings")}
        </div>
      </Card>

      <AppModal
        open={!!editBooking}
        onOpenChange={(o) => {
          if (!o) {
            setEditBooking(null);
            setBookingModalTab("booking");
          }
        }}
        title={t("bookingDialogEditTitle")}
        contentClassName="max-w-2xl w-[min(100%,42rem)] max-h-[min(92vh,880px)]"
        footer={
          editBooking ? (
            <div className="flex gap-2 sm:gap-3 flex-1 min-w-0 w-full">
              <Button type="button" variant="outline" className="flex-1 min-w-0" onClick={() => setEditBooking(null)}>
                {t("cancel")}
              </Button>
              <Button type="submit" form={editBookingFormId} className="flex-1 min-w-0 bg-primary hover:bg-primary/90 text-primary-foreground">
                {t("save")}
              </Button>
            </div>
          ) : null
        }
      >
        {editBooking && (
          <form id={editBookingFormId} onSubmit={handleEdit} className="space-y-4">
            <Tabs value={bookingModalTab} onValueChange={(v) => setBookingModalTab(v as "booking" | "payment")}>
              <TabsList className="grid w-full grid-cols-2 h-11">
                <TabsTrigger value="booking" className="text-sm">
                  {t("adminBookingModalTabBooking")}
                </TabsTrigger>
                <TabsTrigger value="payment" className="text-sm">
                  {t("adminBookingModalTabPayment")}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="booking" className="mt-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">{t("bookingColStudent")}</label>
                  <select
                    value={editBooking.studentId}
                    onChange={(e) => setEditBooking({ ...editBooking, studentId: e.target.value })}
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {studentsMini.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">{t("adminSelectBranch")}</label>
                  <select
                    value={editBooking.branchId}
                    onChange={(e) => setEditBooking({ ...editBooking, branchId: e.target.value })}
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {branches.map((br) => (
                      <option key={br.id} value={br.id}>
                        {br.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">{t("cohortColInstructor")}</label>
                  <select
                    value={editBooking.instructorName}
                    onChange={(e) => setEditBooking({ ...editBooking, instructorName: e.target.value })}
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {instructorNames.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">{t("bookingColType")}</label>
                  <select
                    value={editBooking.type}
                    onChange={(e) => setEditBooking({ ...editBooking, type: e.target.value as "practical" | "theory" })}
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="practical">{t("lessonTypePractical")}</option>
                    <option value="theory">{t("lessonTypeTheory")}</option>
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">{t("date")}</label>
                    <Input type="date" value={editBooking.dateIso} onChange={(e) => setEditBooking({ ...editBooking, dateIso: e.target.value })} className="h-10" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">{t("bookingColTime")}</label>
                    <Input type="time" value={editBooking.time} onChange={(e) => setEditBooking({ ...editBooking, time: e.target.value })} className="h-10" step={60} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">{t("status")}</label>
                  <select
                    value={editBooking.status}
                    onChange={(e) => setEditBooking({ ...editBooking, status: e.target.value })}
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="confirmed">{t("confirmed")}</option>
                    <option value="pending">{t("pending")}</option>
                    <option value="cancelled">{t("cancelled")}</option>
                    <option value="refunded">{t("refunded")}</option>
                  </select>
                </div>
              </TabsContent>
              <TabsContent value="payment" className="mt-4">
                {editSystemPayment ? (
                  <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-foreground">
                    <p>{t("adminBookingPaymentSystemLinked")}</p>
                    <p className="text-xs text-muted-foreground mt-2 tabular-nums">
                      {formatAmd(editSystemPayment.grossAmd)} · {t(channelTKey(editSystemPayment.channel))} ·{" "}
                      {t(methodTKey(editSystemPayment.method))}
                    </p>
                  </div>
                ) : (
                  renderPaymentFields(editPayment, setEditPayment)
                )}
              </TabsContent>
            </Tabs>
          </form>
        )}
      </AppModal>

      <AppModal
        open={addOpen}
        onOpenChange={(o) => {
          setAddOpen(o);
          if (!o) {
            setDraft(null);
            setBookingModalTab("booking");
          }
        }}
        title={t("bookingDialogAddTitle")}
        contentClassName="max-w-2xl w-[min(100%,42rem)] max-h-[min(92vh,880px)]"
        footer={
          draft ? (
            <div className="flex gap-3 w-full">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" form={addBookingFormId} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">
                {t("addNew")}
              </Button>
            </div>
          ) : null
        }
      >
        {draft && (
          <form id={addBookingFormId} onSubmit={handleAdd} className="space-y-4">
            <Tabs value={bookingModalTab} onValueChange={(v) => setBookingModalTab(v as "booking" | "payment")}>
              <TabsList className="grid w-full grid-cols-2 h-11">
                <TabsTrigger value="booking" className="text-sm">
                  {t("adminBookingModalTabBooking")}
                </TabsTrigger>
                <TabsTrigger value="payment" className="text-sm">
                  {t("adminBookingModalTabPayment")}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="booking" className="mt-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">{t("bookingColStudent")}</label>
                  <select
                    value={draft.studentId}
                    onChange={(e) => setDraft({ ...draft, studentId: e.target.value })}
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {studentsMini.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">{t("adminSelectBranch")}</label>
                  <select
                    value={draft.branchId}
                    onChange={(e) => setDraft({ ...draft, branchId: e.target.value })}
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {branches.map((br) => (
                      <option key={br.id} value={br.id}>
                        {br.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">{t("cohortColInstructor")}</label>
                  <select
                    value={draft.instructorName}
                    onChange={(e) => setDraft({ ...draft, instructorName: e.target.value })}
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {instructorNames.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">{t("bookingColType")}</label>
                  <select
                    value={draft.type}
                    onChange={(e) => {
                      const type = e.target.value as "practical" | "theory";
                      const next = { ...draft, type };
                      setDraft(next);
                      setAddPayment((p) => ({ ...p, description: paymentDescriptionLine(next) }));
                    }}
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="practical">{t("lessonTypePractical")}</option>
                    <option value="theory">{t("lessonTypeTheory")}</option>
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">{t("date")}</label>
                    <Input
                      type="date"
                      value={draft.dateIso}
                      onChange={(e) => {
                        const dateIso = e.target.value;
                        const next = { ...draft, dateIso };
                        setDraft(next);
                        setAddPayment((p) => ({ ...p, description: paymentDescriptionLine(next) }));
                      }}
                      className="h-10"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">{t("bookingColTime")}</label>
                    <Input type="time" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} className="h-10" step={60} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">{t("status")}</label>
                  <select
                    value={draft.status}
                    onChange={(e) => setDraft({ ...draft, status: e.target.value })}
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="confirmed">{t("confirmed")}</option>
                    <option value="pending">{t("pending")}</option>
                    <option value="cancelled">{t("cancelled")}</option>
                    <option value="refunded">{t("refunded")}</option>
                  </select>
                </div>
              </TabsContent>
              <TabsContent value="payment" className="mt-4">
                {renderPaymentFields(addPayment, setAddPayment)}
              </TabsContent>
            </Tabs>
          </form>
        )}
      </AppModal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title={t("bookingCancelTitle")}
        description={t("bookingCancelDesc")}
        confirmLabel={t("delete")}
        danger
      />
    </AdminLayout>
  );
}
