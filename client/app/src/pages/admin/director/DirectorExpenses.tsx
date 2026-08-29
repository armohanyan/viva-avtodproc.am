import DirectorLayout from "src/modules/director/DirectorLayout";
import DirectorDynamicSelect from "src/modules/director/components/DirectorDynamicSelect";
import DirectorPaymentSelect from "src/modules/director/components/DirectorPaymentSelect";
import DirectorDateFilters, {
  useDirectorDateRange,
  useDirectorReload,
} from "src/modules/director/components/DirectorDateFilters";
import DirectorFormActions from "src/modules/director/components/DirectorFormActions";
import DirectorRecordActions from "src/modules/director/components/DirectorRecordActions";
import PanelPageHeader from "src/components/PanelPageHeader";
import {
  DirectorCard,
  DirectorField,
  DirectorFormRow,
  DirectorInput,
  DirectorSelect,
  DirectorTextarea,
  DirectorTableBody,
  DirectorTableHead,
  DirectorTableRow,
  DirectorTableTd,
  DirectorTableTh,
  DirectorTableWrap,
} from "src/modules/director/components/DirectorUi";
import {
  createDirectorExpense,
  deleteDirectorExpense,
  fetchDirectorExpenseChart,
  fetchDirectorExpenses,
  updateDirectorExpense,
} from "src/modules/director/director.api";
import { DIRECTOR_OPTION_CATEGORY, DIRECTOR_PAYMENT_LABELS, todayIso } from "src/modules/director/director.consts";
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
import { getApiErrorMessage } from "src/lib/vivaApi";
import { useToast } from "src/lib/toast";
import { useCallback, useState } from "react";
import { Doughnut } from "react-chartjs-2";
import { Receipt } from "lucide-react";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

const CHART_COLORS = [
  "hsl(var(--primary))",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-1)",
];

export default function DirectorExpensesPage() {
  const { showToast } = useToast();
  const { branches } = useBranches();
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

  const buildBody = () => ({
    date: directorDate(form.date),
    branchId: directorOptionalId(form.branchId),
    expType: directorText(form.expType),
    amount: directorAmd(form.amount),
    paymentMethod: directorPayment(form.paymentMethod),
    comment: directorOptionalComment(form.comment),
  });

  const submit = async () => {
    try {
      const body = buildBody();
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

  const branchName = (id: number | null) => {
    if (id == null) return "—";
    const b = branches.find((x) => String(x.id) === String(id));
    return b?.label || b?.name || `#${id}`;
  };

  return (
    <DirectorLayout>
      <PanelPageHeader icon={Receipt} title="Ծախսեր" />
      <DirectorCard>
        <DirectorDateFilters start={start} end={end} onStartChange={setStart} onEndChange={setEnd} onRefresh={reload} />
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
        {chart.length > 0 ? (
          <div className="mt-6 h-52 max-w-xs mx-auto">
            <Doughnut
              data={{
                labels: chart.map((c) => c.label),
                datasets: [{
                  data: chart.map((c) => c.value),
                  backgroundColor: chart.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]),
                }],
              }}
              options={{ plugins: { legend: { display: true } } }}
            />
          </div>
        ) : null}
      </DirectorCard>
      <DirectorTableWrap>
        <DirectorTableHead>
          <DirectorTableTh>Ամսաթիվ</DirectorTableTh>
          <DirectorTableTh>Տեսակ</DirectorTableTh>
          <DirectorTableTh>Գումար</DirectorTableTh>
          <DirectorTableTh>Վճարում</DirectorTableTh>
          <DirectorTableTh>Մասնաճյուղ</DirectorTableTh>
          <DirectorTableTh />
        </DirectorTableHead>
        <DirectorTableBody>
          {rows.map((r) => (
            <DirectorTableRow key={r.id}>
              <DirectorTableTd>{r.date}</DirectorTableTd>
              <DirectorTableTd>{r.expType}</DirectorTableTd>
              <DirectorTableTd>{formatAmd(r.amount)}</DirectorTableTd>
              <DirectorTableTd>{DIRECTOR_PAYMENT_LABELS[r.paymentMethod]}</DirectorTableTd>
              <DirectorTableTd>{branchName(r.branchId)}</DirectorTableTd>
              <DirectorTableTd>
                <DirectorRecordActions
                  onEdit={() => startEdit(r)}
                  onDelete={() => void deleteDirectorExpense(r.id).then(reload)}
                />
              </DirectorTableTd>
            </DirectorTableRow>
          ))}
        </DirectorTableBody>
      </DirectorTableWrap>
    </DirectorLayout>
  );
}
