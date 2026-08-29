import DirectorLayout from "src/modules/director/DirectorLayout";
import DirectorDynamicSelect from "src/modules/director/components/DirectorDynamicSelect";
import DirectorPaymentSelect from "src/modules/director/components/DirectorPaymentSelect";
import DirectorDateFilters, {
  useDirectorDateRange,
  useDirectorReload,
} from "src/modules/director/components/DirectorDateFilters";
import PanelPageHeader from "src/components/PanelPageHeader";
import {
  DirectorButton,
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
} from "src/modules/director/director.api";
import { DIRECTOR_OPTION_CATEGORY, DIRECTOR_PAYMENT_LABELS, todayIso } from "src/modules/director/director.consts";
import type { DirectorFuel, DirectorKm, DirectorPaymentMethod } from "src/modules/director/director.types";
import type { Instructor } from "src/data/instructors";
import { formatAmd, parseAmdInput } from "src/pages/admin/finance/adminFinanceShared";
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

  const instructorName = (id: number) => instructors.find((i) => String(i.id) === String(id))?.name ?? `#${id}`;

  const submitFuel = async () => {
    const amount = parseAmdInput(fuelForm.amount);
    const liters = Number(fuelForm.liters);
    const instructorUserId = Number(fuelForm.instructorUserId);
    if (!amount || !liters || !instructorUserId) {
      showToast("Լրացրեք բոլոր դաշտերը", "error");
      return;
    }
    try {
      await createDirectorFuel({
        date: fuelForm.date,
        instructorUserId,
        carId: fuelForm.carId ? Number(fuelForm.carId) : null,
        fuelType: fuelForm.fuelType,
        liters,
        amount,
        paymentMethod: fuelForm.paymentMethod,
      });
      setFuelForm((f) => ({ ...f, liters: "", amount: "" }));
      reload();
      showToast("Գրանցված է", "success");
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    }
  };

  const submitKm = async () => {
    const km = Number(kmForm.km);
    const instructorUserId = Number(kmForm.instructorUserId);
    if (!km || !instructorUserId) {
      showToast("Լրացրեք բոլոր դաշտերը", "error");
      return;
    }
    try {
      await createDirectorKm({ date: kmForm.date, instructorUserId, km, comment: null });
      setKmForm((f) => ({ ...f, km: "" }));
      reload();
      showToast("Գրանցված է", "success");
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    }
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
            <DirectorButton className="self-start" onClick={() => void submitFuel()}>Գրանցել վառելիք</DirectorButton>
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
                  <DirectorButton variant="ghost" size="sm" onClick={() => void deleteDirectorFuel(r.id).then(reload)}>Ջնջել</DirectorButton>
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
            <DirectorButton className="self-start" onClick={() => void submitKm()}>Գրանցել ԿՄ</DirectorButton>
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
                  <DirectorButton variant="ghost" size="sm" onClick={() => void deleteDirectorKm(r.id).then(reload)}>Ջնջել</DirectorButton>
                </DirectorTableTd>
              </DirectorTableRow>
            ))}
          </DirectorTableBody>
        </DirectorTableWrap>
      </div>
    </DirectorLayout>
  );
}
