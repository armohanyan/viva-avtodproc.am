import DirectorLayout from "src/modules/director/DirectorLayout";
import DirectorDateFilters, {
  useDirectorDateRange,
  useDirectorReload,
} from "src/modules/director/components/DirectorDateFilters";
import DirectorFormActions from "src/modules/director/components/DirectorFormActions";
import DirectorRecordActions from "src/modules/director/components/DirectorRecordActions";
import DirectorSectionNav, { useDirectorSectionView } from "src/modules/director/components/DirectorSectionNav";
import DirectorDataTable from "src/modules/director/components/DirectorDataTable";
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
import { useBranches } from "src/modules/branches";
import {
  directorInstructorLabelById,
  formatDirectorInstructorLabel,
} from "src/modules/director/directorInstructorLabels";
import { useDirectorTable } from "src/modules/director/useDirectorTable";
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
import { formatDirectorLessonSlots } from "src/modules/director/directorFormat";
import { sumBy, sumByMonth, topN } from "src/modules/director/directorChartUtils";

const BASE_PATH = "/admin/director/instructor-hours";

export default function DirectorInstructorHoursPage() {
  const { showToast } = useToast();
  const view = useDirectorSectionView(BASE_PATH);
  const { start, end, setStart, setEnd, query, branchFilterRevision } = useDirectorDateRange();
  const [rows, setRows] = useState<DirectorInstructorHours[]>([]);
  const { branches } = useBranches();
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

  const instructorName = (id: number | null) =>
    directorInstructorLabelById(id, instructors, branches);

  const resetForm = () => {
    setEditingId(null);
    setForm({ date: todayIso(), instructorUserId: "", hours: "", comment: "" });
  };

  const submit = async () => {
    try {
      const body = {
        date: directorDate(form.date),
        instructorUserId: directorOptionalId(form.instructorUserId),
        hours: directorDecimal(form.hours),
        comment: directorOptionalComment(form.comment),
      };
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

  const byMonth = useMemo(() => sumByMonth(rows, (r) => r.date, (r) => r.hours), [rows]);
  const byInstructor = useMemo(
    () => topN(sumBy(rows, (r) => instructorName(r.instructorUserId), (r) => r.hours), 8),
    [rows, instructors, branches],
  );
  const totalHours = useMemo(() => rows.reduce((s, r) => s + r.hours, 0), [rows]);
  const avgDaily = useMemo(() => {
    const days = new Set(rows.map((r) => r.date)).size;
    return days > 0 ? totalHours / days : 0;
  }, [rows, totalHours]);

  const tableColumns = useMemo(
    () => [
      {
        id: "date",
        header: "Ամսաթիվ",
        sortable: true,
        sortValue: (r: DirectorInstructorHours) => r.date,
        searchValue: (r: DirectorInstructorHours) => r.date,
        render: (r: DirectorInstructorHours) => r.date,
      },
      {
        id: "instructor",
        header: "Հրահանգիչ",
        sortable: true,
        filterable: true,
        sortValue: (r: DirectorInstructorHours) => instructorName(r.instructorUserId),
        filterValue: (r: DirectorInstructorHours) => instructorName(r.instructorUserId),
        searchValue: (r: DirectorInstructorHours) => instructorName(r.instructorUserId),
        render: (r: DirectorInstructorHours) => instructorName(r.instructorUserId),
      },
      {
        id: "hours",
        header: "Դասեր",
        sortable: true,
        sortValue: (r: DirectorInstructorHours) => r.hours,
        searchValue: (r: DirectorInstructorHours) => String(r.hours),
        render: (r: DirectorInstructorHours) => formatDirectorLessonSlots(r.hours),
      },
      {
        id: "comment",
        header: "Մեկնաբանություն",
        searchValue: (r: DirectorInstructorHours) => r.comment ?? "",
        render: (r: DirectorInstructorHours) => r.comment ?? "—",
      },
      {
        id: "actions",
        header: "",
        align: "end" as const,
        render: (r: DirectorInstructorHours) => (
          <DirectorRecordActions
            readOnly={isLegacyDirectorRecord(r.id)}
            onEdit={() => startEdit(r)}
            onDelete={() => void deleteDirectorInstructorHours(r.id).then(reload)}
          />
        ),
      },
    ],
    [instructors, branches, reload],
  );

  const table = useDirectorTable({ rows, columns: tableColumns });

  return (
    <DirectorLayout>
      <PanelPageHeader icon={Clock} title="Հրահանգիչների դասեր" />
      <DirectorDateFilters start={start} end={end} onStartChange={setStart} onEndChange={setEnd} onRefresh={reload} />
      <DirectorSectionNav basePath={BASE_PATH} />

      {view === "report" ? (
        <DirectorReportSection title={`Հաշվետվություն · ${formatDirectorLessonSlots(totalHours)} դաս · ${rows.length} գրառում`}>
          <DirectorStatGrid>
            <DirectorStatCard label="Ընդամենը դաս" value={formatDirectorLessonSlots(totalHours)} />
            <DirectorStatCard label="Միջ. դաս/օր" value={formatDirectorLessonSlots(avgDaily, { average: true })} />
            <DirectorStatCard label="Հրահանգիչներ" value={new Set(rows.map((r) => r.instructorUserId).filter(Boolean)).size} />
            <DirectorStatCard label="Գրառումներ" value={rows.length} />
          </DirectorStatGrid>
          <DirectorReportGrid className="mt-4">
            <DirectorChartPanel title="Դասեր ըստ ամիսների">
              <DirectorTrendChart points={byMonth} label="Դաս" />
            </DirectorChartPanel>
            <DirectorChartPanel title="Հրահանգիչներ Top 8">
              <DirectorRankChart points={byInstructor} label="Դաս" />
            </DirectorChartPanel>
          </DirectorReportGrid>
        </DirectorReportSection>
      ) : (
        <>
          <DirectorCard>
            <DirectorFormRow>
              <DirectorField label="Ամսաթիվ">
                <DirectorInput type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
              </DirectorField>
              <DirectorField label="Հրահանգիչ">
                <DirectorSelect value={form.instructorUserId} onChange={(e) => setForm((f) => ({ ...f, instructorUserId: e.target.value }))}>
                  <option value="">—</option>
                  {instructors.map((i) => (
                    <option key={i.id} value={String(i.id)}>{formatDirectorInstructorLabel(i, branches)}</option>
                  ))}
                </DirectorSelect>
              </DirectorField>
              <DirectorField label="Դաս">
                <DirectorInput value={form.hours} onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))} />
              </DirectorField>
              <DirectorField label="Մեկնաբանություն">
                <DirectorTextarea rows={3} value={form.comment} onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))} />
              </DirectorField>
              <DirectorFormActions
                editing={editingId != null}
                createLabel="Գրանցել դասերը"
                onSubmit={() => void submit()}
                onCancel={resetForm}
              />
            </DirectorFormRow>
          </DirectorCard>
          <DirectorDataTable table={table} columns={tableColumns} rowKey={(r) => r.id} />
        </>
      )}
    </DirectorLayout>
  );
}
