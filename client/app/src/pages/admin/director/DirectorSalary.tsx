import DirectorLayout from "src/modules/director/DirectorLayout";
import DirectorDynamicSelect from "src/modules/director/components/DirectorDynamicSelect";
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
  DirectorTextarea,
  DirectorTableBody,
  DirectorTableHead,
  DirectorTableRow,
  DirectorTableTd,
  DirectorTableTh,
  DirectorTableWrap,
} from "src/modules/director/components/DirectorUi";
import { createDirectorSalary, deleteDirectorSalary, fetchDirectorSalaries, updateDirectorSalary } from "src/modules/director/director.api";
import { DIRECTOR_OPTION_CATEGORY, isLegacyDirectorRecord, todayIso } from "src/modules/director/director.consts";
import type { DirectorSalary } from "src/modules/director/director.types";
import { formatAmd, parseAmdInput } from "src/pages/admin/finance/adminFinanceShared";
import {
  directorAmd,
  directorDate,
  directorDecimal,
  directorOptionalComment,
  directorText,
} from "src/modules/director/directorFormValues";
import { getApiErrorMessage } from "src/lib/vivaApi";
import { useToast } from "src/lib/toast";
import { useCallback, useMemo, useState } from "react";
import { Banknote } from "lucide-react";
import {
  DirectorChartPanel,
  DirectorRankChart,
  DirectorReportGrid,
  DirectorReportSection,
  DirectorTrendChart,
  DirectorDoughnutChart,
} from "src/modules/director/components/DirectorCharts";
import { sumBy, sumByMonth, topN } from "src/modules/director/directorChartUtils";

export default function DirectorSalaryPage() {
  const { showToast } = useToast();
  const { start, end, setStart, setEnd, query, branchFilterRevision } = useDirectorDateRange();
  const [rows, setRows] = useState<DirectorSalary[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
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

  const resetForm = () => {
    setEditingId(null);
    setForm({
      date: todayIso(),
      name: "",
      role: "Հրահանգիչ",
      hours: "",
      hourlyRate: "",
      comment: "",
    });
  };

  const buildBody = () => {
    const totalAmd = computedTotal || directorAmd(form.hourlyRate);
    return {
      date: directorDate(form.date),
      name: directorText(form.name),
      role: directorText(form.role),
      hours: form.hours.trim() ? directorDecimal(form.hours) : null,
      hourlyRate: form.hourlyRate.trim() ? directorAmd(form.hourlyRate) : null,
      totalAmd,
      comment: directorOptionalComment(form.comment),
    };
  };

  const submit = async () => {
    try {
      const body = buildBody();
      if (editingId != null) {
        await updateDirectorSalary(editingId, body);
        showToast("Թարմացված է", "success");
      } else {
        await createDirectorSalary(body);
        showToast("Գրանցված է", "success");
      }
      resetForm();
      reload();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    }
  };

  const startEdit = (row: DirectorSalary) => {
    setEditingId(row.id);
    setForm({
      date: row.date,
      name: row.name,
      role: row.role,
      hours: row.hours != null ? String(row.hours) : "",
      hourlyRate: row.hourlyRate != null ? String(row.hourlyRate) : "",
      comment: row.comment ?? "",
    });
  };

  const byRole = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) map.set(r.role, (map.get(r.role) ?? 0) + r.totalAmd);
    return [...map.entries()].map(([label, value]) => ({ label, value }));
  }, [rows]);

  const byEmployee = useMemo(
    () => topN(sumBy(rows, (r) => r.name, (r) => r.totalAmd), 8),
    [rows],
  );
  const byMonth = useMemo(() => sumByMonth(rows, (r) => r.date, (r) => r.totalAmd), [rows]);
  const totalPaid = useMemo(() => rows.reduce((s, r) => s + r.totalAmd, 0), [rows]);

  return (
    <DirectorLayout>
      <PanelPageHeader icon={Banknote} title="Աշխատավարձ" />
      <DirectorDateFilters start={start} end={end} onStartChange={setStart} onEndChange={setEnd} onRefresh={reload} />

      <DirectorReportSection title={`Հաշվետվություն · ${formatAmd(totalPaid)}`}>
        <DirectorReportGrid>
          <DirectorChartPanel title="Աշխատավարձ ըստ ամիսների">
            <DirectorTrendChart points={byMonth} label="Աշխատավարձ" />
          </DirectorChartPanel>
          <DirectorChartPanel title="Ըստ դերի">
            <DirectorDoughnutChart points={byRole.filter((p) => p.value > 0)} />
          </DirectorChartPanel>
          <DirectorChartPanel title="Ըստ դերի (գումար)">
            <DirectorRankChart points={byRole.filter((p) => p.value > 0)} />
          </DirectorChartPanel>
          <DirectorChartPanel title="Աշխատողներ Top 8">
            <DirectorRankChart points={byEmployee} />
          </DirectorChartPanel>
        </DirectorReportGrid>
      </DirectorReportSection>

      <DirectorCard className="mt-6">
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
          <DirectorFormActions
            editing={editingId != null}
            createLabel="Գրանցել աշխատավարձ"
            onSubmit={() => void submit()}
            onCancel={resetForm}
          />
        </DirectorFormRow>
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
                <DirectorRecordActions
                  readOnly={isLegacyDirectorRecord(r.id)}
                  onEdit={() => startEdit(r)}
                  onDelete={() => void deleteDirectorSalary(r.id).then(reload)}
                />
              </DirectorTableTd>
            </DirectorTableRow>
          ))}
        </DirectorTableBody>
      </DirectorTableWrap>
    </DirectorLayout>
  );
}
