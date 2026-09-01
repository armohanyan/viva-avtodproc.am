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
  DirectorStatCard,
  DirectorStatGrid,
} from "src/modules/director/components/DirectorUi";
import {
  createDirectorFuel,
  deleteDirectorFuel,
  fetchDirectorFuel,
  updateDirectorFuel,
} from "src/modules/director/director.api";
import { DIRECTOR_OPTION_CATEGORY, DIRECTOR_PAYMENT_LABELS, isLegacyDirectorRecord, todayIso } from "src/modules/director/director.consts";
import type { DirectorFuel, DirectorPaymentMethod } from "src/modules/director/director.types";
import type { Instructor } from "src/data/instructors";
import { formatAmd } from "src/pages/admin/finance/adminFinanceShared";
import { useBranches } from "src/modules/branches";
import { useCities } from "src/modules/cities";
import {
  directorInstructorLabelById,
  formatDirectorInstructorLabel,
} from "src/modules/director/directorInstructorLabels";
import {
  directorAmd,
  directorDate,
  directorDecimal,
  directorOptionalId,
  directorPayment,
  directorText,
} from "src/modules/director/directorFormValues";
import { useDirectorTable } from "src/modules/director/useDirectorTable";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { useToast } from "src/lib/toast";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Fuel } from "lucide-react";
import {
  DirectorChartPanel,
  DirectorRankChart,
  DirectorReportGrid,
  DirectorReportSection,
  DirectorTrendChart,
} from "src/modules/director/components/DirectorCharts";
import { sumBy, sumByMonth, topN } from "src/modules/director/directorChartUtils";

const BASE_PATH = "/admin/director/fuel";

type CarOption = { id: number; plate?: string; model?: string };

