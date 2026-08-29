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
  DirectorTableBody,
  DirectorTableHead,
  DirectorTableRow,
  DirectorTableTd,
  DirectorTableTh,
  DirectorTableWrap,
} from "src/modules/director/components/DirectorUi";
import {
  createDirectorFuel,
  createDirectorKm,
  deleteDirectorFuel,
  deleteDirectorKm,
  fetchDirectorFuel,
  fetchDirectorKm,
  updateDirectorFuel,
  updateDirectorKm,
} from "src/modules/director/director.api";
import { DIRECTOR_OPTION_CATEGORY, DIRECTOR_PAYMENT_LABELS, todayIso } from "src/modules/director/director.consts";
import type { DirectorFuel, DirectorKm, DirectorPaymentMethod } from "src/modules/director/director.types";
import type { Instructor } from "src/data/instructors";
import { formatAmd } from "src/pages/admin/finance/adminFinanceShared";
import {
  directorAmd,
  directorDate,
  directorDecimal,
  directorOptionalId,
  directorPayment,
  directorText,
} from "src/modules/director/directorFormValues";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { useToast } from "src/lib/toast";
import { useCallback, useEffect, useState } from "react";
import { Fuel } from "lucide-react";

type CarOption = { id: number; plate?: string; model?: string };

