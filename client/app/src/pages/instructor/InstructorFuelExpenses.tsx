import InstructorPanelLayout from "src/components/InstructorPanelLayout";
import PanelPageHeader from "src/components/PanelPageHeader";
import PetrolRequestStatusBadge, { type PetrolRequestStatus } from "src/components/PetrolRequestStatusBadge";
import TableSkeletonRows from "src/components/TableSkeletonRows";
import { AppModal } from "src/components/AppModal";
import { Button } from "src/components/ui/button";
import { Card } from "src/components/ui/card";
import { Input } from "src/components/ui/input";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { downscaleImageFileForUpload } from "src/lib/downscaleImageFile";
import { sameOriginStaffUploadUrl } from "src/lib/sameOriginStaffUploadUrl";
import { uploadStaffImageFile } from "src/lib/staffImageUpload";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { formatAmd, parseAmdInput } from "src/utils/currency.utils";
import { PETROL_TYPE_OPTIONS, type PetrolTypeValue } from "src/pages/admin/petrolTypeAm";
import { Fuel, ImageIcon, Plus } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { InstructorScopeGuard } from "src/modules/instructor/InstructorScopeGuard";

type FuelExpenseRequest = {
  id: number;
  carId: number;
  carLabel: string;
  date: string;
  time: string | null;
  petrolType: PetrolTypeValue;
  petrolTypeLabel: string;
  price: number;
  photoUrl: string;
  description: string | null;
  status: PetrolRequestStatus;
  decisionNote: string | null;
  decidedAtIso: string | null;
  createdAtIso: string;
};

type CarOption = { id: number; label: string };

