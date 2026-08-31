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
import {
  DirectorCard,
  DirectorField,
  DirectorFormRow,
  DirectorInput,
  DirectorSelect,
  DirectorTextarea,
} from "src/modules/director/components/DirectorUi";
import {
  createDirectorCash,
  deleteDirectorCash,
  fetchDirectorCash,
  updateDirectorCash,
} from "src/modules/director/director.api";
import { DIRECTOR_OPTION_CATEGORY, todayIso } from "src/modules/director/director.consts";
import type { DirectorCashEntry } from "src/modules/director/director.types";
import { useBranches } from "src/modules/branches/useBranches";
import { formatAmd } from "src/pages/admin/finance/adminFinanceShared";
import {
  directorAmd,
  directorDate,
  directorOptionalComment,
  directorOptionalId,
  directorText,
} from "src/modules/director/directorFormValues";
import { useDirectorTable } from "src/modules/director/useDirectorTable";
import { getApiErrorMessage } from "src/lib/vivaApi";
import { useToast } from "src/lib/toast";
import { useCallback, useMemo, useState } from "react";
import { Wallet } from "lucide-react";
import {
  DirectorChartPanel,
  DirectorDoughnutChart,
  DirectorRankChart,
  DirectorReportGrid,
  DirectorReportSection,
  DirectorTrendChart,
} from "src/modules/director/components/DirectorCharts";
import { cumulativeBalance, sumBy, sumByMonth } from "src/modules/director/directorChartUtils";

const BASE_PATH = "/admin/director/cash";

type CashForm = {
  date: string;
  branchId: string;
  entryType: string;
  amount: string;
  comment: string;
};

function emptyCashForm(branchId = ""): CashForm {
  return {
    date: todayIso(),
    branchId,
    entryType: "Ինկասացիա",
    amount: "",
    comment: "",
  };
}

