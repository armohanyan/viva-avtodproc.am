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
} from "src/modules/director/components/DirectorUi";
import {
  createDirectorKm,
  deleteDirectorKm,
  fetchDirectorKm,
  updateDirectorKm,
} from "src/modules/director/director.api";
import { isLegacyDirectorRecord, todayIso } from "src/modules/director/director.consts";
import type { DirectorKm } from "src/modules/director/director.types";
import type { Instructor } from "src/data/instructors";
import { useBranches } from "src/modules/branches";
import {
  directorInstructorLabelById,
  formatDirectorInstructorLabel,
} from "src/modules/director/directorInstructorLabels";
import {
  directorDate,
  directorDecimal,
  directorOptionalId,
} from "src/modules/director/directorFormValues";
import { useDirectorTable } from "src/modules/director/useDirectorTable";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { useToast } from "src/lib/toast";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Gauge } from "lucide-react";
import {
  DirectorChartPanel,
  DirectorRankChart,
  DirectorReportGrid,
  DirectorReportSection,
  DirectorTrendChart,
} from "src/modules/director/components/DirectorCharts";
import { sumBy, sumByMonth, topN } from "src/modules/director/directorChartUtils";

const BASE_PATH = "/admin/director/km";

export default function DirectorKmPage() {
  const { showToast } = useToast();
  const view = useDirectorSectionView(BASE_PATH);
  const { start, end, setStart, setEnd, query, branchFilterRevision } = useDirectorDateRange();
  const [rows, setRows] = useState<DirectorKm[]>([]);
  const { branches } = useBranches();
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    date: todayIso(),
    instructorUserId: "",
    km: "",
  });

  useEffect(() => {
    void vivaApiJson<Instructor[]>("/instructors").then((d) => setInstructors(Array.isArray(d) ? d : [])).catch(() => setInstructors([]));
  }, []);

  const load = useCallback(async () => {
    try {
      const km = await fetchDirectorKm(query);
      setRows(Array.isArray(km) ? km : []);
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
    setForm({ date: todayIso(), instructorUserId: "", km: "" });
  };

  const submit = async () => {
    try {
      const body = {
        date: directorDate(form.date),
        instructorUserId: directorOptionalId(form.instructorUserId),
        km: directorDecimal(form.km),
        comment: null,
      };
      if (editingId != null) {
        await updateDirectorKm(editingId, body);
        showToast("Թարմացված է", "success");
      } else {
        await createDirectorKm(body);
        showToast("Գրանցված է", "success");
      }
      resetForm();
      reload();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    }
  };

  const startEdit = (row: DirectorKm) => {
    setEditingId(row.id);
    setForm({
      date: row.date,
      instructorUserId: row.instructorUserId != null ? String(row.instructorUserId) : "",
      km: String(row.km),
    });
  };

  const kmByMonth = useMemo(() => sumByMonth(rows, (r) => r.date, (r) => r.km), [rows]);
  const kmByInstructor = useMemo(
    () => topN(sumBy(rows, (r) => instructorName(r.instructorUserId), (r) => r.km), 8),
    [rows, instructors, branches],
  );
  const totalKm = useMemo(() => rows.reduce((s, r) => s + r.km, 0), [rows]);

  const tableColumns = useMemo(
    () => [
      {
        id: "date",
        header: "Ամսաթիվ",
        sortable: true,
        sortValue: (r: DirectorKm) => r.date,
        searchValue: (r: DirectorKm) => r.date,
        render: (r: DirectorKm) => r.date,
      },
      {
        id: "instructor",
        header: "Հրահանգիչ",
        sortable: true,
        filterable: true,
        sortValue: (r: DirectorKm) => instructorName(r.instructorUserId),
        filterValue: (r: DirectorKm) => instructorName(r.instructorUserId),
        searchValue: (r: DirectorKm) => instructorName(r.instructorUserId),
        render: (r: DirectorKm) => instructorName(r.instructorUserId),
      },
      {
        id: "km",
        header: "ԿՄ",
        sortable: true,
        sortValue: (r: DirectorKm) => r.km,
        searchValue: (r: DirectorKm) => String(r.km),
        render: (r: DirectorKm) => Math.round(r.km).toLocaleString("hy-AM"),
      },
      {
        id: "actions",
        header: "",
        align: "end" as const,
        render: (r: DirectorKm) => (
          <DirectorRecordActions
            readOnly={isLegacyDirectorRecord(r.id)}
            onEdit={() => startEdit(r)}
            onDelete={() => void deleteDirectorKm(r.id).then(reload)}
          />
        ),
      },
    ],
    [instructors, branches, reload],
  );

  const table = useDirectorTable({ rows, columns: tableColumns });

  return (
    <DirectorLayout>
      <PanelPageHeader icon={Gauge} title="Կիլոմետրեր" />
      <DirectorDateFilters start={start} end={end} onStartChange={setStart} onEndChange={setEnd} onRefresh={reload} />
      <DirectorSectionNav basePath={BASE_PATH} />

      {view === "report" ? (
        <DirectorReportSection title={`Հաշվետվություն · ${totalKm.toFixed(0)} կմ`}>
          <DirectorStatGrid>
            <DirectorStatCard label="Կիլոմետր" value={totalKm.toFixed(0)} />
            <DirectorStatCard label="Գրառումներ" value={rows.length} />
            <DirectorStatCard label="Հրահանգիչներ" value={new Set(rows.map((r) => r.instructorUserId).filter(Boolean)).size} />
          </DirectorStatGrid>
          <DirectorReportGrid className="mt-4">
            <DirectorChartPanel title="Կիլոմետրեր ըստ ամիսների">
              <DirectorTrendChart points={kmByMonth} label="ԿՄ" />
            </DirectorChartPanel>
            <DirectorChartPanel title="Հրահանգիչներ Top 8">
              <DirectorRankChart points={kmByInstructor} label="ԿՄ" />
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
              <DirectorField label="ԿՄ">
                <DirectorInput value={form.km} onChange={(e) => setForm((f) => ({ ...f, km: e.target.value }))} />
              </DirectorField>
              <DirectorFormActions
                editing={editingId != null}
                createLabel="Գրանցել ԿՄ"
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