type FormState = {
  carId: string;
  date: string;
  time: string;
  petrolType: PetrolTypeValue;
  price: string;
  description: string;
};

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function nowTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function InstructorFuelExpenses() {
  const { t } = useLang();
  const { showToast } = useToast();
  const formId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [items, setItems] = useState<FuelExpenseRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [cars, setCars] = useState<CarOption[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [viewPhoto, setViewPhoto] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = await vivaApiJson<{ items: FuelExpenseRequest[] }>("/instructor/petrol-expense-requests");
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      setItems([]);
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const loadCars = useCallback(async () => {
    try {
      const data = await vivaApiJson<{ items: CarOption[] }>("/instructor/petrol-expense-requests/cars");
      setCars(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      setCars([]);
      showToast(getApiErrorMessage(e), "error");
    }
  }, [showToast]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useEffect(() => {
    void loadCars();
  }, [loadCars]);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  const openModal = () => {
    setForm({
      carId: cars.length === 1 ? String(cars[0].id) : "",
      date: todayIso(),
      time: nowTime(),
      petrolType: PETROL_TYPE_OPTIONS[0].value,
      price: "",
      description: "",
    });
    setPhotoFile(null);
    setModalOpen(true);
  };

  const closeModal = (open: boolean) => {
    if (!open && !submitting) {
      setModalOpen(false);
      setPhotoFile(null);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || submitting) return;
    const price = parseAmdInput(form.price);
    if (!form.carId || !form.date || !Number.isFinite(price) || price <= 0) {
      showToast(t("fillRequired"), "error");
      return;
    }
    if (!photoFile) {
      showToast(t("instructorFuelPhotoRequired"), "error");
      return;
    }
    setSubmitting(true);
    try {
      const prepared = await downscaleImageFileForUpload(photoFile);
      const photoUrl = await uploadStaffImageFile(prepared);
      await vivaApiJson("/instructor/petrol-expense-requests", {
        method: "POST",
        body: {
          carId: Number(form.carId),
          date: form.date,
          time: form.time || null,
          petrolType: form.petrolType,
          price,
          photoUrl,
          description: form.description.trim() || null,
        },
      });
      setModalOpen(false);
      setPhotoFile(null);
      showToast(t("instructorFuelSentToast"), "success");
      await loadItems();
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const totalPending = useMemo(() => items.filter((i) => i.status === "pending").length, [items]);

  return (
    <InstructorPanelLayout>
      <InstructorScopeGuard require="practical">
      <PanelPageHeader
        icon={Fuel}
        title={t("instructorFuelTitle")}
        subtitle={t("instructorFuelSubtitle")}
        actions={
          <Button onClick={openModal} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
            <Plus className="w-4 h-4" />
            {t("instructorFuelAddButton")}
          </Button>
        }
      />

      <Card className="border-border overflow-hidden min-w-0">
        <div className="p-5 border-b border-border flex items-center justify-between gap-3">
          <h3 className="font-semibold text-foreground">{t("instructorFuelTitle")}</h3>
          {totalPending > 0 ? (
            <span className="text-xs text-muted-foreground">
              {t("petrolRequestStatusPending")}: {totalPending}
            </span>
          ) : null}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[48rem]">
            <thead className="bg-muted/40">
              <tr>
                {[
                  t("adminPetrolColDate"),
                  t("adminPetrolColCar"),
                  t("adminPetrolColType"),
                  t("adminPetrolColPrice"),
                  t("instructorFuelColPhoto"),
                  t("adminPetrolColNote"),
                  t("theoryPersonalRequestColStatus"),
                ].map((h, i) => (
                  <th
                    key={i}
                    className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <TableSkeletonRows cols={7} cellClassName="px-4 py-3" />
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    {t("instructorFuelEmpty")}
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                      {row.date}
                      {row.time ? <span className="text-muted-foreground"> {row.time}</span> : null}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{row.carLabel}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{row.petrolTypeLabel}</td>
                    <td className="px-4 py-3 font-medium tabular-nums whitespace-nowrap">{formatAmd(row.price)}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setViewPhoto(row.photoUrl)}
                        className="inline-flex items-center gap-1.5 text-primary underline underline-offset-2 hover:text-primary/80 cursor-pointer"
                      >
                        <ImageIcon className="w-4 h-4" />
                        {t("instructorFuelColPhoto")}
                      </button>
                    </td>
                    <td className="px-4 py-3 max-w-[14rem]">
                      <span className="block truncate" title={row.description ?? undefined}>
                        {row.description ?? "—"}
                      </span>
                      {row.status === "rejected" && row.decisionNote ? (
                        <span className="block truncate text-xs text-red-600" title={row.decisionNote}>
                          {row.decisionNote}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <PetrolRequestStatusBadge status={row.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <AppModal
        open={modalOpen}
        onOpenChange={closeModal}
        title={t("instructorFuelModalTitle")}
        contentClassName="max-w-lg"
        footer={
          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" disabled={submitting} onClick={() => closeModal(false)}>
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              form={formId}
              disabled={submitting}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {t("instructorFuelSendButton")}
            </Button>
          </div>
        }
      >
        {form ? (
          <form id={formId} onSubmit={submit} className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor={`${formId}-car`}>
                {t("adminPetrolFieldCar")} *
              </label>
              <select
                id={`${formId}-car`}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.carId}
                onChange={(e) => setForm((f) => (f ? { ...f, carId: e.target.value } : f))}
                required
              >
                <option value="">—</option>
                {cars.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium" htmlFor={`${formId}-date`}>
                  {t("adminPetrolColDate")} *
                </label>
                <Input
                  id={`${formId}-date`}
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => (f ? { ...f, date: e.target.value } : f))}
                  className="h-10"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium" htmlFor={`${formId}-time`}>
                  {t("instructorFuelTimeLabel")}
                </label>
                <Input
                  id={`${formId}-time`}
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm((f) => (f ? { ...f, time: e.target.value } : f))}
                  className="h-10"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium" htmlFor={`${formId}-type`}>
                  {t("adminPetrolColType")} *
                </label>
                <select
                  id={`${formId}-type`}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.petrolType}
                  onChange={(e) => setForm((f) => (f ? { ...f, petrolType: e.target.value as PetrolTypeValue } : f))}
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
                <label className="mb-1 block text-sm font-medium" htmlFor={`${formId}-price`}>
                  {t("adminPetrolColPrice")} *
                </label>
                <Input
                  id={`${formId}-price`}
                  inputMode="numeric"
                  value={form.price}
                  onChange={(e) => setForm((f) => (f ? { ...f, price: e.target.value } : f))}
                  className="h-10"
                  placeholder="0"
                  required
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor={`${formId}-photo`}>
                {t("instructorFuelPhotoLabel")} *
              </label>
              <input
                id={`${formId}-photo`}
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
              />
              <p className="mt-1 text-xs text-muted-foreground">{t("instructorFuelPhotoHint")}</p>
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt=""
                  className="mt-2 max-h-40 rounded-lg border border-border object-contain"
                />
              ) : null}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor={`${formId}-note`}>
                {t("adminPetrolColNote")}
              </label>
              <textarea
                id={`${formId}-note`}
                value={form.description}
                onChange={(e) => setForm((f) => (f ? { ...f, description: e.target.value } : f))}
                rows={3}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[4.5rem]"
              />
            </div>
          </form>
        ) : null}
      </AppModal>

      <AppModal
        open={!!viewPhoto}
        onOpenChange={(o) => !o && setViewPhoto(null)}
        title={t("instructorFuelColPhoto")}
        contentClassName="max-w-2xl"
      >
        {viewPhoto ? (
          <img src={sameOriginStaffUploadUrl(viewPhoto) ?? viewPhoto} alt="" className="w-full rounded-lg object-contain" />
        ) : null}
      </AppModal>
      </InstructorScopeGuard>
    </InstructorPanelLayout>
  );
}