export default function DirectorCashPage() {
  const { showToast } = useToast();
  const { branches } = useBranches();
  const view = useDirectorSectionView(BASE_PATH);
  const { start, end, setStart, setEnd, query, branchFilterRevision } = useDirectorDateRange();
  const [rows, setRows] = useState<DirectorCashEntry[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<CashForm>(() =>
    emptyCashForm(branches[0]?.id ? String(branches[0].id) : ""),
  );

  const load = useCallback(async () => {
    try {
      const list = await fetchDirectorCash(query);
      setRows(Array.isArray(list) ? list : []);
    } catch (e) {
      setRows([]);
      showToast(getApiErrorMessage(e), "error");
    }
  }, [query, showToast]);

  const reload = useDirectorReload(load, [query, branchFilterRevision]);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyCashForm(branches[0]?.id ? String(branches[0].id) : ""));
  };

  const buildBody = () => ({
    date: directorDate(form.date),
    branchId: directorOptionalId(form.branchId),
    entryType: directorText(form.entryType),
    amount: directorAmd(form.amount),
    comment: directorOptionalComment(form.comment),
  });

  const submit = async () => {
    try {
      const body = buildBody();
      if (editingId != null) {
        await updateDirectorCash(editingId, body);
        showToast("Թարմացված է", "success");
      } else {
        await createDirectorCash(body);
        showToast("Գրանցված է", "success");
      }
      resetForm();
      reload();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    }
  };

  const startEdit = (row: DirectorCashEntry) => {
    setEditingId(row.id);
    setForm({
      date: row.date,
      branchId: row.branchId != null ? String(row.branchId) : "",
      entryType: row.entryType,
      amount: String(row.amount),
      comment: row.comment ?? "",
    });
  };

  const branchName = (id: number | null) => {
    if (id == null) return "—";
    const b = branches.find((x) => String(x.id) === String(id));
    return b?.label || b?.name || `#${id}`;
  };

  const byType = useMemo(
    () => sumBy(rows, (r) => r.entryType, (r) => Math.abs(r.amount)).filter((p) => p.value > 0),
    [rows],
  );
  const byMonth = useMemo(() => sumByMonth(rows, (r) => r.date, (r) => r.amount), [rows]);
  const balanceTrend = useMemo(() => cumulativeBalance(rows), [rows]);
  const netBalance = useMemo(() => rows.reduce((s, r) => s + r.amount, 0), [rows]);

  const tableColumns = useMemo(
    () => [
      {
        id: "date",
        header: "Ամսաթիվ",
        sortable: true,
        sortValue: (r: DirectorCashEntry) => r.date,
        searchValue: (r: DirectorCashEntry) => r.date,
        render: (r: DirectorCashEntry) => r.date,
      },
      {
        id: "branch",
        header: "Մասնաճյուղ",
        sortable: true,
        filterable: true,
        sortValue: (r: DirectorCashEntry) => branchName(r.branchId),
        filterValue: (r: DirectorCashEntry) => branchName(r.branchId),
        searchValue: (r: DirectorCashEntry) => branchName(r.branchId),
        render: (r: DirectorCashEntry) => branchName(r.branchId),
      },
      {
        id: "entryType",
        header: "Տեսակ",
        sortable: true,
        filterable: true,
        sortValue: (r: DirectorCashEntry) => r.entryType,
        filterValue: (r: DirectorCashEntry) => r.entryType,
        searchValue: (r: DirectorCashEntry) => r.entryType,
        render: (r: DirectorCashEntry) => r.entryType,
      },
      {
        id: "amount",
        header: "Գումար",
        sortable: true,
        sortValue: (r: DirectorCashEntry) => r.amount,
        searchValue: (r: DirectorCashEntry) => formatAmd(r.amount),
        render: (r: DirectorCashEntry) => formatAmd(r.amount),
      },
      {
        id: "comment",
        header: "Մեկնաբանություն",
        searchValue: (r: DirectorCashEntry) => r.comment ?? "",
        render: (r: DirectorCashEntry) => r.comment ?? "—",
      },
      {
        id: "actions",
        header: "",
        align: "end" as const,
        render: (r: DirectorCashEntry) => (
          <DirectorRecordActions
            onEdit={() => startEdit(r)}
            onDelete={() => void deleteDirectorCash(r.id).then(reload)}
          />
        ),
      },
    ],
    [branches, reload],
  );

  const table = useDirectorTable({ rows, columns: tableColumns });

  return (
    <DirectorLayout>
      <PanelPageHeader icon={Wallet} title="Կասսա / Ինկասացիա" />
      <DirectorDateFilters start={start} end={end} onStartChange={setStart} onEndChange={setEnd} onRefresh={reload} />
      <DirectorSectionNav basePath={BASE_PATH} />

      {view === "report" ? (
        <DirectorReportSection title={`Հաշվետվություն · ${formatAmd(netBalance)}`}>
          <DirectorReportGrid>
            <DirectorChartPanel title="Կուտակային մնացորդ" subtitle="Ըստ ամսաթվերի">
              <DirectorTrendChart points={balanceTrend} label="Մնացորդ" />
            </DirectorChartPanel>
            <DirectorChartPanel title="Շարժ ըստ ամիսների">
              <DirectorTrendChart points={byMonth} label="Գումար" />
            </DirectorChartPanel>
            <DirectorChartPanel title="Ըստ տեսակի">
              <DirectorDoughnutChart points={byType} />
            </DirectorChartPanel>
            <DirectorChartPanel title="Տեսակներ">
              <DirectorRankChart points={byType} />
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
              <DirectorField label="Տեսակ">
                <DirectorDynamicSelect
                  category={DIRECTOR_OPTION_CATEGORY.cashType}
                  value={form.entryType}
                  onChange={(entryType) => setForm((f) => ({ ...f, entryType }))}
                />
              </DirectorField>
              <DirectorField label="Գումար">
                <DirectorInput value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
              </DirectorField>
              <DirectorField label="Մեկնաբանություն">
                <DirectorTextarea rows={3} value={form.comment} onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))} />
              </DirectorField>
              <DirectorFormActions
                editing={editingId != null}
                createLabel="Գրանցել կասսա"
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
