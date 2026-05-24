import AdminTableScroll from "src/components/AdminTableScroll";
import AdminTableRowActions, { AdminTableRowContextMenu } from "src/components/AdminTableRowActions";
import ConfirmDialog from "src/components/ConfirmDialog";
import { AppModal } from "src/components/AppModal";
import DataTableToolbar from "src/components/DataTableToolbar";
import { Button } from "src/components/ui/button";
import { Card } from "src/components/ui/card";
import { Input } from "src/components/ui/input";
import {
  DEFAULT_DISTANCE_UNIT,
  DEFAULT_PETROL_VOLUME_UNIT,
  DISTANCE_UNIT_OPTIONS,
  PETROL_VOLUME_UNIT_OPTIONS,
  type DistanceUnit,
  type PetrolVolumeUnit,
} from "src/constants/petrol-consumption-units";
import { useLang } from "src/lib/i18n";
import { yerevanTodayIso } from "src/lib/yerevanLessonCalendar";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { useToast } from "src/lib/toast";
import { useOptionalAdminBranchFilterRevision } from "src/modules/admin/AdminBranchFilterProvider";
import { useFleetCars } from "src/modules/cars";
import { useInstructors } from "src/modules/instructors/useInstructors";
import type {
  PetrolConsumptionBody,
  PetrolConsumptionListResponse,
  PetrolConsumptionRow,
} from "src/types/petrol-consumption.types";
import { formatShortDateFromIso } from "src/utils/locale.utils";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { Plus, Edit2, Trash2, Gauge, Route } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const CHART_AXIS = "#94a3b8";
const CHART_GRID = "rgba(148, 163, 184, 0.12)";
const DISTANCE_COLOR = "rgba(255, 138, 0, 0.55)";
const DISTANCE_BORDER = "#FF8A00";
const PETROL_COLOR = "rgba(56, 189, 248, 0.45)";
const PETROL_BORDER = "rgb(56, 189, 248)";

type ConsumptionFormState = {
  carId: string;
  instructorUserId: string;
  date: string;
  distanceValue: string;
  distanceUnit: DistanceUnit;
  petrolAmount: string;
  petrolUnit: PetrolVolumeUnit;
  description: string;
};

function emptyForm(dateIso: string): ConsumptionFormState {
  return {
    carId: "",
    instructorUserId: "",
    date: dateIso,
    distanceValue: "",
    distanceUnit: DEFAULT_DISTANCE_UNIT,
    petrolAmount: "",
    petrolUnit: DEFAULT_PETROL_VOLUME_UNIT,
    description: "",
  };
}

function formFromRow(row: PetrolConsumptionRow): ConsumptionFormState {
  return {
    carId: String(row.carId),
    instructorUserId: String(row.instructorUserId),
    date: row.date.slice(0, 10),
    distanceValue: String(row.distanceValue),
    distanceUnit: row.distanceUnit,
    petrolAmount: row.petrolAmount != null ? String(row.petrolAmount) : "",
    petrolUnit: row.petrolUnit,
    description: row.description ?? "",
  };
}

function buildBody(form: ConsumptionFormState): PetrolConsumptionBody | null {
  const carId = Number.parseInt(form.carId, 10);
  const instructorUserId = Number.parseInt(form.instructorUserId, 10);
  const date = form.date.slice(0, 10);
  const distanceValue = Number.parseFloat(form.distanceValue.replace(",", "."));
  const petrolRaw = form.petrolAmount.trim();
  const petrolAmount =
    petrolRaw === "" ? null : Number.parseFloat(petrolRaw.replace(",", "."));
  const description = form.description.trim() || null;

  if (
    !Number.isFinite(carId) ||
    carId <= 0 ||
    !Number.isFinite(instructorUserId) ||
    instructorUserId <= 0 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(distanceValue) ||
    distanceValue <= 0 ||
    (petrolAmount != null && (!Number.isFinite(petrolAmount) || petrolAmount <= 0)) ||
    !DISTANCE_UNIT_OPTIONS.some((o) => o.value === form.distanceUnit) ||
    !PETROL_VOLUME_UNIT_OPTIONS.some((o) => o.value === form.petrolUnit)
  ) {
    return null;
  }

  return {
    carId,
    instructorUserId,
    date,
    distanceValue,
    distanceUnit: form.distanceUnit,
    petrolAmount,
    petrolUnit: form.petrolUnit,
    description,
  };
}

function formatNum(n: number, maxFrac = 2): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: maxFrac, minimumFractionDigits: 0 });
}