export default function DirectorFuelKmPage() {
  const { showToast } = useToast();
  const { start, end, setStart, setEnd, query, branchFilterRevision } = useDirectorDateRange();
  const [fuelRows, setFuelRows] = useState<DirectorFuel[]>([]);
  const [kmRows, setKmRows] = useState<DirectorKm[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [cars, setCars] = useState<CarOption[]>([]);
  const [fuelEditingId, setFuelEditingId] = useState<number | null>(null);
  const [kmEditingId, setKmEditingId] = useState<number | null>(null);

  const [fuelForm, setFuelForm] = useState({
    date: todayIso(),
    instructorUserId: "",
    carId: "",
    fuelType: "Գազ",
    liters: "",
    amount: "",
    paymentMethod: "card" as DirectorPaymentMethod,
  });

  const [kmForm, setKmForm] = useState({
    date: todayIso(),
    instructorUserId: "",
    km: "",
  });

  useEffect(() => {
    void vivaApiJson<Instructor[]>("/instructors").then((d) => setInstructors(Array.isArray(d) ? d : [])).catch(() => setInstructors([]));
    void vivaApiJson<CarOption[]>("/fleet/cars").then((d) => setCars(Array.isArray(d) ? d : [])).catch(() => setCars([]));
  }, []);

  const load = useCallback(async () => {
    try {
      const [fuel, km] = await Promise.all([fetchDirectorFuel(query), fetchDirectorKm(query)]);
      setFuelRows(Array.isArray(fuel) ? fuel : []);
      setKmRows(Array.isArray(km) ? km : []);
    } catch (e) {
      setFuelRows([]);
      setKmRows([]);
      showToast(getApiErrorMessage(e), "error");
    }
  }, [query, showToast]);

  const reload = useDirectorReload(load, [query, branchFilterRevision]);

  const instructorName = (id: number | null) =>
    id == null ? "—" : instructors.find((i) => String(i.id) === String(id))?.name ?? `#${id}`;

  const resetFuelForm = () => {
    setFuelEditingId(null);
    setFuelForm({
      date: todayIso(),
      instructorUserId: "",
      carId: "",
      fuelType: "Գազ",
      liters: "",
      amount: "",
      paymentMethod: "card" as DirectorPaymentMethod,
    });
  };

  const resetKmForm = () => {
    setKmEditingId(null);
    setKmForm({ date: todayIso(), instructorUserId: "", km: "" });
  };

  const submitFuel = async () => {
    try {
      const body = {
        date: directorDate(fuelForm.date),
        instructorUserId: directorOptionalId(fuelForm.instructorUserId),
        carId: directorOptionalId(fuelForm.carId),
        fuelType: directorText(fuelForm.fuelType),
        liters: directorDecimal(fuelForm.liters),
        amount: directorAmd(fuelForm.amount),
        paymentMethod: directorPayment(fuelForm.paymentMethod),
      };
      if (fuelEditingId != null) {
        await updateDirectorFuel(fuelEditingId, body);
        showToast("Թարմացված է", "success");
      } else {
        await createDirectorFuel(body);
        showToast("Գրանցված է", "success");
      }
      resetFuelForm();
      reload();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    }
  };

  const startEditFuel = (row: DirectorFuel) => {
    setFuelEditingId(row.id);
    setFuelForm({
      date: row.date,
      instructorUserId: row.instructorUserId != null ? String(row.instructorUserId) : "",
      carId: row.carId != null ? String(row.carId) : "",
      fuelType: row.fuelType,
      liters: String(row.liters),
      amount: String(row.amount),
      paymentMethod: row.paymentMethod,
    });
  };

  const submitKm = async () => {
    try {
      const body = {
        date: directorDate(kmForm.date),
        instructorUserId: directorOptionalId(kmForm.instructorUserId),
        km: directorDecimal(kmForm.km),
        comment: null,
      };
      if (kmEditingId != null) {
        await updateDirectorKm(kmEditingId, body);
        showToast("Թարմացված է", "success");
      } else {
        await createDirectorKm(body);
        showToast("Գրանցված է", "success");
      }
      resetKmForm();
      reload();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    }
  };

  const startEditKm = (row: DirectorKm) => {
    setKmEditingId(row.id);
    setKmForm({
      date: row.date,
      instructorUserId: row.instructorUserId != null ? String(row.instructorUserId) : "",
      km: String(row.km),
    });
  };

  return (
    <DirectorLayout>
      <PanelPageHeader icon={Fuel} title="Վառելիք / Կիլոմետրեր" />
      <div className="space-y-6">
        <DirectorCard>
          <h2 className="text-base font-semibold text-foreground mb-4">Վառելիք</h2>
          <DirectorDateFilters start={start} end={end} onStartChange={setStart} onEndChange={setEnd} onRefresh={reload} />
          <DirectorFormRow>
            <DirectorField label="Ամսաթիվ">
              <DirectorInput type="date" value={fuelForm.date} onChange={(e) => setFuelForm((f) => ({ ...f, date: e.target.value }))} />
            </DirectorField>
            <DirectorField label="Հրահանգիչ">
              <DirectorSelect value={fuelForm.instructorUserId} onChange={(e) => setFuelForm((f) => ({ ...f, instructorUserId: e.target.value }))}>
                <option value="">—</option>
                {instructors.map((i) => (
                  <option key={i.id} value={String(i.id)}>{i.name}</option>
                ))}
              </DirectorSelect>
            </DirectorField>
            <DirectorField label="Մեքենա">
              <DirectorSelect value={fuelForm.carId} onChange={(e) => setFuelForm((f) => ({ ...f, carId: e.target.value }))}>
                <option value="">—</option>
                {cars.map((c) => (
                  <option key={c.id} value={String(c.id)}>{c.plate || c.model}</option>
                ))}
              </DirectorSelect>
            </DirectorField>
            <DirectorField label="Վառելիք">
              <DirectorDynamicSelect
                category={DIRECTOR_OPTION_CATEGORY.fuelType}
                value={fuelForm.fuelType}
                onChange={(fuelType) => setFuelForm((f) => ({ ...f, fuelType }))}
              />
            </DirectorField>
            <DirectorField label="Լիտր">
              <DirectorInput value={fuelForm.liters} onChange={(e) => setFuelForm((f) => ({ ...f, liters: e.target.value }))} />
            </DirectorField>
            <DirectorField label="Գումար">
              <DirectorInput value={fuelForm.amount} onChange={(e) => setFuelForm((f) => ({ ...f, amount: e.target.value }))} />
            </DirectorField>
            <DirectorField label="Վճարում">
              <DirectorPaymentSelect value={fuelForm.paymentMethod} onChange={(paymentMethod) => setFuelForm((f) => ({ ...f, paymentMethod }))} />
            </DirectorField>
            <DirectorFormActions
              editing={fuelEditingId != null}
              createLabel="Գրանցել վառելիք"
              onSubmit={() => void submitFuel()}
              onCancel={resetFuelForm}
            />
          </DirectorFormRow>
        </DirectorCard>
        <DirectorTableWrap>
          <DirectorTableHead>
            <DirectorTableTh>Ամսաթիվ</DirectorTableTh>
            <DirectorTableTh>Հրահանգիչ</DirectorTableTh>
            <DirectorTableTh>Վառելիք</DirectorTableTh>
            <DirectorTableTh>Լիտր</DirectorTableTh>
            <DirectorTableTh>Գումար</DirectorTableTh>
            <DirectorTableTh />
          </DirectorTableHead>
          <DirectorTableBody>
            {fuelRows.map((r) => (
              <DirectorTableRow key={r.id}>
                <DirectorTableTd>{r.date}</DirectorTableTd>
                <DirectorTableTd>{instructorName(r.instructorUserId)}</DirectorTableTd>
                <DirectorTableTd>{r.fuelType}</DirectorTableTd>
                <DirectorTableTd>{r.liters}</DirectorTableTd>
                <DirectorTableTd>{formatAmd(r.amount)} ({DIRECTOR_PAYMENT_LABELS[r.paymentMethod]})</DirectorTableTd>
                <DirectorTableTd>
                  <DirectorRecordActions
                    onEdit={() => startEditFuel(r)}
                    onDelete={() => void deleteDirectorFuel(r.id).then(reload)}
                  />
                </DirectorTableTd>
              </DirectorTableRow>
            ))}
          </DirectorTableBody>
        </DirectorTableWrap>

        <DirectorCard>
          <h2 className="text-base font-semibold text-foreground mb-4">Կիլոմետրեր</h2>
          <DirectorFormRow>
            <DirectorField label="Ամսաթիվ">
              <DirectorInput type="date" value={kmForm.date} onChange={(e) => setKmForm((f) => ({ ...f, date: e.target.value }))} />
            </DirectorField>
            <DirectorField label="Հրահանգիչ">
              <DirectorSelect value={kmForm.instructorUserId} onChange={(e) => setKmForm((f) => ({ ...f, instructorUserId: e.target.value }))}>
                <option value="">—</option>
                {instructors.map((i) => (
                  <option key={i.id} value={String(i.id)}>{i.name}</option>
                ))}
              </DirectorSelect>
            </DirectorField>
            <DirectorField label="ԿՄ">
              <DirectorInput value={kmForm.km} onChange={(e) => setKmForm((f) => ({ ...f, km: e.target.value }))} />
            </DirectorField>
            <DirectorFormActions
              editing={kmEditingId != null}
              createLabel="Գրանցել ԿՄ"
              onSubmit={() => void submitKm()}
              onCancel={resetKmForm}
            />
          </DirectorFormRow>
        </DirectorCard>
        <DirectorTableWrap>
          <DirectorTableHead>
            <DirectorTableTh>Ամսաթիվ</DirectorTableTh>
            <DirectorTableTh>Հրահանգիչ</DirectorTableTh>
            <DirectorTableTh>ԿՄ</DirectorTableTh>
            <DirectorTableTh />
          </DirectorTableHead>
          <DirectorTableBody>
            {kmRows.map((r) => (
              <DirectorTableRow key={r.id}>
                <DirectorTableTd>{r.date}</DirectorTableTd>
                <DirectorTableTd>{instructorName(r.instructorUserId)}</DirectorTableTd>
                <DirectorTableTd>{r.km}</DirectorTableTd>
                <DirectorTableTd>
                  <DirectorRecordActions
                    onEdit={() => startEditKm(r)}
                    onDelete={() => void deleteDirectorKm(r.id).then(reload)}
                  />
                </DirectorTableTd>
              </DirectorTableRow>
            ))}
          </DirectorTableBody>
        </DirectorTableWrap>
      </div>
    </DirectorLayout>
  );
}
