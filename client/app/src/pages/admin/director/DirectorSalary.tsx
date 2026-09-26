import DirectorLayout from "src/modules/director/DirectorLayout";
import DirectorDynamicSelect from "src/modules/director/components/DirectorDynamicSelect";
import DirectorDateFilters, {
  useDirectorDateRange,
  useDirectorReload,
} from "src/modules/director/components/DirectorDateFilters";
import DirectorAddRecordButton from "src/modules/director/components/DirectorAddRecordButton";
import DirectorRecordFormDialog from "src/modules/director/components/DirectorRecordFormDialog";
import DirectorRecordActions from "src/modules/director/components/DirectorRecordActions";
import DirectorSectionNav, { useDirectorSectionView } from "src/modules/director/components/DirectorSectionNav";
import DirectorDataTable from "src/modules/director/components/DirectorDataTable";
import PanelPageHeader from "src/components/PanelPageHeader";
import TableSkeletonRows from "src/components/TableSkeletonRows";
import AdminTableScroll from "src/components/AdminTableScroll";
import DataTableToolbar from "src/components/DataTableToolbar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "src/components/ui/dialog";
import {
  DirectorButton,
  DirectorField,
  DirectorInput,
  DirectorSelect,
  DirectorStatCard,
  DirectorStatGrid,
  DirectorTableBody,
  DirectorTableHead,
  DirectorTableRow,
  DirectorTableTd,
  DirectorTableTh,
  DirectorTableWrap,
  DirectorTextarea,
} from "src/modules/director/components/DirectorUi";
import {
  createDirectorSalary,
  createDirectorSalaryAdjustment,
  createDirectorSalaryCardTransfer,
  createDirectorSalaryPayment,
  deleteDirectorSalary,
  deleteDirectorSalaryCardTransfer,
  deleteDirectorSalaryPayment,
  fetchDirectorSalaries,
  fetchDirectorSalaryCardTransfers,
  fetchDirectorSalaryLessons,
  fetchDirectorSalaryPayments,
  fetchDirectorSalaryReport,
  markDirectorSalaryPaymentPaid,
  updateDirectorSalary,
  updateDirectorSalaryCardTransfer,
} from "src/modules/director/director.api";
import {
  defaultDirectorSalaryPeriod,
  DIRECTOR_OPTION_CATEGORY,
  isLegacyDirectorRecord,
  todayIso,
} from "src/modules/director/director.consts";
import type {
  DirectorPayrollStatus,
  DirectorSalary,
  DirectorSalaryAdjustment,
  DirectorSalaryCardTransfer,
  DirectorSalaryEmployeeKind,
  DirectorSalaryEmployeeRow,
  DirectorSalaryLessonPaymentBucket,
  DirectorSalaryLessons,
  DirectorSalaryPayment,
  DirectorSalaryReport,
} from "src/modules/director/director.types";
import { formatAmd, parseAmdInput } from "src/pages/admin/finance/adminFinanceShared";
import {
  directorAmd,
  directorDate,
  directorDecimal,
  directorOptionalComment,
  directorText,
} from "src/modules/director/directorFormValues";
import { useDirectorTable } from "src/modules/director/useDirectorTable";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { useToast } from "src/lib/toast";
import { halfMonthPeriod, previousHalfMonthPeriod } from "src/utils/halfMonthPeriod.utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Banknote } from "lucide-react";
import { cn } from "src/lib/utils";
import type { Instructor } from "src/data/instructors";
import { useBranches, type Branch } from "src/modules/branches";
import {
  directorInstructorLabelById,
  formatDirectorInstructorLabel,
} from "src/modules/director/directorInstructorLabels";
import DirectorSalaryRulesView from "./DirectorSalaryRulesView";

const BASE_PATH = "/admin/director/salary";

const SALARY_TABS = [
  { suffix: "", label: "Հաշվարկ" },
  { suffix: "/rules", label: "Դրույքաչափեր" },
  { suffix: "/card", label: "Քարտային փոխանցում" },
  { suffix: "/records", label: "Պատմություն" },
];

const STATUS_LABEL: Record<DirectorPayrollStatus, string> = {
  calculated: "Հաշվարկված",
  approved: "Հաստատված",
  paid: "Վճարված",
};

const ADJUSTMENT_KIND_LABEL: Record<DirectorSalaryAdjustment["kind"], string> = {
  bonus: "Բոնուս",
  additional: "Լրացուցիչ",
  deduction: "Պահում",
  other: "Այլ",
};

function paymentKindLabel(kind: DirectorSalaryPayment["kind"]): string {
  if (kind === "instructor") return "Հրահանգիչ";
  if (kind === "theory_teacher") return "Տեսության դասախոս";
  if (kind === "payroll") return "Աշխատավարձ";
  return "Այլ";
}

function formatUnpaidSlots(unpaid: number): string | null {
  if (unpaid <= 0) return null;
  return `${unpaid} չվճարված`;
}

function lessonPaymentBucketLabel(bucket: DirectorSalaryLessonPaymentBucket): string {
  return bucket === "payable" ? "Վճարված" : "Չվճարված";
}

function statusBadgeClass(status: DirectorPayrollStatus): string {
  if (status === "paid") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
  if (status === "approved") return "bg-sky-500/15 text-sky-700 dark:text-sky-400";
  return "bg-amber-500/15 text-amber-800 dark:text-amber-400";
}

function dashOrAmd(n: number): string {
  return n === 0 ? "—" : formatAmd(n);
}

function dashOrCount(n: number): string {
  return n === 0 ? "—" : String(n);
}

