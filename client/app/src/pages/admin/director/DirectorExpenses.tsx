import DirectorLayout from "src/modules/director/DirectorLayout";
import DirectorDynamicSelect from "src/modules/director/components/DirectorDynamicSelect";
import DirectorPaymentSelect from "src/modules/director/components/DirectorPaymentSelect";
import DirectorDateFilters, {
  useDirectorDateRange,
  useDirectorReload,
} from "src/modules/director/components/DirectorDateFilters";
import DirectorFormActions from "src/modules/director/components/DirectorFormActions";
import DirectorRecordActions from "src/modules/director/components/DirectorRecordActions";
import DirectorSectionNav, { useDirectorSectionView } from "src/modules/director/components/DirectorSectionNav";
import DirectorDataTable from "src/modules/director/components/DirectorDataTable";
import PanelPageHeader from "src/components/PanelPageHeader";
import {
  DirectorCard,
  DirectorField,
  DirectorFormRow,
  DirectorInput,
  DirectorSelect,
  DirectorTextarea,
} from "src/modules/director/components/DirectorUi";
import {
  createDirectorExpense,
  deleteDirectorExpense,
  fetchDirectorExpenseChart,
  fetchDirectorExpenses,
  updateDirectorExpense,
} from "src/modules/director/director.api";
import { DIRECTOR_OPTION_CATEGORY, DIRECTOR_PAYMENT_LABELS, isLegacyDirectorRecord, todayIso } from "src/modules/director/director.consts";
import type { DirectorExpense, DirectorPaymentMethod } from "src/modules/director/director.types";
import { useBranches } from "src/modules/branches/useBranches";
import { formatAmd } from "src/pages/admin/finance/adminFinanceShared";
import {
  directorAmd,
  directorDate,
  directorOptionalComment,
  directorOptionalId,
  directorPayment,
  directorText,
} from "src/modules/director/directorFormValues";
import { useDirectorTable } from "src/modules/director/useDirectorTable";
import { getApiErrorMessage } from "src/lib/vivaApi";
import { useToast } from "src/lib/toast";
import { useCallback, useMemo, useState } from "react";
import { Receipt } from "lucide-react";
import {
  DirectorChartPanel,
  DirectorDoughnutChart,
  DirectorRankChart,
  DirectorReportGrid,
  DirectorReportSection,
  DirectorTrendChart,
} from "src/modules/director/components/DirectorCharts";
import { sumBy, sumByMonth, topN } from "src/modules/director/directorChartUtils";

const BASE_PATH = "/admin/director/expenses";

