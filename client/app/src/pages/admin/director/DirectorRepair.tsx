import DirectorLayout from "src/modules/director/DirectorLayout";
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
  DirectorTextarea,
  DirectorTableBody,
  DirectorTableHead,
  DirectorTableRow,
  DirectorTableTd,
  DirectorTableTh,
  DirectorTableWrap,
} from "src/modules/director/components/DirectorUi";
import { createDirectorRepair, deleteDirectorRepair, fetchDirectorRepairs } from "src/modules/director/director.api";
import { DIRECTOR_PAYMENT_LABELS, todayIso } from "src/modules/director/director.consts";
import type { DirectorPaymentMethod, DirectorRepair } from "src/modules/director/director.types";
import { formatAmd, parseAmdInput } from "src/pages/admin/finance/adminFinanceShared";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { useToast } from "src/lib/toast";
import { useCallback, useEffect, useState } from "react";
import { Wrench } from "lucide-react";

type CarOption = { id: number; label: string };

export default function DirectorRepairPage() {
  const { showToast } = useToast();
  const { start, end, setStart, setEnd, query, branchFilterRevision } = useDirectorDateRange();
  const [rows, setRows] = useState<DirectorRepair[]>([]);
  const [cars, setCars] = useState<CarOption[]>([]);
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

  const submit = async () => {
    const amount = parseAmdInput(form.amount);
    if (!amount || !form.workDone.trim()) {
      showToast("Լրացրեք պարտադիր դաշտերը", "error");
      return;
    }
    try {
      await createDirectorRepair({
        date: form.date,
        carId: form.carId ? Number(form.carId) : null,
        licensePlate: form.licensePlate.trim() || null,
        workDone: form.workDone.trim(),
        amount,
        paymentMethod: form.paymentMethod,
        comment: form.comment.trim() || null,
      });
      setForm((f) => ({ ...f, workDone: "", amount: "", comment: "" }));
      reload();
      showToast("Գրանցված է", "success");
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    }
  };

  const carLabel = (id: number | null, plate: string | null) => {
    if (plate) return plate;
    if (id) return cars.find((c) => c.id === id)?.label ?? `#${id}`;
    return "—";
  };

  return (
    <DirectorLayout>
      <PanelPageHeader icon={Wrench} title="Մեքենայի վերանորոգում" />
      <DirectorCard>
        <DirectorDateFilters start={start} end={end} onStartChange={setStart} onEndChange={setEnd} onRefresh={reload} />
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
          <DirectorButton className="self-start" onClick={() => void submit()}>Գրանցել վերանորոգում</DirectorButton>
        </DirectorFormRow>
      </DirectorCard>
      <DirectorTableWrap>
        <DirectorTableHead>
          <DirectorTableTh>Ամսաթիվ</DirectorTableTh>
          <DirectorTableTh>Մեքենա</DirectorTableTh>
          <DirectorTableTh>Ինչ է արվել</DirectorTableTh>
          <DirectorTableTh>Գումար</DirectorTableTh>
          <DirectorTableTh>Վճարում</DirectorTableTh>
          <DirectorTableTh />
        </DirectorTableHead>
        <DirectorTableBody>
          {rows.map((r) => (
            <DirectorTableRow key={r.id}>
              <DirectorTableTd>{r.date}</DirectorTableTd>
              <DirectorTableTd>{carLabel(r.carId, r.licensePlate)}</DirectorTableTd>
              <DirectorTableTd>{r.workDone}</DirectorTableTd>
              <DirectorTableTd>{formatAmd(r.amount)}</DirectorTableTd>
              <DirectorTableTd>{DIRECTOR_PAYMENT_LABELS[r.paymentMethod]}</DirectorTableTd>
              <DirectorTableTd>
                <DirectorButton variant="ghost" size="sm" onClick={() => void deleteDirectorRepair(r.id).then(reload)}>
                  Ջնջել
                </DirectorButton>
              </DirectorTableTd>
            </DirectorTableRow>
          ))}
        </DirectorTableBody>
      </DirectorTableWrap>
    </DirectorLayout>
  );
}
