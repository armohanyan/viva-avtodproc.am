import AdminTableScroll from "src/components/AdminTableScroll";
import AdminTableRowActions, { AdminTableRowContextMenu } from "src/components/AdminTableRowActions";
import ConfirmDialog from "src/components/ConfirmDialog";
import { Button } from "src/components/ui/button";
import { Card } from "src/components/ui/card";
import { Input } from "src/components/ui/input";
import { useLang } from "src/lib/i18n";
import { yerevanTodayIso } from "src/lib/yerevanLessonCalendar";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { useToast } from "src/lib/toast";
import { useOptionalAdminBranchFilterRevision } from "src/modules/admin/AdminBranchFilterProvider";
import ExcelFuelKmExpenseImportModal from "src/modules/admin/petrol-fuel-km/ExcelFuelKmExpenseImportModal";
import {
  downloadFuelKmExpenseTemplate,
  exportFuelKmExpenseRows,
} from "src/modules/admin/petrol-fuel-km/excelPetrolFuelKmExpenseImport";
import { useFleetCars } from "src/modules/cars";
import { useInstructors } from "src/modules/instructors/useInstructors";
import {
  PETROL_PAYMENT_CASH,
  PETROL_PAYMENT_OPTIONS,
  type PetrolPaymentTypeValue,
} from "src/pages/admin/petrolPaymentType";
import {
  PETROL_TYPE_BENZIN,
  PETROL_TYPE_OPTIONS,
  type PetrolTypeValue,
} from "src/pages/admin/petrolTypeAm";
import type { PetrolExpenseBody, PetrolExpenseListResponse, PetrolExpenseRow } from "src/types/petrol-expense.types";
import { formatAmd } from "src/utils/currency.utils";
import { formatShortDateFromIso } from "src/utils/locale.utils";
import { Download, FileSpreadsheet, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type FuelFormState = {
  date: string;
  instructorUserId: string;
  carId: string;
  petrolType: PetrolTypeValue;
  petrolCount: string;
  price: string;
  paymentType: PetrolPaymentTypeValue;
};

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function emptyForm(dateIso: string): FuelFormState {
  return {
    date: dateIso,
    instructorUserId: "",
    carId: "",
    petrolType: PETROL_TYPE_BENZIN,
    petrolCount: "",
    price: "",
    paymentType: PETROL_PAYMENT_CASH,
  };
}

function buildBody(form: FuelFormState): PetrolExpenseBody | null {
  const carId = Number.parseInt(form.carId, 10);
  const instructorUserId = Number.parseInt(form.instructorUserId, 10);
  const date = form.date.slice(0, 10);
  const petrolCount = Number.parseFloat(form.petrolCount.replace(",", "."));
  const price = Number.parseFloat(form.price.replace(/[\s,]/g, ""));

  if (
    !Number.isFinite(carId) ||
    carId <= 0 ||
    !Number.isFinite(instructorUserId) ||
    instructorUserId <= 0 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !form.petrolType ||
    !Number.isFinite(petrolCount) ||
    petrolCount <= 0 ||
    !Number.isFinite(price) ||
    price < 0 ||
    !form.paymentType
  ) {
    return null;
  }

  return {
    carId,
    instructorUserId,
    date,
    petrolType: form.petrolType,
    petrolCount,
    paymentType: form.paymentType,
    price: Math.round(price),
  };
}

function carOptionLabel(car: { plate: string; make: string; model: string; id: string | number }): string {
  const plate = car.plate?.trim() || `#${car.id}`;
  const mm = [car.make, car.model].filter(Boolean).join(" ").trim();
  return mm ? `${plate} · ${mm}` : plate;
}

export default function AdminPetrolFuelKmExpenseSubTab() {
  const branchFilterRevision = useOptionalAdminBranchFilterRevision();
  const { t, lang } = useLang();
  const { showToast } = useToast();
  const { cars } = useFleetCars();
  const { instructors } = useInstructors();

  const todayIso = useMemo(() => yerevanTodayIso(), []);
  const [startDate, setStartDate] = useState(todayIso);
  const [endDate, setEndDate] = useState(todayIso);
  const [form, setForm] = useState(() => emptyForm(todayIso));
  const [data, setData] = useState<PetrolExpenseListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [deleteRow, setDeleteRow] = useState<PetrolExpenseRow | null>(null);

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
      const res = await vivaApiJson<PetrolExpenseListResponse>(`/admin/petrol-expenses?${qs.toString()}`);
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

  const items = data?.items ?? [];

  const handleRegister = async () => {
    const body = buildBody(form);
    if (!body) {
      showToast(t("adminPetrolFuelKmFormInvalid"), "error");
      return;
    }
    setSaving(true);
    try {
      await vivaApiJson("/admin/petrol-expenses", { method: "POST", body });
      setForm(emptyForm(todayIso));
      showToast(t("adminPetrolFuelKmFuelSavedToast"), "success");
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
      showToast(t("adminPetrolFuelKmFuelDeletedToast"), "success");
      await load();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          className="gap-2"
          onClick={() => {
            try {
              downloadFuelKmExpenseTemplate(cars, practicalInstructors);
            } catch (e) {
              showToast(getApiErrorMessage(e), "error");
            }
          }}
        >
          <Download className="w-4 h-4" />
          {t("adminPetrolExportTemplate")}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="gap-2"
          disabled={items.length === 0}
          onClick={() => {
            try {
              exportFuelKmExpenseRows(items);
            } catch (e) {
              showToast(getApiErrorMessage(e), "error");
            }
          }}
        >
          <FileSpreadsheet className="w-4 h-4" />
          {t("adminPetrolExportExcel")}
        </Button>
        <Button type="button" variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
          <Upload className="w-4 h-4" />
          {t("adminPetrolImportFromExcel")}
        </Button>
      </div>

      <Card className="p-5 border-border space-y-4">
        <h3 className="text-lg font-semibold text-primary">{t("adminPetrolFuelKmSectionFuel")}</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-1">{t("adminPetrolColDate")}</label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="h-10"
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">{t("adminPetrolFieldInstructor")}</label>
            <select
              className={selectClass}
              value={form.instructorUserId}
              onChange={(e) => setForm({ ...form, instructorUserId: e.target.value })}
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
            <label className="block text-sm text-muted-foreground mb-1">{t("adminPetrolFieldCar")}</label>
            <select
              className={selectClass}
              value={form.carId}
              onChange={(e) => setForm({ ...form, carId: e.target.value })}
            >
              <option value="">{t("adminPetrolPickCar")}</option>
              {cars.map((car) => (
                <option key={car.id} value={car.id}>
                  {carOptionLabel(car)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">{t("adminPetrolColType")}</label>
            <select
              className={selectClass}
              value={form.petrolType}
              onChange={(e) => setForm({ ...form, petrolType: e.target.value as PetrolTypeValue })}
            >
              {PETROL_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">{t("adminPetrolFuelKmColLiters")}</label>
            <Input
              value={form.petrolCount}
              onChange={(e) => setForm({ ...form, petrolCount: e.target.value })}
              className="h-10"
              inputMode="decimal"
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">{t("adminPetrolColPrice")}</label>
            <Input
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="h-10"
              inputMode="numeric"
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">{t("adminPetrolFuelKmColPayment")}</label>
            <select
              className={selectClass}
              value={form.paymentType}
              onChange={(e) => setForm({ ...form, paymentType: e.target.value as PetrolPaymentTypeValue })}
            >
              {PETROL_PAYMENT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={saving}
              onClick={handleRegister}
            >
              {t("adminPetrolFuelKmRegisterFuel")}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-4 border-border space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-sm text-muted-foreground mb-1">{t("adminPetrolFilterFrom")}</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-10 w-[11rem]"
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">{t("adminPetrolFilterTo")}</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-10 w-[11rem]"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-10"
            onClick={() => {
              setStartDate(todayIso);
              setEndDate(todayIso);
            }}
          >
            {t("adminPetrolFilterToday")}
          </Button>
        </div>

        <AdminTableScroll>
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="px-3 py-2">{t("adminPetrolColDate")}</th>
                <th className="px-3 py-2">{t("adminPetrolColInstructor")}</th>
                <th className="px-3 py-2">{t("adminPetrolColCar")}</th>
                <th className="px-3 py-2">{t("adminPetrolColType")}</th>
                <th className="px-3 py-2 text-right">{t("adminPetrolFuelKmColLiters")}</th>
                <th className="px-3 py-2 text-right">{t("adminPetrolColPrice")}</th>
                <th className="px-3 py-2">{t("adminPetrolFuelKmColPayment")}</th>
                <th className="px-3 py-2 w-12" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                    {t("loading")}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                    {t("adminPetrolFuelKmFuelTableEmpty")}
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <AdminTableRowContextMenu
                    key={row.id}
                    actions={[
                      {
                        label: t("delete"),
                        icon: Trash2,
                        destructive: true,
                        onClick: () => setDeleteRow(row),
                      },
                    ]}
                  >
                    <tr className="border-b hover:bg-muted/30">
                      <td className="px-3 py-2 whitespace-nowrap">
                        {formatShortDateFromIso(row.date, lang)}
                      </td>
                      <td className="px-3 py-2">{row.instructorName}</td>
                      <td className="px-3 py-2">{row.carLabel}</td>
                      <td className="px-3 py-2">{row.petrolTypeLabel}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{row.petrolCount ?? "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{formatAmd(row.price)}</td>
                      <td className="px-3 py-2">{row.paymentTypeLabel ?? "—"}</td>
                      <td className="px-3 py-2">
                        <AdminTableRowActions
                          actions={[
                            {
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

      <ExcelFuelKmExpenseImportModal
        open={importOpen}
        onOpenChange={setImportOpen}
        cars={cars}
        instructors={instructors}
        onImported={load}
      />

      <ConfirmDialog
        open={!!deleteRow}
        onOpenChange={(o) => !o && setDeleteRow(null)}
        title={t("adminPetrolFuelKmFuelDeleteTitle")}
        description={t("adminPetrolFuelKmFuelDeleteDesc")}
        confirmLabel={t("delete")}
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