function employeeDisplayName(
  employeeUserId: number | null | undefined,
  fallback: string,
  instructors: readonly Instructor[],
  branches: readonly Branch[],
): string {
  if (employeeUserId == null) return fallback;
  const label = directorInstructorLabelById(employeeUserId, instructors, branches);
  return label.startsWith("#") ? fallback : label;
}

function SalaryPeriodFilters({
  start,
  end,
  onStartChange,
  onEndChange,
  onRefresh,
}: {
  start: string;
  end: string;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
  onRefresh: () => void;
}) {
  const chips = [
    { id: "current", label: "Ընթացիկ շրջան (1–15 / 16–վերջ)", range: halfMonthPeriod(new Date()) },
    { id: "previous", label: "Նախորդ շրջան", range: previousHalfMonthPeriod(new Date()) },
  ];

  return (
    <div className="mb-5 space-y-3">
      <DirectorDateFilters
        start={start}
        end={end}
        onStartChange={onStartChange}
        onEndChange={onEndChange}
        onRefresh={onRefresh}
      />
      <div className="flex flex-wrap gap-2 -mt-2">
        {chips.map((chip) => {
          const active = chip.range.start === start && chip.range.end === end;
          return (
            <DirectorButton
              key={chip.id}
              variant={active ? "primary" : "ghost"}
              className={cn("text-xs sm:text-sm", active && "pointer-events-none")}
              onClick={() => {
                onStartChange(chip.range.start);
                onEndChange(chip.range.end);
              }}
            >
              {chip.label}
            </DirectorButton>
          );
        })}
      </div>
    </div>
  );
}