export default function DirectorExpensesPage() {
  const { showToast } = useToast();
  const { branches } = useBranches();
  const view = useDirectorSectionView(BASE_PATH);
  const { start, end, setStart, setEnd, query, branchFilterRevision } = useDirectorDateRange();
  const [rows, setRows] = useState<DirectorExpense[]>([]);
  const [chart, setChart] = useState<{ label: string; value: number }[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    date: todayIso(),
    branchId: branches[0]?.id ? String(branches[0].id) : "",
    expType: "Վարձակալություն",
    amount: "",
    paymentMethod: "card" as DirectorPaymentMethod,
    comment: "",
  });

  const load = useCallback(async () => {
    try {
      const [list, chartData] = await Promise.all([
        fetchDirectorExpenses(query),
        fetchDirectorExpenseChart(query),
      ]);
      setRows(Array.isArray(list) ? list : []);
      setChart(Array.isArray(chartData) ? chartData : []);
    } catch (e) {
      setRows([]);
      setChart([]);
      showToast(getApiErrorMessage(e), "error");
    }
  }, [query, showToast]);

  const reload = useDirectorReload(load, [query, branchFilterRevision]);

  const byType = useMemo(() => topN(chart, 8), [chart]);
  const byMonth = useMemo(() => sumByMonth(rows, (r) => r.date, (r) => r.amount), [rows]);
  const byPayment = useMemo(
    () => sumBy(rows, (r) => DIRECTOR_PAYMENT_LABELS[r.paymentMethod], (r) => r.amount).filter((p) => p.value > 0),
    [rows],
  );
  const totalAmount = useMemo(() => rows.reduce((s, r) => s + r.amount, 0), [rows]);

  const branchName = (id: number | null) => {
    if (id == null) return "—";
    const b = branches.find((x) => String(x.id) === String(id));
    return b?.label || b?.name || `#${id}`;
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({
      date: todayIso(),
      branchId: branches[0]?.id ? String(branches[0].id) : "",
      expType: "Վարձակալություն",
      amount: "",
      paymentMethod: "card" as DirectorPaymentMethod,
      comment: "",
    });
  };

  const submit = async () => {
    try {
      const body = {
        date: directorDate(form.date),
        branchId: directorOptionalId(form.branchId),
        expType: directorText(form.expType),
        amount: directorAmd(form.amount),
        paymentMethod: directorPayment(form.paymentMethod),
        comment: directorOptionalComment(form.comment),
      };
      if (editingId != null) {
        await updateDirectorExpense(editingId, body);
        showToast("Թարմացված է", "success");
      } else {
        await createDirectorExpense(body);
        showToast("Գրանցված է", "success");
      }
      resetForm();
      reload();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    }
  };

  const startEdit = (row: DirectorExpense) => {
    setEditingId(row.id);
    setForm({
      date: row.date,
      branchId: row.branchId != null ? String(row.branchId) : "",
      expType: row.expType,
      amount: String(row.amount),
      paymentMethod: row.paymentMethod,
      comment: row.comment ?? "",
    });
  };

  const tableColumns = useMemo(
    () => [
      {
        id: "date",
        header: "Ամսաթիվ",
        sortable: true,
        sortValue: (r: DirectorExpense) => r.date,
        searchValue: (r: DirectorExpense) => r.date,
        render: (r: DirectorExpense) => r.date,
      },
      {
        id: "expType",
        header: "Տեսակ",
        sortable: true,
        filterable: true,
        sortValue: (r: DirectorExpense) => r.expType,
        filterValue: (r: DirectorExpense) => r.expType,
        searchValue: (r: DirectorExpense) => r.expType,
        render: (r: DirectorExpense) => r.expType,
      },
      {
        id: "amount",
        header: "Գումար",
        sortable: true,
        sortValue: (r: DirectorExpense) => r.amount,
        searchValue: (r: DirectorExpense) => formatAmd(r.amount),
        render: (r: DirectorExpense) => formatAmd(r.amount),
      },
      {
        id: "payment",
        header: "Վճարում",
        sortable: true,
        filterable: true,
        sortValue: (r: DirectorExpense) => DIRECTOR_PAYMENT_LABELS[r.paymentMethod],
        filterValue: (r: DirectorExpense) => DIRECTOR_PAYMENT_LABELS[r.paymentMethod],
        searchValue: (r: DirectorExpense) => DIRECTOR_PAYMENT_LABELS[r.paymentMethod],
        render: (r: DirectorExpense) => DIRECTOR_PAYMENT_LABELS[r.paymentMethod],
      },
      {
        id: "branch",
        header: "Մասնաճյուղ",
        sortable: true,
        filterable: true,
        sortValue: (r: DirectorExpense) => branchName(r.branchId),
        filterValue: (r: DirectorExpense) => branchName(r.branchId),
        searchValue: (r: DirectorExpense) => branchName(r.branchId),
        render: (r: DirectorExpense) => branchName(r.branchId),
      },
      {
        id: "actions",
        header: "",
        align: "end" as const,
        render: (r: DirectorExpense) => (
          <DirectorRecordActions
            readOnly={isLegacyDirectorRecord(r.id)}
            onEdit={() => startEdit(r)}
            onDelete={() => void deleteDirectorExpense(r.id).then(reload)}
          />
        ),
      },
    ],
    [branches, reload],
  );

  const table = useDirectorTable({ rows, columns: tableColumns });

  return (
    <DirectorLayout>
      <PanelPageHeader icon={Receipt} title="Ծախսեր" />
      <DirectorDateFilters start={start} end={end} onStartChange={setStart} onEndChange={setEnd} onRefresh={reload} />
      <DirectorSectionNav basePath={BASE_PATH} />

      {view === "report" ? (
        <DirectorReportSection title={`Հաշվետվություն · ${formatAmd(totalAmount)}`}>
          <DirectorReportGrid>
            <DirectorChartPanel title="Ծախսեր ըստ ամիսների" subtitle="Ընդհանուր դինամիկա">
              <DirectorTrendChart points={byMonth} label="Ծախս" />
            </DirectorChartPanel>
            <DirectorChartPanel title="Ծախսի տեսակներ" subtitle="Լրացուցիչ բաժին">
              <DirectorDoughnutChart points={byType} />
            </DirectorChartPanel>
            <DirectorChartPanel title="Գլխավոր ծախսեր" subtitle="Top 8">
              <DirectorRankChart points={byType} />
            </DirectorChartPanel>
            <DirectorChartPanel title="Վճարման եղանակ" subtitle="Քարտ vs կանխիկ">
              <DirectorDoughnutChart points={byPayment} />
            </DirectorChartPanel>
          </DirectorReportGrid>
        </DirectorReportSection>
      ) : (
        <>
          <DirectorCard>
            <DirectorFormRow>
              <DirectorField label="Ամսաթիվ">
                <DirectorInput type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
              </DirectorField>
              <DirectorField label="Մասնաճյուղ">
                <DirectorSelect value={form.branchId} onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value }))}>
                  <option value="">—</option>
                  {branches.map((b) => (
                    <option key={b.id} value={String(b.id)}>{b.label || b.name}</option>
                  ))}
                </DirectorSelect>
              </DirectorField>
              <DirectorField label="Ծախսի տեսակ">
                <DirectorDynamicSelect
                  category={DIRECTOR_OPTION_CATEGORY.expType}
                  value={form.expType}
                  onChange={(expType) => setForm((f) => ({ ...f, expType }))}
                />
              </DirectorField>
              <DirectorField label="Գումար">
                <DirectorInput value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
              </DirectorField>
              <DirectorField label="Վճարում">
                <DirectorPaymentSelect value={form.paymentMethod} onChange={(paymentMethod) => setForm((f) => ({ ...f, paymentMethod }))} />
              </DirectorField>
              <DirectorField label="Մեկնաբանություն">
                <DirectorTextarea rows={3} value={form.comment} onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))} />
              </DirectorField>
              <DirectorFormActions
                editing={editingId != null}
                createLabel="Գրանցել ծախս"
                onSubmit={() => void submit()}
                onCancel={resetForm}
              />
            </DirectorFormRow>
          </DirectorCard>
          <DirectorDataTable table={table} columns={tableColumns} rowKey={(r) => r.id} />
        </>
      )}
    </DirectorLayout>
  );
}
