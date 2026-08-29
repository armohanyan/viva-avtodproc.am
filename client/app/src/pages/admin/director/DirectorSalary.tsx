import DirectorLayout from "src/modules/director/DirectorLayout";
import DirectorDynamicSelect from "src/modules/director/components/DirectorDynamicSelect";
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
  DirectorTextarea,
  DirectorTableBody,
  DirectorTableHead,
  DirectorTableRow,
  DirectorTableTd,
  DirectorTableTh,
  DirectorTableWrap,
} from "src/modules/director/components/DirectorUi";
import { createDirectorSalary, deleteDirectorSalary, fetchDirectorSalaries } from "src/modules/director/director.api";
import { DIRECTOR_OPTION_CATEGORY, todayIso } from "src/modules/director/director.consts";
import type { DirectorSalary } from "src/modules/director/director.types";
import { formatAmd, parseAmdInput } from "src/pages/admin/finance/adminFinanceShared";
import { getApiErrorMessage } from "src/lib/vivaApi";
import { useToast } from "src/lib/toast";
import { useCallback, useMemo, useState } from "react";
import { Bar } from "react-chartjs-2";
import { Banknote } from "lucide-react";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

export default function DirectorSalaryPage() {
  const { showToast } = useToast();
  const { start, end, setStart, setEnd, query, branchFilterRevision } = useDirectorDateRange();
  const [rows, setRows] = useState<DirectorSalary[]>([]);
  const [form, setForm] = useState({
    date: todayIso(),
    name: "",
    role: "Հրահանգիչ",
    hours: "",
    hourlyRate: "",
    comment: "",
  });

  const load = useCallback(async () => {
    try {
      const list = await fetchDirectorSalaries(query);
      setRows(Array.isArray(list) ? list : []);
    } catch (e) {
      setRows([]);
      showToast(getApiErrorMessage(e), "error");
    }
  }, [query, showToast]);

  const reload = useDirectorReload(load, [query, branchFilterRevision]);

  const computedTotal = useMemo(() => {
    const h = Number(form.hours);
    const rate = parseAmdInput(form.hourlyRate);
    if (h > 0 && rate > 0) return Math.round(h * rate);
    return 0;
  }, [form.hours, form.hourlyRate]);

  const submit = async () => {
    const totalAmd = computedTotal || parseAmdInput(form.hourlyRate);
    if (!form.name.trim() || !totalAmd) {
      showToast("Լրացրեք անուն և գումար", "error");
      return;
    }
    try {
      await createDirectorSalary({
        date: form.date,
        name: form.name.trim(),
        role: form.role,
        hours: form.hours ? Number(form.hours) : null,
        hourlyRate: form.hourlyRate ? parseAmdInput(form.hourlyRate) : null,
        totalAmd,
        comment: form.comment.trim() || null,
      });
      setForm((f) => ({ ...f, name: "", hours: "", hourlyRate: "", comment: "" }));
      reload();
      showToast("Գրանցված է", "success");
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    }
  };

  const byRole = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) map.set(r.role, (map.get(r.role) ?? 0) + r.totalAmd);
    return [...map.entries()].map(([label, value]) => ({ label, value }));
  }, [rows]);

  return (
    <DirectorLayout>
      <PanelPageHeader icon={Banknote} title="Աշխատավարձ" />
      <DirectorCard>
        <DirectorDateFilters start={start} end={end} onStartChange={setStart} onEndChange={setEnd} onRefresh={reload} />
        <DirectorFormRow>
          <DirectorField label="Ամսաթիվ">
            <DirectorInput type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
          </DirectorField>
          <DirectorField label="Անուն">
            <DirectorInput value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </DirectorField>
          <DirectorField label="Դեր">
            <DirectorDynamicSelect
              category={DIRECTOR_OPTION_CATEGORY.salRole}
              value={form.role}
              onChange={(role) => setForm((f) => ({ ...f, role }))}
            />
          </DirectorField>
          <DirectorField label="Ժամ">
            <DirectorInput value={form.hours} onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))} />
          </DirectorField>
          <DirectorField label="Ժամավճար">
            <DirectorInput value={form.hourlyRate} onChange={(e) => setForm((f) => ({ ...f, hourlyRate: e.target.value }))} />
          </DirectorField>
          <DirectorField label="Ընդամենը">
            <DirectorInput value={computedTotal ? String(computedTotal) : ""} readOnly />
          </DirectorField>
          <DirectorField label="Մեկնաբանություն">
            <DirectorTextarea rows={3} value={form.comment} onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))} />
          </DirectorField>
          <DirectorButton className="self-start" onClick={() => void submit()}>Գրանցել աշխատավարձ</DirectorButton>
        </DirectorFormRow>
        {byRole.length > 0 ? (
          <div className="mt-6 h-48">
            <Bar
              data={{
                labels: byRole.map((r) => r.label),
                datasets: [{ data: byRole.map((r) => r.value), backgroundColor: "hsl(var(--primary))" }],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
              }}
            />
          </div>
        ) : null}
      </DirectorCard>
      <DirectorTableWrap>
        <DirectorTableHead>
          <DirectorTableTh>Ամսաթիվ</DirectorTableTh>
          <DirectorTableTh>Անուն</DirectorTableTh>
          <DirectorTableTh>Դեր</DirectorTableTh>
          <DirectorTableTh>Ժամ</DirectorTableTh>
          <DirectorTableTh>Գումար</DirectorTableTh>
          <DirectorTableTh />
        </DirectorTableHead>
        <DirectorTableBody>
          {rows.map((r) => (
            <DirectorTableRow key={r.id}>
              <DirectorTableTd>{r.date}</DirectorTableTd>
              <DirectorTableTd>{r.name}</DirectorTableTd>
              <DirectorTableTd>{r.role}</DirectorTableTd>
              <DirectorTableTd>{r.hours ?? "—"}</DirectorTableTd>
              <DirectorTableTd>{formatAmd(r.totalAmd)}</DirectorTableTd>
              <DirectorTableTd>
                <DirectorButton variant="ghost" size="sm" onClick={() => void deleteDirectorSalary(r.id).then(reload)}>Ջնջել</DirectorButton>
              </DirectorTableTd>
            </DirectorTableRow>
          ))}
        </DirectorTableBody>
      </DirectorTableWrap>
    </DirectorLayout>
  );
}
