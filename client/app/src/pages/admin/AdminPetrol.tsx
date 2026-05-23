import AdminLayout from "src/components/AdminLayout";
import AdminTableScroll from "src/components/AdminTableScroll";
import AdminTableRowActions, { AdminTableRowContextMenu } from "src/components/AdminTableRowActions";
import ConfirmDialog from "src/components/ConfirmDialog";
import { AppModal } from "src/components/AppModal";
import DataTableToolbar from "src/components/DataTableToolbar";
import PanelPageHeader from "src/components/PanelPageHeader";
import { Button } from "src/components/ui/button";
import { Card } from "src/components/ui/card";
import { Input } from "src/components/ui/input";
import { useLang } from "src/lib/i18n";
import { yerevanTodayIso } from "src/lib/yerevanLessonCalendar";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { useToast } from "src/lib/toast";
import { useOptionalAdminBranchFilterRevision } from "src/modules/admin/AdminBranchFilterProvider";
import { useFleetCars } from "src/modules/cars";
import { useInstructors } from "src/modules/instructors/useInstructors";
import {
  PETROL_TYPE_BENZIN,
  PETROL_TYPE_OPTIONS,
  type PetrolTypeValue,
} from "src/pages/admin/petrolTypeAm";
import type {
  PetrolExpenseBody,
  PetrolExpenseListResponse,
  PetrolExpenseRow,
} from "src/types/petrol-expense.types";
import { formatAmd } from "src/utils/currency.utils";
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
import { Fuel, Plus, Edit2, Trash2, Users } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const CHART_AXIS = "#94a3b8";
const CHART_GRID = "rgba(148, 163, 184, 0.12)";
const COUNT_COLOR = "rgba(255, 138, 0, 0.55)";
const COUNT_BORDER = "#FF8A00";
const PRICE_COLOR = "rgba(56, 189, 248, 0.45)";
const PRICE_BORDER = "rgb(56, 189, 248)";

type PetrolFormState = {
  carId: string;
  instructorUserId: string;
  date: string;
  petrolType: PetrolTypeValue;
  petrolCount: string;
  price: string;
  description: string;
};

function emptyForm(dateIso: string): PetrolFormState {
  return {
    carId: "",
    instructorUserId: "",
    date: dateIso,
    petrolType: PETROL_TYPE_BENZIN,
    petrolCount: "",
    price: "",
    description: "",
  };
}

function formFromRow(row: PetrolExpenseRow): PetrolFormState {
  return {
    carId: String(row.carId),
    instructorUserId: String(row.instructorUserId),
    date: row.date.slice(0, 10),
    petrolType: row.petrolType,
    petrolCount: row.petrolCount != null ? String(row.petrolCount) : "",
    price: String(row.price),
    description: row.description ?? "",
  };
}

function buildBody(form: PetrolFormState): PetrolExpenseBody | null {
  const carId = Number.parseInt(form.carId, 10);
  const instructorUserId = Number.parseInt(form.instructorUserId, 10);
  const date = form.date.slice(0, 10);
  const countRaw = form.petrolCount.trim();
  const petrolCount =
    countRaw === ""
      ? null
      : Number.parseFloat(countRaw.replace(",", "."));
  const price = Number.parseFloat(form.price.replace(/[\s,]/g, ""));
  const description = form.description.trim() || null;

  if (
    !Number.isFinite(carId) ||
    carId <= 0 ||
    !Number.isFinite(instructorUserId) ||
    instructorUserId <= 0 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !form.petrolType ||
    (petrolCount != null && (!Number.isFinite(petrolCount) || petrolCount <= 0)) ||
    !Number.isFinite(price) ||
    price < 0
  ) {
    return null;
  }

  return {
    carId,
    instructorUserId,
    date,
    petrolType: form.petrolType,
    petrolCount,
    price: Math.round(price),
    description,
  };
}

function formatPetrolCount(n: number | null): string {
  if (n == null) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: 2, minimumFractionDigits: 0 });
}