function carOptionLabel(car: { plate: string; make: string; model: string; id: string | number }): string {
  const plate = car.plate?.trim() || `#${car.id}`;
  const mm = [car.make, car.model].filter(Boolean).join(" ").trim();
  return mm ? `${plate} · ${mm}` : plate;
}

function formatDistanceCell(row: PetrolConsumptionRow): string {
  return `${formatNum(row.distanceValue)} ${row.distanceUnitLabel}`;
}

function formatPetrolCell(row: PetrolConsumptionRow): string {
  if (row.petrolAmount == null) return "—";
  return `${formatNum(row.petrolAmount)} ${row.petrolUnitLabel}`;
}

export default function AdminPetrolConsumptionTab() {
  const branchFilterRevision = useOptionalAdminBranchFilterRevision();
  const addFormId = useId();
  const editFormId = useId();
  const { t, lang } = useLang();
  const { showToast } = useToast();
  const { cars } = useFleetCars();
  const { instructors } = useInstructors();

  const todayIso = useMemo(() => yerevanTodayIso(), []);
  const [startDate, setStartDate] = useState(todayIso);
  const [endDate, setEndDate] = useState(todayIso);
  const [filterInstructorId, setFilterInstructorId] = useState("");
  const [filterCarId, setFilterCarId] = useState("");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<PetrolConsumptionListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(() => emptyForm(todayIso));
  const [editRow, setEditRow] = useState<PetrolConsumptionRow | null>(null);
  const [editForm, setEditForm] = useState<ConsumptionFormState>(() => emptyForm(todayIso));
  const [deleteRow, setDeleteRow] = useState<PetrolConsumptionRow | null>(null);
  const [saving, setSaving] = useState(false);

  const practicalInstructors = useMemo(
    () =>
      instructors
        .filter((i) => i.teachesPractical && i.status === "active")
        .sort((a, b) => a.name.localeCompare(b.name, "hy")),
    [instructors],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        startDate: startDate.slice(0, 10),
        endDate: endDate.slice(0, 10),
      });
      if (filterInstructorId) qs.set("instructorUserId", filterInstructorId);
      if (filterCarId) qs.set("carId", filterCarId);
      const res = await vivaApiJson<PetrolConsumptionListResponse>(
        `/admin/petrol-consumptions?${qs.toString()}`,
      );
      setData(res);
    } catch (e) {
      setData(null);
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, filterInstructorId, filterCarId, showToast]);

  useEffect(() => {
    void load();
  }, [load, branchFilterRevision]);

  useEffect(() => {
    if (!editRow) return;
    setEditForm(formFromRow(editRow));
  }, [editRow?.id]);

  const items = data?.items ?? [];
  const summary = data?.summary ?? {
    totalDistanceKm: 0,
    totalPetrolLiters: 0,
    recordsCount: 0,
    litersPer100Km: null,
  };
  const byInstructor = data?.byInstructor ?? [];
  const byCar = data?.byCar ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((row) => {
      const hay = [
        row.carLabel,
        row.instructorName,
        row.description ?? "",
        row.date,
        String(row.distanceValue),
        String(row.petrolAmount),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, search]);

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: true, labels: { color: CHART_AXIS } } },
      scales: {
        x: {
          ticks: { color: CHART_AXIS, maxRotation: 45, minRotation: 0 },
          grid: { color: CHART_GRID },
        },
        y: {
          ticks: { color: CHART_AXIS },
          grid: { color: CHART_GRID },
          beginAtZero: true,
        },
      },
    }),
    [],
  );

  const instructorLabels = byInstructor.map((r) => r.instructorName);
  const instructorDistanceData = byInstructor.map((r) => r.totalDistanceKm);
  const instructorPetrolData = byInstructor.map((r) => r.totalPetrolLiters);

  const distanceByInstructorChart = useMemo(
    () => ({
      labels: instructorLabels,
      datasets: [
        {
          label: t("adminPetrolConsumptionChartDistanceLabel"),
          data: instructorDistanceData,
          backgroundColor: DISTANCE_COLOR,
          borderColor: DISTANCE_BORDER,
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    }),
    [instructorLabels, instructorDistanceData, t],
  );

  const petrolByInstructorChart = useMemo(
    () => ({
      labels: instructorLabels,
      datasets: [
        {
          label: t("adminPetrolConsumptionChartPetrolLabel"),
          data: instructorPetrolData,
          backgroundColor: PETROL_COLOR,
          borderColor: PETROL_BORDER,
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    }),
    [instructorLabels, instructorPetrolData, t],
  );

  const carLabels = byCar.map((r) => r.carLabel);
  const distanceByCarChart = useMemo(
    () => ({
      labels: carLabels,
      datasets: [
        {
          label: t("adminPetrolConsumptionChartDistanceLabel"),
          data: byCar.map((r) => r.totalDistanceKm),
          backgroundColor: DISTANCE_COLOR,
          borderColor: DISTANCE_BORDER,
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    }),
    [carLabels, byCar, t],
  );

  const compareChart = useMemo(
    () => ({
      labels: instructorLabels,
      datasets: [
        {
          label: t("adminPetrolConsumptionChartDistanceLabel"),
          data: instructorDistanceData,
          backgroundColor: DISTANCE_COLOR,
          borderColor: DISTANCE_BORDER,
          borderWidth: 1,
          borderRadius: 6,
        },
        {
          label: t("adminPetrolConsumptionChartPetrolLabel"),
          data: instructorPetrolData,
          backgroundColor: PETROL_COLOR,
          borderColor: PETROL_BORDER,
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    }),
    [instructorLabels, instructorDistanceData, instructorPetrolData, t],
  );

  const chartsEmpty = !loading && byInstructor.length === 0 && byCar.length === 0;

  const handleAdd = async () => {
    const body = buildBody(addForm);
    if (!body) {
      showToast(t("adminPetrolConsumptionFormInvalid"), "error");
      return;
    }
    setSaving(true);
    try {
      await vivaApiJson("/admin/petrol-consumptions", { method: "POST", body });
      setAddOpen(false);
      setAddForm(emptyForm(todayIso));
      showToast(t("adminPetrolConsumptionSavedToast"), "success");
      await load();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editRow) return;
    const body = buildBody(editForm);
    if (!body) {
      showToast(t("adminPetrolConsumptionFormInvalid"), "error");
      return;
    }
    setSaving(true);
    try {
      await vivaApiJson(`/admin/petrol-consumptions/${editRow.id}`, { method: "PATCH", body });
      setEditRow(null);
      showToast(t("adminPetrolConsumptionSavedToast"), "success");
      await load();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteRow) return;
    setSaving(true);
    try {
      await vivaApiJson(`/admin/petrol-consumptions/${deleteRow.id}`, { method: "DELETE" });
      setDeleteRow(null);
      showToast(t("adminPetrolConsumptionDeletedToast"), "success");
      await load();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setSaving(false);
    }
  };

  const renderFormFields = (
    form: ConsumptionFormState,
    setForm: (f: ConsumptionFormState) => void,
    formId: string,
  ) => (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="mb-1 block text-sm font-medium" htmlFor={`${formId}-instructor`}>
          {t("adminPetrolFieldInstructor")} *
        </label>
        <select
          id={`${formId}-instructor`}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={form.instructorUserId}
          onChange={(e) => setForm({ ...form, instructorUserId: e.target.value })}
          required
        >
          <option value="">{t("adminPetrolPickInstructor")}</option>
          {practicalInstructors.map((ins) => (
            <option key={ins.id} value={ins.id}>
              {ins.name}
            </option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className="mb-1 block text-sm font-medium" htmlFor={`${formId}-car`}>
          {t("adminPetrolFieldCar")} *
        </label>
        <select
          id={`${formId}-car`}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={form.carId}
          onChange={(e) => setForm({ ...form, carId: e.target.value })}
          required
        >
          <option value="">{t("adminPetrolPickCar")}</option>
          {cars.map((c) => (
            <option key={c.id} value={c.id}>
              {carOptionLabel(c)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor={`${formId}-date`}>
          {t("adminPetrolColDate")} *
        </label>
        <Input
          id={`${formId}-date`}
          type="date"
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          required
        />
      </div>
      <div />
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor={`${formId}-distance`}>
          {t("adminPetrolConsumptionFieldDistance")} *
        </label>
        <Input
          id={`${formId}-distance`}
          type="number"
          min={0.01}
          step="0.01"
          value={form.distanceValue}
          onChange={(e) => setForm({ ...form, distanceValue: e.target.value })}
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor={`${formId}-distance-unit`}>
          {t("adminPetrolConsumptionFieldDistanceUnit")} *
        </label>
        <select
          id={`${formId}-distance-unit`}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={form.distanceUnit}
          onChange={(e) => setForm({ ...form, distanceUnit: e.target.value as DistanceUnit })}
          required
        >
          {DISTANCE_UNIT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor={`${formId}-petrol`}>
          {t("adminPetrolConsumptionFieldPetrol")}
        </label>
        <Input
          id={`${formId}-petrol`}
          type="number"
          min={0.01}
          step="0.01"
          value={form.petrolAmount}
          onChange={(e) => setForm({ ...form, petrolAmount: e.target.value })}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor={`${formId}-petrol-unit`}>
          {t("adminPetrolConsumptionFieldPetrolUnit")}
        </label>
        <select
          id={`${formId}-petrol-unit`}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={form.petrolUnit}
          onChange={(e) => setForm({ ...form, petrolUnit: e.target.value as PetrolVolumeUnit })}
        >
          {PETROL_VOLUME_UNIT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className="mb-1 block text-sm font-medium" htmlFor={`${formId}-note`}>
          {t("adminPetrolColNote")}
        </label>
        <textarea
          id={`${formId}-note`}
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={3}
        />
      </div>
    </div>
  );

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-end">
          <Button type="button" onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" aria-hidden />
            {t("adminPetrolConsumptionAddBtn")}
          </Button>
        </div>

        <Card className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="consumption-start-date">
                {t("adminPetrolFilterFrom")}
              </label>
              <Input
                id="consumption-start-date"
                type="date"
                value={startDate}
                max={endDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="consumption-end-date">
                {t("adminPetrolFilterTo")}
              </label>
              <Input
                id="consumption-end-date"
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="consumption-filter-instructor">
                {t("adminPetrolColInstructor")}
              </label>
              <select
                id="consumption-filter-instructor"
                className="flex h-10 min-w-[160px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={filterInstructorId}
                onChange={(e) => setFilterInstructorId(e.target.value)}
              >
                <option value="">{t("adminPetrolConsumptionFilterAll")}</option>
                {practicalInstructors.map((ins) => (
                  <option key={ins.id} value={ins.id}>
                    {ins.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="consumption-filter-car">
                {t("adminPetrolColCar")}
              </label>
              <select
                id="consumption-filter-car"
                className="flex h-10 min-w-[160px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={filterCarId}
                onChange={(e) => setFilterCarId(e.target.value)}
              >
                <option value="">{t("adminPetrolConsumptionFilterAll")}</option>
                {cars.map((c) => (
                  <option key={c.id} value={c.id}>
                    {carOptionLabel(c)}
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const today = yerevanTodayIso();
                setStartDate(today);
                setEndDate(today);
              }}
            >
              {t("adminPetrolFilterToday")}
            </Button>
          </div>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">{t("adminPetrolConsumptionKpiDistance")}</p>
            <p className="mt-1 flex items-center gap-2 text-2xl font-semibold tabular-nums">
              <Route className="h-5 w-5 text-muted-foreground" aria-hidden />
              {formatNum(summary.totalDistanceKm)} {t("adminPetrolConsumptionUnitKm")}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">{t("adminPetrolConsumptionKpiPetrol")}</p>
            <p className="mt-1 flex items-center gap-2 text-2xl font-semibold tabular-nums">
              <Gauge className="h-5 w-5 text-muted-foreground" aria-hidden />
              {formatNum(summary.totalPetrolLiters)} {t("adminPetrolConsumptionUnitLiter")}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">{t("adminPetrolConsumptionKpiRecords")}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{summary.recordsCount}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">{t("adminPetrolConsumptionKpiEfficiency")}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {summary.litersPer100Km != null
                ? `${formatNum(summary.litersPer100Km)} ${t("adminPetrolConsumptionEfficiencySuffix")}`
                : "—"}
            </p>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-4">
            <h2 className="mb-3 text-sm font-medium">{t("adminPetrolConsumptionChartDistanceInstructor")}</h2>
            <div className="h-64">
              {chartsEmpty ? (
                <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  {t("adminPetrolConsumptionChartEmpty")}
                </p>
              ) : (
                <Bar data={distanceByInstructorChart} options={{ ...chartOptions, plugins: { legend: { display: false } } }} />
              )}
            </div>
          </Card>
          <Card className="p-4">
            <h2 className="mb-3 text-sm font-medium">{t("adminPetrolConsumptionChartPetrolInstructor")}</h2>
            <div className="h-64">
              {chartsEmpty ? (
                <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  {t("adminPetrolConsumptionChartEmpty")}
                </p>
              ) : (
                <Bar data={petrolByInstructorChart} options={{ ...chartOptions, plugins: { legend: { display: false } } }} />
              )}
            </div>
          </Card>
          <Card className="p-4">
            <h2 className="mb-3 text-sm font-medium">{t("adminPetrolConsumptionChartDistanceCar")}</h2>
            <div className="h-64">
              {chartsEmpty ? (
                <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  {t("adminPetrolConsumptionChartEmpty")}
                </p>
              ) : (
                <Bar data={distanceByCarChart} options={{ ...chartOptions, plugins: { legend: { display: false } } }} />
              )}
            </div>
          </Card>
          <Card className="p-4">
            <h2 className="mb-3 text-sm font-medium">{t("adminPetrolConsumptionChartCompare")}</h2>
            <div className="h-64">
              {chartsEmpty ? (
                <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  {t("adminPetrolConsumptionChartEmpty")}
                </p>
              ) : (
                <Bar data={compareChart} options={chartOptions} />
              )}
            </div>
          </Card>
        </div>

        <Card className="p-0">
          <DataTableToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={t("search")}
            className="border-b px-4 py-3"
          />
          <AdminTableScroll>
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-4 py-3 font-medium">{t("adminPetrolColDate")}</th>
                  <th className="px-4 py-3 font-medium">{t("adminPetrolColInstructor")}</th>
                  <th className="px-4 py-3 font-medium">{t("adminPetrolColCar")}</th>
                  <th className="px-4 py-3 font-medium text-right">{t("adminPetrolConsumptionColDistance")}</th>
                  <th className="px-4 py-3 font-medium text-right">{t("adminPetrolConsumptionColPetrol")}</th>
                  <th className="px-4 py-3 font-medium">{t("adminPetrolColNote")}</th>
                  <th className="px-4 py-3 font-medium w-[120px]">{t("adminPetrolColActions")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      {t("loading")}
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      {t("adminPetrolConsumptionTableEmpty")}
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => (
                    <AdminTableRowContextMenu
                      key={row.id}
                      actions={[
                        {
                          kind: "item",
                          id: "edit",
                          label: t("edit"),
                          icon: Edit2,
                          onClick: () => setEditRow(row),
                        },
                        {
                          kind: "item",
                          id: "delete",
                          label: t("delete"),
                          icon: Trash2,
                          destructive: true,
                          onClick: () => setDeleteRow(row),
                        },
                      ]}
                    >
                      <tr className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3 whitespace-nowrap">
                          {formatShortDateFromIso(row.date, lang)}
                        </td>
                        <td className="px-4 py-3">{row.instructorName}</td>
                        <td className="px-4 py-3">{row.carLabel}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatDistanceCell(row)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatPetrolCell(row)}</td>
                        <td className="px-4 py-3 max-w-[200px] truncate" title={row.description ?? undefined}>
                          {row.description?.trim() || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <AdminTableRowActions
                            actions={[
                              {
                                kind: "item",
                                id: "edit",
                                label: t("edit"),
                                icon: Edit2,
                                onClick: () => setEditRow(row),
                              },
                              {
                                kind: "item",
                                id: "delete",
                                label: t("delete"),
                                icon: Trash2,
                                destructive: true,
                                onClick: () => setDeleteRow(row),
                              },
                            ]}
                          />
                        </td>
                      </tr>
                    </AdminTableRowContextMenu>
                  ))
                )}
              </tbody>
            </table>
          </AdminTableScroll>
        </Card>
      </div>

      <AppModal
        open={addOpen}
        onOpenChange={setAddOpen}
        title={t("adminPetrolConsumptionAddTitle")}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>
              {t("cancel")}
            </Button>
            <Button type="submit" form={addFormId} disabled={saving}>
              {t("save")}
            </Button>
          </>
        }
      >
        <form
          id={addFormId}
          onSubmit={(e) => {
            e.preventDefault();
            void handleAdd();
          }}
        >
          {renderFormFields(addForm, setAddForm, addFormId)}
        </form>
      </AppModal>

      <AppModal
        open={!!editRow}
        onOpenChange={(open) => {
          if (!open) setEditRow(null);
        }}
        title={t("adminPetrolConsumptionEditTitle")}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setEditRow(null)} disabled={saving}>
              {t("cancel")}
            </Button>
            <Button type="submit" form={editFormId} disabled={saving}>
              {t("save")}
            </Button>
          </>
        }
      >
        <form
          id={editFormId}
          onSubmit={(e) => {
            e.preventDefault();
            void handleEdit();
          }}
        >
          {renderFormFields(editForm, setEditForm, editFormId)}
        </form>
      </AppModal>

      <ConfirmDialog
        open={!!deleteRow}
        onClose={() => setDeleteRow(null)}
        onConfirm={handleDelete}
        title={t("adminPetrolConsumptionDeleteTitle")}
        description={t("adminPetrolConsumptionDeleteDesc")}
        confirmLabel={t("delete")}
        danger
      />
    </>
  );
}
