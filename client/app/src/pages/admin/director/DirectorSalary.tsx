import DirectorLayout from "src/modules/director/DirectorLayout";
import DirectorDynamicSelect from "src/modules/director/components/DirectorDynamicSelect";
import DirectorDateFilters, {
  useDirectorDateRange,
  useDirectorReload,
} from "src/modules/director/components/DirectorDateFilters";
import DirectorFormActions from "src/modules/director/components/DirectorFormActions";
import DirectorRecordActions from "src/modules/director/components/DirectorRecordActions";
import DirectorSectionNav, { useDirectorSectionView } from "src/modules/director/components/DirectorSectionNav";
import DirectorDataTable from "src/modules/director/components/DirectorDataTable";
import PanelPageHeader from "src/components/PanelPageHeader";
import TableSkeletonRows from "src/components/TableSkeletonRows";
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
  DirectorCard,
  DirectorField,
  DirectorFormRow,
  DirectorInput,
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
  createDirectorSalaryPayment,
  deleteDirectorSalary,
  deleteDirectorSalaryPayment,
  fetchDirectorSalaries,
  fetchDirectorSalaryLessons,
  fetchDirectorSalaryPayments,
  fetchDirectorSalaryReport,
  updateDirectorSalary,
} from "src/modules/director/director.api";
import {
  defaultDirectorSalaryPeriod,
  DIRECTOR_OPTION_CATEGORY,
  isLegacyDirectorRecord,
  todayIso,
} from "src/modules/director/director.consts";
import type {
  DirectorSalary,
  DirectorSalaryEmployeeKind,
  DirectorSalaryLessons,
  DirectorSalaryPayment,
  DirectorSalaryReport,
  DirectorSalaryReportRow,
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
import { getApiErrorMessage } from "src/lib/vivaApi";
import { useToast } from "src/lib/toast";
import { halfMonthPeriod, previousHalfMonthPeriod } from "src/utils/halfMonthPeriod.utils";
import { useCallback, useMemo, useState } from "react";
import { Banknote } from "lucide-react";
import { cn } from "src/lib/utils";

const BASE_PATH = "/admin/director/salary";

const KIND_LABEL: Record<DirectorSalaryEmployeeKind, string> = {
  instructor: "Հրահանգիչ",
  theory_teacher: "Տեսության դասախոս",
};

function kindLabel(kind: DirectorSalaryEmployeeKind): string {
  return KIND_LABEL[kind];
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
}: {
  start: string;
  end: string;
  query: string;
  reloadKey: number;
}) {
  const { showToast } = useToast();
  const [report, setReport] = useState<DirectorSalaryReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [lessonsOpen, setLessonsOpen] = useState(false);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [lessons, setLessons] = useState<DirectorSalaryLessons | null>(null);
  const [payRow, setPayRow] = useState<DirectorSalaryReportRow | null>(null);
  const [payNotes, setPayNotes] = useState("");
  const [paying, setPaying] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchDirectorSalaryReport(query);
      setReport(data);
    } catch (e) {
      setReport(null);
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setLoading(false);
    }
  }, [query, showToast]);

  useDirectorReload(load, [query, reloadKey]);

  const totals = useMemo(() => {
    const rows = report?.rows ?? [];
    const totalDue = rows.reduce((s, r) => s + r.totalAmd, 0);
    const totalPaid = rows.filter((r) => r.paid).reduce((s, r) => s + r.totalAmd, 0);
    const outstanding = rows.filter((r) => !r.paid).reduce((s, r) => s + r.totalAmd, 0);
    return { totalDue, totalPaid, outstanding };
  }, [report]);

  const openLessons = async (row: DirectorSalaryReportRow) => {
    setLessonsOpen(true);
    setLessonsLoading(true);
    setLessons(null);
    try {
      const data = await fetchDirectorSalaryLessons(row.kind, row.employeeUserId, query);
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
        kind: payRow.kind,
        employeeUserId: payRow.employeeUserId,
        title: `${payRow.employeeName} · ${kindLabel(payRow.kind)} · ${start}—${end}`,
        periodStart: start,
        periodEnd: end,
        notes: payNotes.trim() || null,
      });
      showToast("Վճարումը գրանցված է", "success");
      setPayRow(null);
      setPayNotes("");
      await load();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setPaying(false);
    }
  };

  return (
    <>
      <DirectorStatGrid>
        <DirectorStatCard label="Ընդամենը կելուկ" value={loading ? "…" : formatAmd(totals.totalDue)} />
        <DirectorStatCard label="Վճարված" value={loading ? "…" : formatAmd(totals.totalPaid)} />
        <DirectorStatCard label="Մնացորդ" value={loading ? "…" : formatAmd(totals.outstanding)} />
        <DirectorStatCard label="Շրջան" value={`${start} — ${end}`} />
      </DirectorStatGrid>

      <p className="text-xs text-muted-foreground mt-4 mb-2">
        Հաշվարկը հիմնված է հրահանգչի ժամավճարի վրա (1 դաս = 1 ժամ). Լռելյայն դրույքներ՝ գործնական{" "}
        {formatAmd(report?.instructorRateAmd ?? 1500)}, տեսություն {formatAmd(report?.theoryTeacherRateAmd ?? 3000)}.
      </p>

      <DirectorTableWrap className="mt-4">
        <DirectorTableHead>
          <tr>
            {["Աշխատակից", "Տեսակ", "Դասեր", "Դրույք", "Գումար", "Կարգավիճակ", ""].map((h) => (
              <DirectorTableTh key={h}>{h}</DirectorTableTh>
            ))}
          </tr>
        </DirectorTableHead>
        <DirectorTableBody>
          {loading ? (
            <TableSkeletonRows cols={7} cellClassName="py-2.5 px-3" />
          ) : (report?.rows.length ?? 0) === 0 ? (
            <DirectorTableRow>
              <DirectorTableTd colSpan={7} className="text-center text-muted-foreground py-8">
                Այս ժամանակահատվածում դասեր չկան
              </DirectorTableTd>
            </DirectorTableRow>
          ) : (
            report?.rows.map((row) => (
              <DirectorTableRow key={`${row.kind}:${row.employeeUserId}`}>
                <DirectorTableTd>{row.employeeName}</DirectorTableTd>
                <DirectorTableTd>{kindLabel(row.kind)}</DirectorTableTd>
                <DirectorTableTd>
                  <button
                    type="button"
                    className="text-primary underline-offset-2 hover:underline tabular-nums"
                    onClick={() => void openLessons(row)}
                  >
                    {row.lessonsCount}
                  </button>
                </DirectorTableTd>
                <DirectorTableTd className="tabular-nums">{formatAmd(row.ratePerLessonAmd)}</DirectorTableTd>
                <DirectorTableTd className="tabular-nums font-medium">{formatAmd(row.totalAmd)}</DirectorTableTd>
                <DirectorTableTd>
                  {row.paid ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 text-xs font-medium">
                      Վճարված
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-400 px-2 py-0.5 text-xs font-medium">
                      Չվճարված
                    </span>
                  )}
                </DirectorTableTd>
                <DirectorTableTd className="text-right">
                  {!row.paid ? (
                    <DirectorButton className="h-8 text-xs" onClick={() => setPayRow(row)}>
                      Վճարել
                    </DirectorButton>
                  ) : null}
                </DirectorTableTd>
              </DirectorTableRow>
            ))
          )}
        </DirectorTableBody>
      </DirectorTableWrap>

      <Dialog open={lessonsOpen} onOpenChange={setLessonsOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Դասեր</DialogTitle>
            <DialogDescription>
              {lessons ? `${lessons.startDate} — ${lessons.endDate} · ${lessons.totalUnits} դաս` : start + " — " + end}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  {["Ամսաթիվ", "Ժամ", "Նկարագրություն", "Դասեր"].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-3 py-2 uppercase">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lessonsLoading ? (
                  <TableSkeletonRows cols={4} cellClassName="px-3 py-2" />
                ) : (lessons?.items.length ?? 0) === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                      Դասեր չկան
                    </td>
                  </tr>
                ) : (
                  lessons?.items.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30">
                      <td className="px-3 py-2 tabular-nums whitespace-nowrap">{item.dateIso}</td>
                      <td className="px-3 py-2 tabular-nums text-muted-foreground whitespace-nowrap">
                        {item.startTime}
                        {item.endTime ? ` — ${item.endTime}` : ""}
                      </td>
                      <td className="px-3 py-2">{item.label}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{item.units}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={payRow != null} onOpenChange={(open) => !open && setPayRow(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Հաստատել վճարումը</DialogTitle>
            <DialogDescription>
              {payRow
                ? `${payRow.employeeName} · ${kindLabel(payRow.kind)} · ${payRow.lessonsCount} դաս × ${formatAmd(payRow.ratePerLessonAmd)} = ${formatAmd(payRow.totalAmd)}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DirectorField label="Մեկնաբանություն">
            <DirectorTextarea rows={3} value={payNotes} onChange={(e) => setPayNotes(e.target.value)} />
          </DirectorField>
          <DialogFooter>
            <DirectorButton variant="ghost" onClick={() => setPayRow(null)}>
              Չեղարկել
            </DirectorButton>
            <DirectorButton onClick={() => void confirmPay()} disabled={paying}>
              {paying ? "…" : "Գրանցել վճարում"}
            </DirectorButton>
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
}: {
  start: string;
  end: string;
  query: string;
  reloadKey: number;
}) {
  const { showToast } = useToast();
  const [payments, setPayments] = useState<DirectorSalaryPayment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [rows, setRows] = useState<DirectorSalary[]>([]);
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
      resetForm();
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
      <DirectorTableWrap>
        <DirectorTableHead>
          <tr>
            {["Ամսաթիվ", "Աշխատակից", "Տեսակ", "Ժամանակահատված", "Դասեր", "Գումար", ""].map((h) => (
              <DirectorTableTh key={h}>{h}</DirectorTableTh>
            ))}
          </tr>
        </DirectorTableHead>
        <DirectorTableBody>
          {paymentsLoading ? (
            <TableSkeletonRows cols={7} cellClassName="py-2.5 px-3" />
          ) : payments.length === 0 ? (
            <DirectorTableRow>
              <DirectorTableTd colSpan={7} className="text-center text-muted-foreground py-8">
                Վճարումներ չկան
              </DirectorTableTd>
            </DirectorTableRow>
          ) : (
            payments.map((p) => (
              <DirectorTableRow key={p.id}>
                <DirectorTableTd className="tabular-nums whitespace-nowrap">{p.createdAtIso.slice(0, 10)}</DirectorTableTd>
                <DirectorTableTd>{p.employeeName}</DirectorTableTd>
                <DirectorTableTd>
                  {p.kind === "instructor"
                    ? "Հրահանգիչ"
                    : p.kind === "theory_teacher"
                      ? "Տեսության դասախոս"
                      : "Այլ"}
                </DirectorTableTd>
                <DirectorTableTd className="tabular-nums whitespace-nowrap text-muted-foreground">
                  {p.periodStartIso} — {p.periodEndIso}
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

      <h2 className="text-sm font-semibold text-foreground mt-8 mb-3">Ձեռքով գրանցումներ</h2>
      <DirectorCard>
        <DirectorFormRow>
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
          <DirectorFormActions
            editing={editingId != null}
            createLabel="Գրանցել աշխատավարձ"
            onSubmit={() => void submit()}
            onCancel={resetForm}
          />
        </DirectorFormRow>
      </DirectorCard>
      <DirectorDataTable table={table} columns={tableColumns} rowKey={(r) => r.id} />
    </>
  );
}

export default function DirectorSalaryPage() {
  const view = useDirectorSectionView(BASE_PATH);
  const initialPeriod = defaultDirectorSalaryPeriod(new Date());
  const { start, end, setStart, setEnd, query } = useDirectorDateRange(
    initialPeriod.start,
    initialPeriod.end,
  );
  const [reloadKey, setReloadKey] = useState(0);

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
      <DirectorSectionNav basePath={BASE_PATH} />

      {view === "report" ? (
        <SalaryReportView start={start} end={end} query={query} reloadKey={reloadKey} />
      ) : (
        <SalaryRecordsView start={start} end={end} query={query} reloadKey={reloadKey} />
      )}
    </DirectorLayout>
  );
}
