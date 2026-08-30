import DirectorLayout from "src/modules/director/DirectorLayout";
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
  DirectorStatCard,
  DirectorStatGrid,
  DirectorTextarea,
  DirectorTableBody,
  DirectorTableHead,
  DirectorTableRow,
  DirectorTableTd,
  DirectorTableTh,
  DirectorTableWrap,
} from "src/modules/director/components/DirectorUi";
import {
  createDirectorInstructorHours,
  deleteDirectorInstructorHours,
  fetchDirectorInstructorHours,
  updateDirectorInstructorHours,
} from "src/modules/director/director.api";
import {
  directorDate,
  directorDecimal,
  directorOptionalComment,
  directorOptionalId,
} from "src/modules/director/directorFormValues";
import { isLegacyDirectorRecord, todayIso } from "src/modules/director/director.consts";
import type { DirectorInstructorHours } from "src/modules/director/director.types";
import type { Instructor } from "src/data/instructors";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { useToast } from "src/lib/toast";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock } from "lucide-react";
import {
  DirectorChartPanel,
  DirectorRankChart,
  DirectorReportGrid,
  DirectorReportSection,
  DirectorTrendChart,
} from "src/modules/director/components/DirectorCharts";
import { sumBy, sumByMonth, topN } from "src/modules/director/directorChartUtils";

export default function DirectorInstructorHoursPage() {
  const { showToast } = useToast();
  const { start, end, setStart, setEnd, query, branchFilterRevision } = useDirectorDateRange();
  const [rows, setRows] = useState<DirectorInstructorHours[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    date: todayIso(),
    instructorUserId: "",
    hours: "",
    comment: "",
  });

  useEffect(() => {
    void vivaApiJson<Instructor[]>("/instructors").then((d) => setInstructors(Array.isArray(d) ? d : [])).catch(() => setInstructors([]));
  }, []);

  const load = useCallback(async () => {
    try {
      const list = await fetchDirectorInstructorHours(query);
      setRows(Array.isArray(list) ? list : []);
    } catch (e) {
      setRows([]);
      showToast(getApiErrorMessage(e), "error");
    }
  }, [query, showToast]);

  const reload = useDirectorReload(load, [query, branchFilterRevision]);

  const resetForm = () => {
    setEditingId(null);
    setForm({ date: todayIso(), instructorUserId: "", hours: "", comment: "" });
  };

  const buildBody = () => ({
    date: directorDate(form.date),
    instructorUserId: directorOptionalId(form.instructorUserId),
    hours: directorDecimal(form.hours),
    comment: directorOptionalComment(form.comment),
  });

  const submit = async () => {
    try {
      const body = buildBody();
      if (editingId != null) {
        await updateDirectorInstructorHours(editingId, body);
        showToast("Թարմացված է", "success");
      } else {
        await createDirectorInstructorHours(body);
        showToast("Գրանցված է", "success");
      }
      resetForm();
      reload();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    }
  };

  const startEdit = (row: DirectorInstructorHours) => {
    setEditingId(row.id);
    setForm({
      date: row.date,
      instructorUserId: row.instructorUserId != null ? String(row.instructorUserId) : "",
      hours: String(row.hours),
      comment: row.comment ?? "",
    });
  };

  const instructorName = (id: number | null) =>
    id == null ? "—" : instructors.find((i) => String(i.id) === String(id))?.name ?? `#${id}`;

  const byMonth = useMemo(() => sumByMonth(rows, (r) => r.date, (r) => r.hours), [rows]);
  const byInstructor = useMemo(
    () => topN(sumBy(rows, (r) => instructorName(r.instructorUserId), (r) => r.hours), 8),
    [rows, instructors],
  );
  const totalHours = useMemo(() => rows.reduce((s, r) => s + r.hours, 0), [rows]);
  const avgDaily = useMemo(() => {
    const days = new Set(rows.map((r) => r.date)).size;
    return days > 0 ? totalHours / days : 0;
  }, [rows, totalHours]);

  return (
    <DirectorLayout>
      <PanelPageHeader icon={Clock} title="Հրահանգիչների ժամեր" />
      <DirectorDateFilters start={start} end={end} onStartChange={setStart} onEndChange={setEnd} onRefresh={reload} />

      <DirectorReportSection title={`Հաշվետվություն · ${totalHours.toFixed(1)} ժամ · ${rows.length} գրառում`}>
        <DirectorStatGrid>
          <DirectorStatCard label="Ընդամենը ժամ" value={totalHours.toFixed(1)} />
          <DirectorStatCard label="Միջ. ժամ/օր" value={avgDaily.toFixed(1)} />
          <DirectorStatCard label="Հրահանգիչներ" value={new Set(rows.map((r) => r.instructorUserId).filter(Boolean)).size} />
          <DirectorStatCard label="Գրառումներ" value={rows.length} />
        </DirectorStatGrid>
        <DirectorReportGrid className="mt-4">
          <DirectorChartPanel title="Ժամեր ըստ ամիսների">
            <DirectorTrendChart points={byMonth} label="Ժամ" />
          </DirectorChartPanel>
          <DirectorChartPanel title="Հրահանգիչներ Top 8">
            <DirectorRankChart points={byInstructor} label="Ժամ" />
          </DirectorChartPanel>
        </DirectorReportGrid>
      </DirectorReportSection>

      <DirectorCard className="mt-6">
        <DirectorFormRow>
          <DirectorField label="Ամսաթիվ">
            <DirectorInput type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
          </DirectorField>
          <DirectorField label="Հրահանգիչ">
            <DirectorSelect value={form.instructorUserId} onChange={(e) => setForm((f) => ({ ...f, instructorUserId: e.target.value }))}>
              <option value="">—</option>
              {instructors.map((i) => (
                <option key={i.id} value={String(i.id)}>{i.name}</option>
              ))}
            </DirectorSelect>
          </DirectorField>
          <DirectorField label="Ժամ">
            <DirectorInput value={form.hours} onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))} />
          </DirectorField>
          <DirectorField label="Մեկնաբանություն">
            <DirectorTextarea rows={3} value={form.comment} onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))} />
          </DirectorField>
          <DirectorFormActions
            editing={editingId != null}
            createLabel="Գրանցել ժամերը"
            onSubmit={() => void submit()}
            onCancel={resetForm}
          />
        </DirectorFormRow>
      </DirectorCard>
      <DirectorTableWrap>
        <DirectorTableHead>
          <DirectorTableTh>Ամսաթիվ</DirectorTableTh>
          <DirectorTableTh>Հրահանգիչ</DirectorTableTh>
          <DirectorTableTh>Ժամ</DirectorTableTh>
          <DirectorTableTh>Մեկնաբանություն</DirectorTableTh>
          <DirectorTableTh />
        </DirectorTableHead>
        <DirectorTableBody>
          {rows.map((r) => (
            <DirectorTableRow key={r.id}>
              <DirectorTableTd>{r.date}</DirectorTableTd>
              <DirectorTableTd>{instructorName(r.instructorUserId)}</DirectorTableTd>
              <DirectorTableTd>{r.hours}</DirectorTableTd>
              <DirectorTableTd>{r.comment ?? "—"}</DirectorTableTd>
              <DirectorTableTd>
                <DirectorRecordActions
                  readOnly={isLegacyDirectorRecord(r.id)}
                  onEdit={() => startEdit(r)}
                  onDelete={() => void deleteDirectorInstructorHours(r.id).then(reload)}
                />
              </DirectorTableTd>
            </DirectorTableRow>
          ))}
        </DirectorTableBody>
      </DirectorTableWrap>
    </DirectorLayout>
  );
}
