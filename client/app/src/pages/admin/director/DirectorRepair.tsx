import DirectorLayout from "src/modules/director/DirectorLayout";
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
import { createDirectorRepair, deleteDirectorRepair, fetchDirectorRepairs, updateDirectorRepair } from "src/modules/director/director.api";
import { DIRECTOR_PAYMENT_LABELS, isLegacyDirectorRecord, todayIso } from "src/modules/director/director.consts";
import type { DirectorPaymentMethod, DirectorRepair } from "src/modules/director/director.types";
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
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { useToast } from "src/lib/toast";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Wrench } from "lucide-react";
import {
  DirectorChartPanel,
  DirectorDoughnutChart,
  DirectorRankChart,
  DirectorReportGrid,
  DirectorReportSection,
  DirectorTrendChart,
} from "src/modules/director/components/DirectorCharts";
import { sumBy, sumByMonth, topN } from "src/modules/director/directorChartUtils";

const BASE_PATH = "/admin/director/repair";

type CarOption = { id: number; label: string };

export default function DirectorRepairPage() {
  const { showToast } = useToast();
  const view = useDirectorSectionView(BASE_PATH);
  const { start, end, setStart, setEnd, query, branchFilterRevision } = useDirectorDateRange();
  const [rows, setRows] = useState<DirectorRepair[]>([]);
  const [cars, setCars] = useState<CarOption[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    date: todayIso(),
    carId: "",
    licensePlate: "",
    workDone: "",
    amount: "",
    paymentMethod: "card" as DirectorPaymentMethod,
    comment: "",
  });

  useEffect(() => {
    void vivaApiJson<CarOption[]>("/fleet/cars")
      .then((data) => setCars(Array.isArray(data) ? data.map((c: { id: number; plate?: string; model?: string }) => ({ id: c.id, label: c.plate || c.model || `#${c.id}` })) : []))
      .catch(() => setCars([]));
  }, []);

  const load = useCallback(async () => {
    try {
      const list = await fetchDirectorRepairs(query);
      setRows(Array.isArray(list) ? list : []);
    } catch (e) {
      setRows([]);
      showToast(getApiErrorMessage(e), "error");
    }
  }, [query, showToast]);

  const reload = useDirectorReload(load, [query, branchFilterRevision]);

  const carLabel = (id: number | null, plate: string | null) => {
    if (plate) return plate;
    if (id) return cars.find((c) => c.id === id)?.label ?? `#${id}`;
    return "—";
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({
      date: todayIso(),
      carId: "",
      licensePlate: "",
      workDone: "",
      amount: "",
      paymentMethod: "card" as DirectorPaymentMethod,
      comment: "",
    });
  };

  const submit = async () => {
    try {
      const body = {
        date: directorDate(form.date),
        carId: directorOptionalId(form.carId),
        licensePlate: directorOptionalComment(form.licensePlate),
        workDone: directorText(form.workDone),
        amount: directorAmd(form.amount),
        paymentMethod: directorPayment(form.paymentMethod),
        comment: directorOptionalComment(form.comment),
      };
      if (editingId != null) {
        await updateDirectorRepair(editingId, body);
        showToast("Թարմացված է", "success");
      } else {
        await createDirectorRepair(body);
        showToast("Գրանցված է", "success");
      }
      resetForm();
      reload();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    }
  };

  const startEdit = (row: DirectorRepair) => {
    setEditingId(row.id);
    setForm({
      date: row.date,
      carId: row.carId != null ? String(row.carId) : "",
      licensePlate: row.licensePlate ?? "",
      workDone: row.workDone,
      amount: String(row.amount),
      paymentMethod: row.paymentMethod,
      comment: row.comment ?? "",
    });
  };

  const byMonth = useMemo(() => sumByMonth(rows, (r) => r.date, (r) => r.amount), [rows]);
  const byCar = useMemo(
    () => topN(sumBy(rows, (r) => carLabel(r.carId, r.licensePlate), (r) => r.amount), 8),
    [rows, cars],
  );
  const byPayment = useMemo(
    () => sumBy(rows, (r) => DIRECTOR_PAYMENT_LABELS[r.paymentMethod], (r) => r.amount).filter((p) => p.value > 0),
    [rows],
  );
  const totalRepair = useMemo(() => rows.reduce((s, r) => s + r.amount, 0), [rows]);

  const tableColumns = useMemo(
    () => [
      {
        id: "date",
        header: "Ամսաթիվ",
        sortable: true,
        sortValue: (r: DirectorRepair) => r.date,
        searchValue: (r: DirectorRepair) => r.date,
        render: (r: DirectorRepair) => r.date,
      },
      {
        id: "car",
        header: "Մեքենա",
        sortable: true,
        filterable: true,
        sortValue: (r: DirectorRepair) => carLabel(r.carId, r.licensePlate),
        filterValue: (r: DirectorRepair) => carLabel(r.carId, r.licensePlate),
        searchValue: (r: DirectorRepair) => carLabel(r.carId, r.licensePlate),
        render: (r: DirectorRepair) => carLabel(r.carId, r.licensePlate),
      },
      {
        id: "workDone",
        header: "Ինչ է արվել",
        sortable: true,
        searchValue: (r: DirectorRepair) => r.workDone,
        sortValue: (r: DirectorRepair) => r.workDone,
        render: (r: DirectorRepair) => r.workDone,
      },
      {
        id: "amount",
        header: "Գումար",
        sortable: true,
        sortValue: (r: DirectorRepair) => r.amount,
        searchValue: (r: DirectorRepair) => formatAmd(r.amount),
        render: (r: DirectorRepair) => formatAmd(r.amount),
      },
      {
        id: "payment",
        header: "Վճարում",
        sortable: true,
        filterable: true,
        sortValue: (r: DirectorRepair) => DIRECTOR_PAYMENT_LABELS[r.paymentMethod],
        filterValue: (r: DirectorRepair) => DIRECTOR_PAYMENT_LABELS[r.paymentMethod],
        searchValue: (r: DirectorRepair) => DIRECTOR_PAYMENT_LABELS[r.paymentMethod],
        render: (r: DirectorRepair) => DIRECTOR_PAYMENT_LABELS[r.paymentMethod],
      },
      {
        id: "actions",
        header: "",
        align: "end" as const,
        render: (r: DirectorRepair) => (
          <DirectorRecordActions
            readOnly={isLegacyDirectorRecord(r.id)}
            onEdit={() => startEdit(r)}
            onDelete={() => void deleteDirectorRepair(r.id).then(reload)}
          />
        ),
      },
    ],
    [cars, reload],
  );

  const table = useDirectorTable({ rows, columns: tableColumns });

  return (
    <DirectorLayout>
      <PanelPageHeader icon={Wrench} title="Մեքենայի վերանորոգում" />
      <DirectorDateFilters start={start} end={end} onStartChange={setStart} onEndChange={setEnd} onRefresh={reload} />
      <DirectorSectionNav basePath={BASE_PATH} />

      {view === "report" ? (
        <DirectorReportSection title={`Հաշվետվություն · ${formatAmd(totalRepair)} · ${rows.length} գրառում`}>
          <DirectorReportGrid>
            <DirectorChartPanel title="Ծախսեր ըստ ամիսների">
              <DirectorTrendChart points={byMonth} label="Վերանորոգում" />
            </DirectorChartPanel>
            <DirectorChartPanel title="Ըստ մեքենայի Top 8">
              <DirectorRankChart points={byCar} />
            </DirectorChartPanel>
            <DirectorChartPanel title="Վճարման եղանակ">
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
              <DirectorField label="Մեքենա">
                <DirectorSelect value={form.carId} onChange={(e) => setForm((f) => ({ ...f, carId: e.target.value }))}>
                  <option value="">—</option>
                  {cars.map((c) => (
                    <option key={c.id} value={String(c.id)}>{c.label}</option>
                  ))}
                </DirectorSelect>
              </DirectorField>
              <DirectorField label="Պետհամարանիշ">
                <DirectorInput value={form.licensePlate} onChange={(e) => setForm((f) => ({ ...f, licensePlate: e.target.value }))} />
              </DirectorField>
              <DirectorField label="Ինչ է արվել">
                <DirectorInput value={form.workDone} onChange={(e) => setForm((f) => ({ ...f, workDone: e.target.value }))} />
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
                createLabel="Գրանցել վերանորոգում"
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