function SalaryReportView({
  start,
  end,
  query,
  reloadKey,
  instructors,
  branches,
}: {
  start: string;
  end: string;
  query: string;
  reloadKey: number;
  instructors: readonly Instructor[];
  branches: readonly Branch[];
}) {
  const { showToast } = useToast();
  const [report, setReport] = useState<DirectorSalaryReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailRow, setDetailRow] = useState<DirectorSalaryEmployeeRow | null>(null);
  const [lessonsOpen, setLessonsOpen] = useState(false);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [lessons, setLessons] = useState<DirectorSalaryLessons | null>(null);
  const [lessonsKind, setLessonsKind] = useState<DirectorSalaryEmployeeKind>("instructor");
  const [payRow, setPayRow] = useState<DirectorSalaryEmployeeRow | null>(null);
  const [payStatus, setPayStatus] = useState<"approved" | "paid">("paid");
  const [payNotes, setPayNotes] = useState("");
  const [paying, setPaying] = useState(false);
  const [adjOpen, setAdjOpen] = useState(false);
  const [adjForm, setAdjForm] = useState({
    kind: "bonus" as DirectorSalaryAdjustment["kind"],
    amount: "",
    title: "",
    notes: "",
  });
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchDirectorSalaryReport(query);
      setReport({
        ...data,
        employees: Array.isArray(data.employees) ? data.employees : [],
        rows: Array.isArray(data.rows) ? data.rows : [],
      });
    } catch (e) {
      setReport(null);
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setLoading(false);
    }
  }, [query, showToast]);

  useDirectorReload(load, [query, reloadKey]);

  const filteredRows = useMemo(() => {
    const rows = report?.employees ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const name = employeeDisplayName(
        row.employeeUserId,
        row.employeeName,
        instructors,
        branches,
      );
      const hay = [
        name,
        row.employeeName,
        String(row.hoursCount),
        String(row.lessonsCount),
        String(row.groupsCount),
        formatAmd(row.totalAmd),
        STATUS_LABEL[row.status],
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [report, search, instructors, branches]);

  const totals = useMemo(() => {
    const rows = report?.employees ?? [];
    const totalDue = rows.reduce((s, r) => s + r.totalAmd, 0);
    const totalPaid = rows.filter((r) => r.status === "paid").reduce((s, r) => s + r.totalAmd, 0);
    const outstanding = rows
      .filter((r) => r.status !== "paid")
      .reduce((s, r) => s + r.totalAmd, 0);
    return { totalDue, totalPaid, outstanding };
  }, [report]);

  const openLessons = async (employeeUserId: number, kind: DirectorSalaryEmployeeKind) => {
    setLessonsKind(kind);
    setLessonsOpen(true);
    setLessonsLoading(true);
    setLessons(null);
    try {
      const data = await fetchDirectorSalaryLessons(kind, employeeUserId, query);
      setLessons(data);
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
      setLessonsOpen(false);
    } finally {
      setLessonsLoading(false);
    }
  };

  const confirmPay = async () => {
    if (!payRow) return;
    setPaying(true);
    try {
      await createDirectorSalaryPayment({
        kind: "payroll",
        employeeUserId: payRow.employeeUserId,
        title: `${employeeDisplayName(payRow.employeeUserId, payRow.employeeName, instructors, branches)} · ${start}—${end}`,
        periodStart: start,
        periodEnd: end,
        status: payStatus,
        notes: payNotes.trim() || null,
      });
      showToast(payStatus === "approved" ? "Հաստատված է" : "Վճարումը գրանցված է", "success");
      setPayRow(null);
      setPayNotes("");
      setPayStatus("paid");
      await load();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setPaying(false);
    }
  };

  const markPaid = async (paymentId: number) => {
    try {
      await markDirectorSalaryPaymentPaid(paymentId);
      showToast("Նշված է որպես վճարված", "success");
      await load();
      setDetailRow(null);
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    }
  };

  const submitAdjustment = async () => {
    if (!detailRow) return;
    const amountAmd = parseAmdInput(adjForm.amount);
    if (amountAmd <= 0) {
      showToast("Գումարը պետք է լինի դրական", "error");
      return;
    }
    try {
      await createDirectorSalaryAdjustment({
        employeeUserId: detailRow.employeeUserId,
        dateIso: end,
        kind: adjForm.kind,
        amountAmd,
        title: adjForm.title.trim() || ADJUSTMENT_KIND_LABEL[adjForm.kind],
        notes: adjForm.notes.trim() || null,
      });
      showToast("Ուղղումը ավելացված է", "success");
      setAdjOpen(false);
      setAdjForm({ kind: "bonus", amount: "", title: "", notes: "" });
      await load();
      const refreshed = await fetchDirectorSalaryReport(query);
      const next = (refreshed.employees ?? []).find(
        (e) => e.employeeUserId === detailRow.employeeUserId,
      );
      if (next) setDetailRow(next);
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    }
  };

  return (
    <>
      <DirectorStatGrid>
        <DirectorStatCard label="Ընդամենը գումար" value={loading ? "…" : formatAmd(totals.totalDue)} />
        <DirectorStatCard label="Վճարված" value={loading ? "…" : formatAmd(totals.totalPaid)} />
        <DirectorStatCard label="Մնացորդ" value={loading ? "…" : formatAmd(totals.outstanding)} />
        <DirectorStatCard label="Շրջան" value={`${start} — ${end}`} />
      </DirectorStatGrid>

      <p className="text-xs text-muted-foreground mt-4 mb-2">
        Հաշվարկը գալիս է իրական դասերից և դրույքներից։ Ֆիքսված ամսականը համամասնվում է ընտրված օրերով։
        Խմբային դրույքը՝ այն խմբերը, որոնցում այս շրջանում կա առնվազն մեկ տեսության դաս։
      </p>

      <div className="mt-4 rounded-lg border border-border overflow-hidden bg-card">
        <DataTableToolbar
          value={search}
          onChange={setSearch}
          placeholder="Որոնել աշխատակցով…"
        />
        <DirectorTableWrap className="mt-0 border-0 rounded-none">
          <DirectorTableHead>
            {[
              "Աշխատակից",
              "Ֆիքսված",
              "Ժամ",
              "Դասեր",
              "Խմբեր",
              "Ուղղումներ",
              "Ընդամենը",
              "Կարգավիճակ",
              "",
            ].map((h, i) => (
              <DirectorTableTh key={i}>{h}</DirectorTableTh>
            ))}
          </DirectorTableHead>
          <DirectorTableBody>
            {loading ? (
              <TableSkeletonRows cols={9} cellClassName="py-2.5 px-3" />
            ) : filteredRows.length === 0 ? (
              <DirectorTableRow>
                <DirectorTableTd colSpan={9} className="text-center text-muted-foreground py-8">
                  {search.trim()
                    ? "Որոնման արդյունք չկա"
                    : "Այս ժամանակահատվածում հաշվարկ չկա"}
                </DirectorTableTd>
              </DirectorTableRow>
            ) : (
              filteredRows.map((row) => {
                const unpaidNote = formatUnpaidSlots(row.unpaidHoursCount);
                return (
                  <DirectorTableRow key={row.employeeUserId}>
                    <DirectorTableTd>
                      <button
                        type="button"
                        className="text-left text-primary underline-offset-2 hover:underline font-medium"
                        onClick={() => setDetailRow(row)}
                      >
                        {employeeDisplayName(
                          row.employeeUserId,
                          row.employeeName,
                          instructors,
                          branches,
                        )}
                      </button>
                    </DirectorTableTd>
                    <DirectorTableTd className="tabular-nums">{dashOrAmd(row.fixedAmd)}</DirectorTableTd>
                    <DirectorTableTd className="tabular-nums">
                      {dashOrCount(row.hoursCount)}
                      {unpaidNote ? (
                        <span className="block text-xs text-amber-700 dark:text-amber-400">
                          {unpaidNote}
                        </span>
                      ) : null}
                    </DirectorTableTd>
                    <DirectorTableTd className="tabular-nums">
                      {dashOrCount(row.lessonsCount)}
                    </DirectorTableTd>
                    <DirectorTableTd className="tabular-nums">
                      {dashOrCount(row.groupsCount)}
                    </DirectorTableTd>
                    <DirectorTableTd className="tabular-nums">
                      {row.adjustmentsAmd === 0 ? "—" : formatAmd(row.adjustmentsAmd)}
                    </DirectorTableTd>
                    <DirectorTableTd className="tabular-nums font-medium">
                      <span>{formatAmd(row.totalAmd)}</span>
                      {row.cardTransferAmd != null && row.cardTransferAmd > 0 ? (
                        <span className="block text-xs font-normal text-amber-700 dark:text-amber-400">
                          Ամսական քարտով՝ {formatAmd(row.cardTransferAmd)}
                        </span>
                      ) : null}
                    </DirectorTableTd>
                    <DirectorTableTd>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          statusBadgeClass(row.status),
                        )}
                      >
                        {STATUS_LABEL[row.status]}
                      </span>
                    </DirectorTableTd>
                    <DirectorTableTd className="text-right">
                      {row.status === "calculated" && row.totalAmd > 0 ? (
                        <DirectorButton className="h-8 text-xs" onClick={() => setPayRow(row)}>
                          Վճարել
                        </DirectorButton>
                      ) : row.status === "approved" && row.paid ? (
                        <DirectorButton
                          className="h-8 text-xs"
                          onClick={() => void markPaid(row.paid!.paymentId)}
                        >
                          Նշել վճարված
                        </DirectorButton>
                      ) : null}
                    </DirectorTableTd>
                  </DirectorTableRow>
                );
              })
            )}
          </DirectorTableBody>
        </DirectorTableWrap>
      </div>

      <Dialog open={detailRow != null} onOpenChange={(open) => !open && setDetailRow(null)}>
        <DialogContent className="w-full max-w-[calc(100%-2rem)] sm:max-w-[min(96vw,40rem)] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {detailRow
                ? employeeDisplayName(
                    detailRow.employeeUserId,
                    detailRow.employeeName,
                    instructors,
                    branches,
                  )
                : "Մանրամասներ"}
            </DialogTitle>
            <DialogDescription>
              {start} — {end} · {detailRow ? formatAmd(detailRow.totalAmd) : ""}
            </DialogDescription>
          </DialogHeader>
          {detailRow ? (
            <div className="space-y-4 text-sm">
              {detailRow.lines.length === 0 ? (
                <p className="text-muted-foreground">Հաշվարկի տողեր չկան</p>
              ) : (
                detailRow.lines.map((line, idx) => (
                  <div
                    key={`${line.compensationType}-${idx}`}
                    className="rounded-md border border-border px-3 py-2.5 space-y-1"
                  >
                    <div className="font-medium text-foreground">{line.roleLabel}</div>
                    <div className="text-muted-foreground text-xs">{line.description}</div>
                    <div className="flex justify-between tabular-nums pt-1">
                      <span>
                        {line.quantity} × {formatAmd(line.rateAmd)}
                      </span>
                      <span className="font-medium">{formatAmd(line.subtotalAmd)}</span>
                    </div>
                  </div>
                ))
              )}
              <div className="flex justify-between items-center border-t border-border pt-3 font-semibold">
                <span>Ընդամենը</span>
                <span className="tabular-nums">{formatAmd(detailRow.totalAmd)}</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {detailRow.hoursCount > 0 ? (
                  <DirectorButton
                    variant="ghost"
                    className="h-8 text-xs"
                    onClick={() => void openLessons(detailRow.employeeUserId, "instructor")}
                  >
                    Պրակտիկ դասեր
                  </DirectorButton>
                ) : null}
                {detailRow.lessonsCount > 0 || detailRow.groupsCount > 0 ? (
                  <DirectorButton
                    variant="ghost"
                    className="h-8 text-xs"
                    onClick={() => void openLessons(detailRow.employeeUserId, "theory_teacher")}
                  >
                    Տեսության դասեր
                  </DirectorButton>
                ) : null}
                {detailRow.status === "calculated" ? (
                  <DirectorButton
                    variant="ghost"
                    className="h-8 text-xs"
                    onClick={() => setAdjOpen(true)}
                  >
                    Ավելացնել ուղղում
                  </DirectorButton>
                ) : null}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={lessonsOpen} onOpenChange={setLessonsOpen}>
        <DialogContent className="w-full max-w-[calc(100%-2rem)] sm:max-w-[min(96vw,56rem)] max-h-[85vh] overflow-hidden flex flex-col gap-4">
          <DialogHeader className="shrink-0 pr-8">
            <DialogTitle>
              {lessonsKind === "instructor" ? "Պրակտիկ դասեր" : "Տեսության դասեր"}
            </DialogTitle>
            <DialogDescription>
              {lessons
                ? `${lessons.startDate} - ${lessons.endDate} · ${lessons.totalUnits} միավոր` +
                  (lessons.unpaidUnits > 0 ? ` · ${lessons.unpaidUnits} չվճարված` : "")
                : start + " - " + end}
            </DialogDescription>
          </DialogHeader>
          <AdminTableScroll className="min-h-0 flex-1 overflow-y-auto">
            <table className="w-full text-sm min-w-[48rem]">
              <thead className="sticky top-0 z-10 bg-muted">
                <tr>
                  {["ID", "Ամսաթիվ", "Ժամ", "Աշակերտ / Խումբ", "Վճարում", "Միավոր"].map((h) => (
                    <th
                      key={h}
                      className="text-left text-xs font-semibold text-muted-foreground px-3 py-2 uppercase"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lessonsLoading ? (
                  <TableSkeletonRows cols={6} cellClassName="px-3 py-2" />
                ) : (lessons?.items.length ?? 0) === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                      Դասեր չկան
                    </td>
                  </tr>
                ) : (
                  lessons?.items.map((item) => {
                    const paid = item.paymentBucket === "payable";
                    return (
                      <tr key={`${item.paymentBucket}-${item.id}`} className="hover:bg-muted/30">
                        <td className="px-3 py-2 text-xs font-mono text-muted-foreground whitespace-nowrap tabular-nums">
                          {item.bookingId != null && item.bookingId > 0 ? item.bookingId : "-"}
                        </td>
                        <td className="px-3 py-2 tabular-nums whitespace-nowrap">{item.dateIso}</td>
                        <td className="px-3 py-2 tabular-nums text-muted-foreground whitespace-nowrap">
                          {item.startTime}
                          {item.endTime ? ` - ${item.endTime}` : ""}
                        </td>
                        <td className="px-3 py-2">{item.label}</td>
                        <td className="px-3 py-2">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                              paid
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                                : "bg-amber-500/15 text-amber-800 dark:text-amber-400",
                            )}
                          >
                            {lessonPaymentBucketLabel(item.paymentBucket ?? "payable")}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{item.units}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </AdminTableScroll>
        </DialogContent>
      </Dialog>

      <Dialog open={payRow != null} onOpenChange={(open) => !open && setPayRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Հաստատել վճարումը</DialogTitle>
            <DialogDescription>
              {payRow
                ? `${employeeDisplayName(payRow.employeeUserId, payRow.employeeName, instructors, branches)} · ${formatAmd(payRow.totalAmd)}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DirectorField label="Կարգավիճակ">
            <DirectorSelect
              value={payStatus}
              onChange={(e) => setPayStatus(e.target.value as "approved" | "paid")}
            >
              <option value="paid">Վճարված</option>
              <option value="approved">Հաստատված (դեռ չվճարված)</option>
            </DirectorSelect>
          </DirectorField>
          <DirectorField label="Մեկնաբանություն">
            <DirectorTextarea rows={3} value={payNotes} onChange={(e) => setPayNotes(e.target.value)} />
          </DirectorField>
          <DialogFooter>
            <DirectorButton variant="ghost" onClick={() => setPayRow(null)}>
              Չեղարկել
            </DirectorButton>
            <DirectorButton onClick={() => void confirmPay()} disabled={paying}>
              {paying ? "…" : "Գրանցել"}
            </DirectorButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={adjOpen} onOpenChange={setAdjOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Աշխատավարձի ուղղում</DialogTitle>
            <DialogDescription>Բոնուս, լրացուցիչ վճար կամ պահում այս շրջանի համար</DialogDescription>
          </DialogHeader>
          <DirectorField label="Տեսակ">
            <DirectorSelect
              value={adjForm.kind}
              onChange={(e) =>
                setAdjForm((f) => ({
                  ...f,
                  kind: e.target.value as DirectorSalaryAdjustment["kind"],
                }))
              }
            >
              {(Object.keys(ADJUSTMENT_KIND_LABEL) as DirectorSalaryAdjustment["kind"][]).map(
                (k) => (
                  <option key={k} value={k}>
                    {ADJUSTMENT_KIND_LABEL[k]}
                  </option>
                ),
              )}
            </DirectorSelect>
          </DirectorField>
          <DirectorField label="Վերնագիր">
            <DirectorInput
              value={adjForm.title}
              onChange={(e) => setAdjForm((f) => ({ ...f, title: e.target.value }))}
            />
          </DirectorField>
          <DirectorField label="Գումար">
            <DirectorInput
              value={adjForm.amount}
              onChange={(e) => setAdjForm((f) => ({ ...f, amount: e.target.value }))}
            />
          </DirectorField>
          <DirectorField label="Մեկնաբանություն">
            <DirectorTextarea
              rows={2}
              value={adjForm.notes}
              onChange={(e) => setAdjForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </DirectorField>
          <DialogFooter>
            <DirectorButton variant="ghost" onClick={() => setAdjOpen(false)}>
              Չեղարկել
            </DirectorButton>
            <DirectorButton onClick={() => void submitAdjustment()}>Ավելացնել</DirectorButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SalaryRecordsView({
  start,
  end,
  query,
  reloadKey,
  instructors,
  branches,
}: {
  start: string;
  end: string;
  query: string;
  reloadKey: number;
  instructors: readonly Instructor[];
  branches: readonly Branch[];
}) {
  const { showToast } = useToast();
  const [payments, setPayments] = useState<DirectorSalaryPayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [paymentsSearch, setPaymentsSearch] = useState("");
  const [rows, setRows] = useState<DirectorSalary[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    date: todayIso(),
    name: "",
    role: "Հրահանգիչ",
    hours: "",
    hourlyRate: "",
    comment: "",
  });

  const loadPayments = useCallback(async () => {
    setPaymentsLoading(true);
    try {
      const data = await fetchDirectorSalaryPayments(query);
      setPayments(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      setPayments([]);
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setPaymentsLoading(false);
    }
  }, [query, showToast]);

  const loadManual = useCallback(async () => {
    try {
      const list = await fetchDirectorSalaries(query);
      setRows(Array.isArray(list) ? list : []);
    } catch (e) {
      setRows([]);
      showToast(getApiErrorMessage(e), "error");
    }
  }, [query, showToast]);

  const load = useCallback(async () => {
    await Promise.all([loadPayments(), loadManual()]);
  }, [loadPayments, loadManual]);

  const reload = useDirectorReload(load, [query, reloadKey]);

  const filteredPayments = useMemo(() => {
    const q = paymentsSearch.trim().toLowerCase();
    if (!q) return payments;
    return payments.filter((p) => {
      const name = employeeDisplayName(p.employeeUserId, p.employeeName, instructors, branches);
      const kind = paymentKindLabel(p.kind);
      const hay = [
        p.createdAtIso.slice(0, 10),
        name,
        p.employeeName,
        kind,
        p.status === "approved" ? "Հաստատված" : "",
        p.periodStartIso,
        p.periodEndIso,
        String(p.lessonsCount ?? ""),
        formatAmd(p.totalAmd),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [payments, paymentsSearch, instructors, branches]);

  const computedTotal = useMemo(() => {
    const h = directorDecimal(form.hours);
    const rate = parseAmdInput(form.hourlyRate);
    if (h > 0 && rate > 0) return Math.round(h * rate);
    return 0;
  }, [form.hours, form.hourlyRate]);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      date: todayIso(),
      name: "",
      role: "Հրահանգիչ",
      hours: "",
      hourlyRate: "",
      comment: "",
    });
  };

  const closeForm = () => {
    resetForm();
    setFormOpen(false);
  };

  const openCreate = () => {
    resetForm();
    setFormOpen(true);
  };

  const submit = async () => {
    try {
      const totalAmd = computedTotal || directorAmd(form.hourlyRate);
      const body = {
        date: directorDate(form.date),
        name: directorText(form.name),
        role: directorText(form.role),
        hours: form.hours.trim() ? directorDecimal(form.hours) : null,
        hourlyRate: form.hourlyRate.trim() ? directorAmd(form.hourlyRate) : null,
        totalAmd,
        comment: directorOptionalComment(form.comment),
      };
      if (editingId != null) {
        await updateDirectorSalary(editingId, body);
        showToast("Թարմացված է", "success");
      } else {
        await createDirectorSalary(body);
        showToast("Գրանցված է", "success");
      }
      closeForm();
      reload();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    }
  };

  const startEdit = (row: DirectorSalary) => {
    setEditingId(row.id);
    setForm({
      date: row.date,
      name: row.name,
      role: row.role,
      hours: row.hours != null ? String(row.hours) : "",
      hourlyRate: row.hourlyRate != null ? String(row.hourlyRate) : "",
      comment: row.comment ?? "",
    });
    setFormOpen(true);
  };

  const tableColumns = useMemo(
    () => [
      {
        id: "date",
        header: "Ամսաթիվ",
        sortable: true,
        sortValue: (r: DirectorSalary) => r.date,
        searchValue: (r: DirectorSalary) => r.date,
        render: (r: DirectorSalary) => r.date,
      },
      {
        id: "name",
        header: "Անուն",
        sortable: true,
        filterable: true,
        sortValue: (r: DirectorSalary) => r.name,
        filterValue: (r: DirectorSalary) => r.name,
        searchValue: (r: DirectorSalary) => r.name,
        render: (r: DirectorSalary) => r.name,
      },
      {
        id: "role",
        header: "Դեր",
        sortable: true,
        filterable: true,
        sortValue: (r: DirectorSalary) => r.role,
        filterValue: (r: DirectorSalary) => r.role,
        searchValue: (r: DirectorSalary) => r.role,
        render: (r: DirectorSalary) => r.role,
      },
      {
        id: "hours",
        header: "Ժամ",
        sortable: true,
        sortValue: (r: DirectorSalary) => r.hours ?? 0,
        searchValue: (r: DirectorSalary) => String(r.hours ?? ""),
        render: (r: DirectorSalary) => r.hours ?? "—",
      },
      {
        id: "total",
        header: "Գումար",
        sortable: true,
        sortValue: (r: DirectorSalary) => r.totalAmd,
        searchValue: (r: DirectorSalary) => formatAmd(r.totalAmd),
        render: (r: DirectorSalary) => formatAmd(r.totalAmd),
      },
      {
        id: "actions",
        header: "",
        align: "end" as const,
        render: (r: DirectorSalary) => (
          <DirectorRecordActions
            readOnly={isLegacyDirectorRecord(r.id)}
            onEdit={() => startEdit(r)}
            onDelete={() => void deleteDirectorSalary(r.id).then(reload)}
          />
        ),
      },
    ],
    [reload],
  );

  const table = useDirectorTable({ rows, columns: tableColumns });

  return (
    <>
      <h2 className="text-sm font-semibold text-foreground mb-3">Վճարումների պատմություն ({start} — {end})</h2>
      <div className="rounded-lg border border-border overflow-hidden bg-card">
        <DataTableToolbar
          value={paymentsSearch}
          onChange={setPaymentsSearch}
          placeholder="Որոնել վճարում…"
        />
        <DirectorTableWrap className="mt-0 border-0 rounded-none">
          <DirectorTableHead>
            {["Ամսաթիվ", "Աշխատակից", "Տեսակ", "Ժամանակահատված", "Դասեր", "Գումար", ""].map((h, i) => (
              <DirectorTableTh key={i}>{h}</DirectorTableTh>
            ))}
          </DirectorTableHead>
          <DirectorTableBody>
            {paymentsLoading ? (
              <TableSkeletonRows cols={7} cellClassName="py-2.5 px-3" />
            ) : filteredPayments.length === 0 ? (
              <DirectorTableRow>
                <DirectorTableTd colSpan={7} className="text-center text-muted-foreground py-8">
                  {paymentsSearch.trim() ? "Որոնման արդյունք չկա" : "Վճարումներ չկան"}
                </DirectorTableTd>
              </DirectorTableRow>
            ) : (
              filteredPayments.map((p) => (
                <DirectorTableRow key={p.id}>
                  <DirectorTableTd className="tabular-nums whitespace-nowrap">{p.createdAtIso.slice(0, 10)}</DirectorTableTd>
                  <DirectorTableTd>
                    {employeeDisplayName(p.employeeUserId, p.employeeName, instructors, branches)}
                  </DirectorTableTd>
                  <DirectorTableTd>
                    {paymentKindLabel(p.kind)}
                    {p.status === "approved" ? (
                      <span className="block text-xs text-sky-700 dark:text-sky-400">Հաստատված</span>
                    ) : null}
                  </DirectorTableTd>
                  <DirectorTableTd className="tabular-nums whitespace-nowrap text-muted-foreground">
                    {p.periodStartIso} - {p.periodEndIso}
                  </DirectorTableTd>
                  <DirectorTableTd className="tabular-nums">{p.lessonsCount ?? "—"}</DirectorTableTd>
                  <DirectorTableTd className="tabular-nums font-medium">{formatAmd(p.totalAmd)}</DirectorTableTd>
                  <DirectorTableTd className="text-right">
                    <DirectorButton
                      variant="ghost"
                      className="h-8 text-xs text-destructive"
                      onClick={() => void deleteDirectorSalaryPayment(p.id).then(reload)}
                    >
                      Ջնջել
                    </DirectorButton>
                  </DirectorTableTd>
                </DirectorTableRow>
              ))
            )}
          </DirectorTableBody>
        </DirectorTableWrap>
      </div>

      <h2 className="text-sm font-semibold text-foreground mt-8 mb-3">Ձեռքով գրանցումներ</h2>
      <DirectorDataTable
        table={table}
        columns={tableColumns}
        rowKey={(r) => r.id}
        toolbarActions={<DirectorAddRecordButton onClick={openCreate} />}
      />
      <DirectorRecordFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editingId != null ? "Խմբագրել աշխատավարձ" : "Նոր աշխատավարձ"}
        editing={editingId != null}
        createLabel="Գրանցել աշխատավարձ"
        onSubmit={() => void submit()}
        onCancel={closeForm}
      >
        <DirectorField label="Ամսաթիվ">
          <DirectorInput type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
        </DirectorField>
        <DirectorField label="Անուն">
          <DirectorInput value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </DirectorField>
        <DirectorField label="Դեր">
          <DirectorDynamicSelect
            category={DIRECTOR_OPTION_CATEGORY.salRole}
            value={form.role}
            onChange={(role) => setForm((f) => ({ ...f, role }))}
          />
        </DirectorField>
        <DirectorField label="Ժամ">
          <DirectorInput value={form.hours} onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))} />
        </DirectorField>
        <DirectorField label="Ժամավճար">
          <DirectorInput value={form.hourlyRate} onChange={(e) => setForm((f) => ({ ...f, hourlyRate: e.target.value }))} />
        </DirectorField>
        <DirectorField label="Ընդամենը">
          <DirectorInput value={computedTotal ? String(computedTotal) : ""} readOnly />
        </DirectorField>
        <DirectorField label="Մեկնաբանություն">
          <DirectorTextarea rows={3} value={form.comment} onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))} />
        </DirectorField>
      </DirectorRecordFormDialog>
    </>
  );
}

function SalaryCardTransfersView({
  reloadKey,
  instructors,
  branches,
}: {
  reloadKey: number;
  instructors: readonly Instructor[];
  branches: readonly Branch[];
}) {
  const { showToast } = useToast();
  const [rows, setRows] = useState<DirectorSalaryCardTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    instructorUserId: "",
    amount: "",
    autoMonthly: true,
    notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchDirectorSalaryCardTransfers();
      setRows(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      setRows([]);
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useDirectorReload(load, [reloadKey]);

  const resetForm = () => {
    setEditingId(null);
    setForm({ instructorUserId: "", amount: "", autoMonthly: true, notes: "" });
  };

  const closeForm = () => {
    resetForm();
    setFormOpen(false);
  };

  const openCreate = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEdit = (row: DirectorSalaryCardTransfer) => {
    setEditingId(row.id);
    setForm({
      instructorUserId: String(row.instructorUserId),
      amount: String(row.amountAmd),
      autoMonthly: row.autoMonthly,
      notes: row.notes ?? "",
    });
    setFormOpen(true);
  };

  const submit = async () => {
    const instructorUserId = Number(form.instructorUserId);
    const amountAmd = directorAmd(form.amount);
    if (!Number.isFinite(instructorUserId) || instructorUserId <= 0) {
      showToast("Ընտրեք հրահանգիչ", "error");
      return;
    }
    if (amountAmd <= 0) {
      showToast("Գումարը պետք է լինի դրական", "error");
      return;
    }
    const body = {
      instructorUserId,
      amountAmd,
      autoMonthly: form.autoMonthly,
      notes: directorOptionalComment(form.notes),
    };
    try {
      if (editingId != null) {
        await updateDirectorSalaryCardTransfer(editingId, body);
        showToast("Պահված է", "success");
      } else {
        await createDirectorSalaryCardTransfer(body);
        showToast("Ավելացված է", "success");
      }
      closeForm();
      await load();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    }
  };

  const remove = async (id: number) => {
    try {
      await deleteDirectorSalaryCardTransfer(id);
      showToast("Ջնջված է", "success");
      await load();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    }
  };

  const tableColumns = useMemo(
    () => [
      {
        id: "instructor",
        header: "Հրահանգիչ",
        sortable: true,
        filterable: true,
        sortValue: (r: DirectorSalaryCardTransfer) =>
          employeeDisplayName(r.instructorUserId, r.instructorName, instructors, branches),
        filterValue: (r: DirectorSalaryCardTransfer) =>
          employeeDisplayName(r.instructorUserId, r.instructorName, instructors, branches),
        searchValue: (r: DirectorSalaryCardTransfer) =>
          `${employeeDisplayName(r.instructorUserId, r.instructorName, instructors, branches)} ${r.instructorName}`,
        render: (r: DirectorSalaryCardTransfer) =>
          employeeDisplayName(r.instructorUserId, r.instructorName, instructors, branches),
      },
      {
        id: "amount",
        header: "Գումար",
        sortable: true,
        sortValue: (r: DirectorSalaryCardTransfer) => r.amountAmd,
        searchValue: (r: DirectorSalaryCardTransfer) => formatAmd(r.amountAmd),
        render: (r: DirectorSalaryCardTransfer) => formatAmd(r.amountAmd),
      },
      {
        id: "auto",
        header: "Ավտոմատ",
        sortable: true,
        filterable: true,
        sortValue: (r: DirectorSalaryCardTransfer) => (r.autoMonthly ? 1 : 0),
        filterValue: (r: DirectorSalaryCardTransfer) => (r.autoMonthly ? "Այո" : "Ոչ"),
        searchValue: (r: DirectorSalaryCardTransfer) => (r.autoMonthly ? "ավտոմատ այո" : "ավտոմատ ոչ"),
        render: (r: DirectorSalaryCardTransfer) =>
          r.autoMonthly ? (
            <span className="inline-flex items-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 text-xs font-medium">
              Այո
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-xs font-medium">
              Ոչ
            </span>
          ),
      },
      {
        id: "notes",
        header: "Մեկնաբանություն",
        searchValue: (r: DirectorSalaryCardTransfer) => r.notes ?? "",
        render: (r: DirectorSalaryCardTransfer) => r.notes || "—",
      },
      {
        id: "actions",
        header: "",
        align: "end" as const,
        render: (r: DirectorSalaryCardTransfer) => (
          <DirectorRecordActions onEdit={() => openEdit(r)} onDelete={() => void remove(r.id)} />
        ),
      },
    ],
    [instructors, branches],
  );

  const table = useDirectorTable({ rows, columns: tableColumns, defaultSortKey: "instructor" });

  return (
    <>
      <p className="text-xs text-muted-foreground mb-4">
        Մեկ անգամ ավելացրեք հրահանգիչին և ամսական գումարը։ Եթե «Ամսական ավտոմատ»-ը միացված է,
        Հաշվարկում Գումարի տակ ամեն ամիս կերևա դեղին հիշեցում (գումարից չի հանվում)։
        Կարող եք ցանկացած պահի անջատել կամ ջնջել։
      </p>
      {loading ? (
        <div className="rounded-lg border border-border overflow-hidden bg-card">
          <DirectorTableWrap className="mt-0 border-0 rounded-none">
            <DirectorTableHead>
              {["Հրահանգիչ", "Գումար", "Ավտոմատ", "Մեկնաբանություն", ""].map((h, i) => (
                <DirectorTableTh key={i}>{h}</DirectorTableTh>
              ))}
            </DirectorTableHead>
            <DirectorTableBody>
              <TableSkeletonRows cols={5} cellClassName="py-2.5 px-3" />
            </DirectorTableBody>
          </DirectorTableWrap>
        </div>
      ) : (
        <DirectorDataTable
          table={table}
          columns={tableColumns}
          rowKey={(r) => r.id}
          searchPlaceholder="Որոնել հրահանգչով կամ գումարով…"
          toolbarActions={<DirectorAddRecordButton onClick={openCreate} />}
        />
      )}
      <DirectorRecordFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editingId != null ? "Խմբագրել քարտային փոխանցում" : "Նոր քարտային փոխանցում"}
        editing={editingId != null}
        createLabel="Պահել"
        onSubmit={() => void submit()}
        onCancel={closeForm}
      >
        <DirectorField label="Հրահանգիչ">
          <DirectorSelect
            value={form.instructorUserId}
            onChange={(e) => setForm((f) => ({ ...f, instructorUserId: e.target.value }))}
          >
            <option value="">—</option>
            {instructors.map((i) => (
              <option key={i.id} value={String(i.id)}>
                {formatDirectorInstructorLabel(i, branches)}
              </option>
            ))}
          </DirectorSelect>
        </DirectorField>
        <DirectorField label="Ամսական գումար (քարտ)">
          <DirectorInput
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            placeholder="100000"
          />
        </DirectorField>
        <label className="flex items-center gap-2.5 cursor-pointer text-sm text-foreground">
          <input
            type="checkbox"
            checked={form.autoMonthly}
            onChange={(e) => setForm((f) => ({ ...f, autoMonthly: e.target.checked }))}
            className="h-4 w-4 rounded border-input accent-primary"
          />
          Ամսական ավտոմատ (Հաշվարկում ցույց տալ)
        </label>
        <DirectorField label="Մեկնաբանություն">
          <DirectorTextarea
            rows={3}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </DirectorField>
      </DirectorRecordFormDialog>
    </>
  );
}

export default function DirectorSalaryPage() {
  const view = useDirectorSectionView(BASE_PATH);
  const { branches } = useBranches();
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const initialPeriod = defaultDirectorSalaryPeriod(new Date());
  const { start, end, setStart, setEnd, query } = useDirectorDateRange(
    initialPeriod.start,
    initialPeriod.end,
  );
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    void vivaApiJson<Instructor[]>("/instructors")
      .then((d) => setInstructors(Array.isArray(d) ? d : []))
      .catch(() => setInstructors([]));
  }, []);

  const handleRefresh = () => setReloadKey((k) => k + 1);

  return (
    <DirectorLayout>
      <PanelPageHeader icon={Banknote} title="Աշխատավարձ" />
      <SalaryPeriodFilters
        start={start}
        end={end}
        onStartChange={setStart}
        onEndChange={setEnd}
        onRefresh={handleRefresh}
      />
      <DirectorSectionNav basePath={BASE_PATH} tabs={SALARY_TABS} />

      {view === "report" ? (
        <SalaryReportView
          start={start}
          end={end}
          query={query}
          reloadKey={reloadKey}
          instructors={instructors}
          branches={branches}
        />
      ) : view === "rules" ? (
        <DirectorSalaryRulesView reloadKey={reloadKey} />
      ) : view === "card" ? (
        <SalaryCardTransfersView
          reloadKey={reloadKey}
          instructors={instructors}
          branches={branches}
        />
      ) : (
        <SalaryRecordsView
          start={start}
          end={end}
          query={query}
          reloadKey={reloadKey}
          instructors={instructors}
          branches={branches}
        />
      )}
    </DirectorLayout>
  );
}