function carOptionLabel(car: { plate: string; make: string; model: string; id: string | number }): string {
  const plate = car.plate?.trim() || `#${car.id}`;
  const mm = [car.make, car.model].filter(Boolean).join(" ").trim();
  return mm ? `${plate} · ${mm}` : plate;
}

export default function AdminPetrolPage() {
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
  const [search, setSearch] = useState("");
  const [data, setData] = useState<PetrolExpenseListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(() => emptyForm(todayIso));
  const [editRow, setEditRow] = useState<PetrolExpenseRow | null>(null);
  const [editForm, setEditForm] = useState<PetrolFormState>(() => emptyForm(todayIso));
  const [deleteRow, setDeleteRow] = useState<PetrolExpenseRow | null>(null);
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
      const res = await vivaApiJson<PetrolExpenseListResponse>(
        `/admin/petrol-expenses?${qs.toString()}`,
      );
      setData(res);
    } catch (e) {
      setData(null);
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, showToast]);

  useEffect(() => {
    void load();
  }, [load, branchFilterRevision]);

  useEffect(() => {
    if (!editRow) return;
    setEditForm(formFromRow(editRow));
  }, [editRow?.id]);

  const items = data?.items ?? [];
  const summary = data?.summary ?? { totalPetrolCount: 0, totalPrice: 0, instructorCount: 0 };
  const byInstructor = data?.byInstructor ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((row) => {
      const hay = [
        row.carLabel,
        row.instructorName,
        row.petrolTypeLabel,
        row.description ?? "",
        row.date,
        String(row.petrolCount),
        String(row.price),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, search]);

  const chartLabels = byInstructor.map((r) => r.instructorName);
  const countData = byInstructor.map((r) => r.totalPetrolCount);
  const priceData = byInstructor.map((r) => r.totalPrice);

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
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

  const countChart = useMemo(
    () => ({
      labels: chartLabels,
      datasets: [
        {
          label: t("adminPetrolChartCountLabel"),
          data: countData,
          backgroundColor: COUNT_COLOR,
          borderColor: COUNT_BORDER,
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    }),
    [chartLabels, countData, t],
  );

  const priceChart = useMemo(
    () => ({
      labels: chartLabels,
      datasets: [
        {
          label: t("adminPetrolChartPriceLabel"),
          data: priceData,
          backgroundColor: PRICE_COLOR,
          borderColor: PRICE_BORDER,
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    }),
    [chartLabels, priceData, t],
  );

  const chartsEmpty = !loading && byInstructor.length === 0;

  const handleAdd = async () => {
    const body = buildBody(addForm);
    if (!body) {
      showToast(t("adminPetrolFormInvalid"), "error");
      return;
    }
    setSaving(true);
    try {
      await vivaApiJson("/admin/petrol-expenses", { method: "POST", body });
      setAddOpen(false);
      setAddForm(emptyForm(todayIso));
      showToast(t("adminPetrolSavedToast"), "success");
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
      showToast(t("adminPetrolFormInvalid"), "error");
      return;
    }
    setSaving(true);
    try {
      await vivaApiJson(`/admin/petrol-expenses/${editRow.id}`, { method: "PATCH", body });
      setEditRow(null);
      showToast(t("adminPetrolSavedToast"), "success");
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
      await vivaApiJson(`/admin/petrol-expenses/${deleteRow.id}`, { method: "DELETE" });
      setDeleteRow(null);
      showToast(t("adminPetrolDeletedToast"), "success");
      await load();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setSaving(false);
    }
  };

  const renderFormFields = (form: PetrolFormState, setForm: (f: PetrolFormState) => void, formId: string) => (
    <div className="grid gap-4 sm:grid-cols-2">
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
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor={`${formId}-type`}>
          {t("adminPetrolColType")} *
        </label>
        <select
          id={`${formId}-type`}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={form.petrolType}
          onChange={(e) => setForm({ ...form, petrolType: e.target.value as PetrolTypeValue })}
          required
        >
          {PETROL_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor={`${formId}-count`}>
          {t("adminPetrolColCount")}
        </label>
        <Input
          id={`${formId}-count`}
          type="number"
          min={0.01}
          step="0.01"
          value={form.petrolCount}
          onChange={(e) => setForm({ ...form, petrolCount: e.target.value })}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor={`${formId}-price`}>
          {t("adminPetrolColPrice")} *
        </label>
        <Input
          id={`${formId}-price`}
          type="number"
          min={0}
          step={1}
          value={form.price}
          onChange={(e) => setForm({ ...form, price: e.target.value })}
          required
        />
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
    <AdminLayout>
      <div className="space-y-6">
        <PanelPageHeader
          icon={Fuel}
          title={t("adminPetrolTitle")}
          subtitle={t("adminPetrolSubtitle")}
          actions={
            <Button type="button" onClick={() => setAddOpen(true)}>
              <Plus className="mr-2 h-4 w-4" aria-hidden />
              {t("addNew")}
            </Button>
          }
        />

        <Card className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="petrol-start-date">
                {t("adminPetrolFilterFrom")}
              </label>
              <Input
                id="petrol-start-date"
                type="date"
                value={startDate}
                max={endDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="petrol-end-date">
                {t("adminPetrolFilterTo")}
              </label>
              <Input
                id="petrol-end-date"
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
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

        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">{t("adminPetrolKpiTotalCount")}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{formatPetrolCount(summary.totalPetrolCount)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">{t("adminPetrolKpiTotalPrice")}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{formatAmd(summary.totalPrice)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-muted-foreground">{t("adminPetrolKpiInstructors")}</p>
            <p className="mt-1 flex items-center gap-2 text-2xl font-semibold tabular-nums">
              <Users className="h-5 w-5 text-muted-foreground" aria-hidden />
              {summary.instructorCount}
            </p>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-4">
            <h2 className="mb-3 text-sm font-medium">{t("adminPetrolChartCountTitle")}</h2>
            <div className="h-64">
              {chartsEmpty ? (
                <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  {t("adminPetrolChartEmpty")}
                </p>
              ) : (
                <Bar data={countChart} options={chartOptions} />
              )}
            </div>
          </Card>
          <Card className="p-4">
            <h2 className="mb-3 text-sm font-medium">{t("adminPetrolChartPriceTitle")}</h2>
            <div className="h-64">
              {chartsEmpty ? (
                <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  {t("adminPetrolChartEmpty")}
                </p>
              ) : (
                <Bar data={priceChart} options={chartOptions} />
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
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-4 py-3 font-medium">{t("adminPetrolColDate")}</th>
                  <th className="px-4 py-3 font-medium">{t("adminPetrolColCar")}</th>
                  <th className="px-4 py-3 font-medium">{t("adminPetrolColInstructor")}</th>
                  <th className="px-4 py-3 font-medium">{t("adminPetrolColType")}</th>
                  <th className="px-4 py-3 font-medium text-right">{t("adminPetrolColCount")}</th>
                  <th className="px-4 py-3 font-medium text-right">{t("adminPetrolColPrice")}</th>
                  <th className="px-4 py-3 font-medium">{t("adminPetrolColNote")}</th>
                  <th className="px-4 py-3 font-medium w-[120px]">{t("adminPetrolColActions")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                      {t("loading")}
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                      {t("adminPetrolTableEmpty")}
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
                        <td className="px-4 py-3">{row.carLabel}</td>
                        <td className="px-4 py-3">{row.instructorName}</td>
                        <td className="px-4 py-3">{row.petrolTypeLabel}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatPetrolCount(row.petrolCount)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatAmd(row.price)}</td>
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
        title={t("adminPetrolAddTitle")}
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
        title={t("adminPetrolEditTitle")}
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
        title={t("adminPetrolDeleteTitle")}
        description={t("adminPetrolDeleteDesc")}
        confirmLabel={t("delete")}
        danger
      />
    </AdminLayout>
  );
}