export default function DirectorFuelPage() {
  const { showToast } = useToast();
  const view = useDirectorSectionView(BASE_PATH);
  const { start, end, setStart, setEnd, query, branchFilterRevision } = useDirectorDateRange();
  const [rows, setRows] = useState<DirectorFuel[]>([]);
  const { branches } = useBranches();
  const { cities } = useCities();
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [cars, setCars] = useState<CarOption[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    date: todayIso(),
    instructorUserId: "",
    carId: "",
    fuelType: "Գազ",
    liters: "",
    amount: "",
    paymentMethod: "card" as DirectorPaymentMethod,
  });

  useEffect(() => {
    void vivaApiJson<Instructor[]>("/instructors").then((d) => setInstructors(Array.isArray(d) ? d : [])).catch(() => setInstructors([]));
    void vivaApiJson<CarOption[]>("/fleet/cars").then((d) => setCars(Array.isArray(d) ? d : [])).catch(() => setCars([]));
  }, []);

  const load = useCallback(async () => {
    try {
      const fuel = await fetchDirectorFuel(query);
      setRows(Array.isArray(fuel) ? fuel : []);
    } catch (e) {
      setRows([]);
      showToast(getApiErrorMessage(e), "error");
    }
  }, [query, showToast]);

  const reload = useDirectorReload(load, [query, branchFilterRevision]);

  const instructorName = (id: number | null) =>
    directorInstructorLabelById(id, instructors, branches, cities);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      date: todayIso(),
      instructorUserId: "",
      carId: "",
      fuelType: "Գազ",
      liters: "",
      amount: "",
      paymentMethod: "card" as DirectorPaymentMethod,
    });
  };

  const submit = async () => {
    try {
      const body = {
        date: directorDate(form.date),
        instructorUserId: directorOptionalId(form.instructorUserId),
        carId: directorOptionalId(form.carId),
        fuelType: directorText(form.fuelType),
        liters: directorDecimal(form.liters),
        amount: directorAmd(form.amount),
        paymentMethod: directorPayment(form.paymentMethod),
      };
      if (editingId != null) {
        await updateDirectorFuel(editingId, body);
        showToast("Թարմացված է", "success");
      } else {
        await createDirectorFuel(body);
        showToast("Գրանցված է", "success");
      }
      resetForm();
      reload();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    }
  };

  const startEdit = (row: DirectorFuel) => {
    setEditingId(row.id);
    setForm({
      date: row.date,
      instructorUserId: row.instructorUserId != null ? String(row.instructorUserId) : "",
      carId: row.carId != null ? String(row.carId) : "",
      fuelType: row.fuelType,
      liters: String(row.liters),
      amount: String(row.amount),
      paymentMethod: row.paymentMethod,
    });
  };

  const fuelByMonth = useMemo(() => sumByMonth(rows, (r) => r.date, (r) => r.amount), [rows]);
  const litersByMonth = useMemo(() => sumByMonth(rows, (r) => r.date, (r) => r.liters), [rows]);
  const fuelByInstructor = useMemo(
    () => topN(sumBy(rows, (r) => instructorName(r.instructorUserId), (r) => r.amount), 8),
    [rows, instructors, branches, cities],
  );
  const totalFuel = useMemo(() => rows.reduce((s, r) => s + r.amount, 0), [rows]);
  const totalLiters = useMemo(() => rows.reduce((s, r) => s + r.liters, 0), [rows]);

  const tableColumns = useMemo(
    () => [
      {
        id: "date",
        header: "Ամսաթիվ",
        sortable: true,
        sortValue: (r: DirectorFuel) => r.date,
        searchValue: (r: DirectorFuel) => r.date,
        render: (r: DirectorFuel) => r.date,
      },
      {
        id: "instructor",
        header: "Հրահանգիչ",
        sortable: true,
        filterable: true,
        sortValue: (r: DirectorFuel) => instructorName(r.instructorUserId),
        filterValue: (r: DirectorFuel) => instructorName(r.instructorUserId),
        searchValue: (r: DirectorFuel) => instructorName(r.instructorUserId),
        render: (r: DirectorFuel) => instructorName(r.instructorUserId),
      },
      {
        id: "fuelType",
        header: "Վառելիք",
        sortable: true,
        filterable: true,
        sortValue: (r: DirectorFuel) => r.fuelType,
        filterValue: (r: DirectorFuel) => r.fuelType,
        searchValue: (r: DirectorFuel) => r.fuelType,
        render: (r: DirectorFuel) => r.fuelType,
      },
      {
        id: "liters",
        header: "Լիտր",
        sortable: true,
        sortValue: (r: DirectorFuel) => r.liters,
        searchValue: (r: DirectorFuel) => String(r.liters),
        render: (r: DirectorFuel) => r.liters.toFixed(1),
      },
      {
        id: "amount",
        header: "Գումար",
        sortable: true,
        filterValue: (r: DirectorFuel) => DIRECTOR_PAYMENT_LABELS[r.paymentMethod],
        filterable: true,
        sortValue: (r: DirectorFuel) => r.amount,
        searchValue: (r: DirectorFuel) => `${formatAmd(r.amount)} ${DIRECTOR_PAYMENT_LABELS[r.paymentMethod]}`,
        render: (r: DirectorFuel) => `${formatAmd(r.amount)} (${DIRECTOR_PAYMENT_LABELS[r.paymentMethod]})`,
      },
      {
        id: "actions",
        header: "",
        align: "end" as const,
        render: (r: DirectorFuel) => (
          <DirectorRecordActions
            readOnly={isLegacyDirectorRecord(r.id)}
            onEdit={() => startEdit(r)}
            onDelete={() => void deleteDirectorFuel(r.id).then(reload)}
          />
        ),
      },
    ],
    [instructors, branches, cities, reload],
  );

  const table = useDirectorTable({ rows, columns: tableColumns });

  return (
    <DirectorLayout>
      <PanelPageHeader icon={Fuel} title="Վառելիք" />
      <DirectorDateFilters start={start} end={end} onStartChange={setStart} onEndChange={setEnd} onRefresh={reload} />
      <DirectorSectionNav basePath={BASE_PATH} />

      {view === "report" ? (
        <DirectorReportSection title={`Հաշվետվություն · ${formatAmd(totalFuel)} · ${totalLiters.toFixed(0)} լ`}>
          <DirectorStatGrid>
            <DirectorStatCard label="Վառելիք (AMD)" value={formatAmd(totalFuel)} />
            <DirectorStatCard label="Լիտր" value={totalLiters.toFixed(1)} />
            <DirectorStatCard label="Գրառումներ" value={rows.length} />
          </DirectorStatGrid>
          <DirectorReportGrid className="mt-4">
            <DirectorChartPanel title="Վառելիք ըստ ամիսների" subtitle="Գումար (AMD)">
              <DirectorTrendChart points={fuelByMonth} label="Վառելիք" />
            </DirectorChartPanel>
            <DirectorChartPanel title="Լիտր ըստ ամիսների">
              <DirectorTrendChart points={litersByMonth} label="Լիտր" />
            </DirectorChartPanel>
            <DirectorChartPanel title="Հրահանգիչներ Top 8">
              <DirectorRankChart points={fuelByInstructor} />
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
              <DirectorField label="Հրահանգիչ">
                <DirectorSelect value={form.instructorUserId} onChange={(e) => setForm((f) => ({ ...f, instructorUserId: e.target.value }))}>
                  <option value="">—</option>
                  {instructors.map((i) => (
                    <option key={i.id} value={String(i.id)}>{formatDirectorInstructorLabel(i, branches, cities)}</option>
                  ))}
                </DirectorSelect>
              </DirectorField>
              <DirectorField label="Մեքենա">
                <DirectorSelect value={form.carId} onChange={(e) => setForm((f) => ({ ...f, carId: e.target.value }))}>
                  <option value="">—</option>
                  {cars.map((c) => (
                    <option key={c.id} value={String(c.id)}>{c.plate || c.model}</option>
                  ))}
                </DirectorSelect>
              </DirectorField>
              <DirectorField label="Վառելիք">
                <DirectorDynamicSelect
                  category={DIRECTOR_OPTION_CATEGORY.fuelType}
                  value={form.fuelType}
                  onChange={(fuelType) => setForm((f) => ({ ...f, fuelType }))}
                />
              </DirectorField>
              <DirectorField label="Լիտր">
                <DirectorInput value={form.liters} onChange={(e) => setForm((f) => ({ ...f, liters: e.target.value }))} />
              </DirectorField>
              <DirectorField label="Գումար">
                <DirectorInput value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
              </DirectorField>
              <DirectorField label="Վճարում">
                <DirectorPaymentSelect value={form.paymentMethod} onChange={(paymentMethod) => setForm((f) => ({ ...f, paymentMethod }))} />
              </DirectorField>
              <DirectorFormActions
                editing={editingId != null}
                createLabel="Գրանցել վառելիք"
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
