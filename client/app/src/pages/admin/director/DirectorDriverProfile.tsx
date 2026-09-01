import DirectorLayout from "src/modules/director/DirectorLayout";
import { useDirectorDateRange, useDirectorReload } from "src/modules/director/components/DirectorDateFilters";
import DirectorSectionNav, { useDirectorSectionView } from "src/modules/director/components/DirectorSectionNav";
import DirectorDataTable from "src/modules/director/components/DirectorDataTable";
import PanelPageHeader from "src/components/PanelPageHeader";
import {
  DirectorButton,
  DirectorCard,
  DirectorField,
  DirectorInput,
  DirectorSelect,
  DirectorStatCard,
  DirectorStatGrid,
} from "src/modules/director/components/DirectorUi";
import { fetchDirectorDriverProfile } from "src/modules/director/director.api";
import type { DirectorDriverProfile } from "src/modules/director/director.types";
import type { Instructor } from "src/data/instructors";
import { useBranches } from "src/modules/branches";
import { useCities } from "src/modules/cities";
import { formatDirectorInstructorLabel } from "src/modules/director/directorInstructorLabels";
import { formatDirectorLessonSlots } from "src/modules/director/directorFormat";
import { formatAmd } from "src/pages/admin/finance/adminFinanceShared";
import { useDirectorTable } from "src/modules/director/useDirectorTable";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { useToast } from "src/lib/toast";
import { useCallback, useEffect, useMemo, useState } from "react";
import { User } from "lucide-react";
import {
  DirectorChartPanel,
  DirectorLineChart,
  DirectorReportGrid,
  DirectorReportSection,
  DirectorTrendChart,
} from "src/modules/director/components/DirectorCharts";

const BASE_PATH = "/admin/director/driver-profile";

const EMPTY: DirectorDriverProfile = {
  instructorName: "",
  summary: { hours: 0, km: 0, liters: 0, amount: 0 },
  rows: [],
};

export default function DirectorDriverProfilePage() {
  const { showToast } = useToast();
  const view = useDirectorSectionView(BASE_PATH);
  const { start, end, setStart, setEnd, query, branchFilterRevision } = useDirectorDateRange();
  const { branches } = useBranches();
  const { cities } = useCities();
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [instructorUserId, setInstructorUserId] = useState("");
  const [data, setData] = useState<DirectorDriverProfile>(EMPTY);

  useEffect(() => {
    void vivaApiJson<Instructor[]>("/instructors")
      .then((d) => {
        const list = Array.isArray(d) ? d : [];
        setInstructors(list);
        if (list[0]) setInstructorUserId(String(list[0].id));
      })
      .catch(() => setInstructors([]));
  }, []);

  const load = useCallback(async () => {
    const id = Number(instructorUserId);
    if (!id) return;
    try {
      const res = await fetchDirectorDriverProfile(query, id);
      setData(res);
    } catch (e) {
      setData(EMPTY);
      showToast(getApiErrorMessage(e), "error");
    }
  }, [query, instructorUserId, showToast]);

  useDirectorReload(load, [query, instructorUserId, branchFilterRevision]);

  const hoursTrend = useMemo(
    () => data.rows.map((r) => ({ label: r.date.slice(5), value: r.hours })),
    [data.rows],
  );
  const kmTrend = useMemo(
    () => data.rows.map((r) => ({ label: r.date.slice(5), value: r.km })),
    [data.rows],
  );
  const fuelTrend = useMemo(
    () => data.rows.map((r) => ({ label: r.date.slice(5), value: r.amount })),
    [data.rows],
  );
  const efficiencySeries = useMemo(
    () => [
      {
        label: "լ/100կմ",
        points: data.rows.map((r) => ({ label: r.date.slice(5), value: r.lPer100 })),
        colorIndex: 3,
      },
      {
        label: "դր/կմ",
        points: data.rows.map((r) => ({ label: r.date.slice(5), value: r.amdPerKm })),
        colorIndex: 4,
      },
    ],
    [data.rows],
  );

  const selectedInstructor = instructors.find((i) => String(i.id) === instructorUserId);
  const instructorTitle =
    data.instructorName ||
    (selectedInstructor ? formatDirectorInstructorLabel(selectedInstructor, branches, cities) : "—");

  const tableColumns = useMemo(
    () => [
      {
        id: "date",
        header: "Ամսաթիվ",
        sortable: true,
        sortValue: (r: (typeof data.rows)[number]) => r.date,
        searchValue: (r: (typeof data.rows)[number]) => r.date,
        render: (r: (typeof data.rows)[number]) => r.date,
      },
      {
        id: "hours",
        header: "Դասեր",
        sortable: true,
        sortValue: (r: (typeof data.rows)[number]) => r.hours,
        render: (r: (typeof data.rows)[number]) => formatDirectorLessonSlots(r.hours),
      },
      {
        id: "km",
        header: "ԿՄ",
        sortable: true,
        sortValue: (r: (typeof data.rows)[number]) => r.km,
        render: (r: (typeof data.rows)[number]) => r.km.toFixed(0),
      },
      {
        id: "gas",
        header: "Գազ",
        sortable: true,
        sortValue: (r: (typeof data.rows)[number]) => r.gasLiters,
        render: (r: (typeof data.rows)[number]) => r.gasLiters.toFixed(1),
      },
      {
        id: "petrol",
        header: "Բենզին",
        sortable: true,
        sortValue: (r: (typeof data.rows)[number]) => r.petrolLiters,
        render: (r: (typeof data.rows)[number]) => r.petrolLiters.toFixed(1),
      },
      {
        id: "liters",
        header: "Լիտր",
        sortable: true,
        sortValue: (r: (typeof data.rows)[number]) => r.totalLiters,
        render: (r: (typeof data.rows)[number]) => r.totalLiters.toFixed(1),
      },
      {
        id: "amount",
        header: "Գումար",
        sortable: true,
        sortValue: (r: (typeof data.rows)[number]) => r.amount,
        render: (r: (typeof data.rows)[number]) => formatAmd(r.amount),
      },
      {
        id: "card",
        header: "Քարտ/POS",
        sortable: true,
        sortValue: (r: (typeof data.rows)[number]) => r.card,
        render: (r: (typeof data.rows)[number]) => formatAmd(r.card),
      },
      {
        id: "cash",
        header: "Կանխիկ",
        sortable: true,
        sortValue: (r: (typeof data.rows)[number]) => r.cash,
        render: (r: (typeof data.rows)[number]) => formatAmd(r.cash),
      },
      {
        id: "lPer100",
        header: "լ/100կմ",
        sortable: true,
        sortValue: (r: (typeof data.rows)[number]) => r.lPer100,
        render: (r: (typeof data.rows)[number]) => r.lPer100.toFixed(1),
      },
      {
        id: "amdPerKm",
        header: "դր/կմ",
        sortable: true,
        sortValue: (r: (typeof data.rows)[number]) => r.amdPerKm,
        render: (r: (typeof data.rows)[number]) => r.amdPerKm.toFixed(0),
      },
      {
        id: "kmPerHour",
        header: "կմ/դաս",
        sortable: true,
        sortValue: (r: (typeof data.rows)[number]) => r.kmPerHour,
        render: (r: (typeof data.rows)[number]) => r.kmPerHour.toFixed(1),
      },
    ],
    [],
  );

  const table = useDirectorTable({ rows: data.rows, columns: tableColumns });

  const filters = (
    <DirectorCard>
      <div className="flex flex-wrap gap-4 items-end mb-5">
        <DirectorField label="Սկիզբ" className="w-auto">
          <DirectorInput type="date" className="w-auto" value={start} onChange={(e) => setStart(e.target.value)} />
        </DirectorField>
        <DirectorField label="Վերջ" className="w-auto">
          <DirectorInput type="date" className="w-auto" value={end} onChange={(e) => setEnd(e.target.value)} />
        </DirectorField>
        <DirectorField label="Հրահանգիչ">
          <DirectorSelect
            value={instructorUserId}
            onChange={(e) => setInstructorUserId(e.target.value)}
            className="min-w-[180px]"
          >
            {instructors.map((i) => (
              <option key={i.id} value={String(i.id)}>{formatDirectorInstructorLabel(i, branches, cities)}</option>
            ))}
          </DirectorSelect>
        </DirectorField>
        <DirectorButton onClick={() => void load()}>Ցույց տալ</DirectorButton>
      </div>

      <DirectorStatGrid>
        <DirectorStatCard label="Դասեր" value={formatDirectorLessonSlots(data.summary.hours)} />
        <DirectorStatCard label="ԿՄ" value={data.summary.km.toFixed(0)} />
        <DirectorStatCard label="Լիտր" value={data.summary.liters.toFixed(1)} />
        <DirectorStatCard label="Գումար" value={formatAmd(data.summary.amount)} />
      </DirectorStatGrid>
    </DirectorCard>
  );

  return (
    <DirectorLayout>
      <PanelPageHeader icon={User} title="Վարորդի պրոֆիլ" />
      {filters}
      <DirectorSectionNav basePath={BASE_PATH} />

      {view === "report" ? (
        <DirectorReportSection title={`${instructorTitle} · հաշվետվություն`}>
          <DirectorReportGrid>
            <DirectorChartPanel title="Դասեր" subtitle="Ըստ օրերի">
              <DirectorTrendChart points={hoursTrend} label="Դաս" />
            </DirectorChartPanel>
            <DirectorChartPanel title="Կիլոմետրեր" subtitle="Ըստ օրերի">
              <DirectorTrendChart points={kmTrend} label="ԿՄ" />
            </DirectorChartPanel>
            <DirectorChartPanel title="Վառելիք (AMD)" subtitle="Ըստ օրերի">
              <DirectorTrendChart points={fuelTrend} label="Գումար" />
            </DirectorChartPanel>
            <DirectorChartPanel title="Արդյունավետություն" subtitle="լ/100կմ և դր/կմ">
              <DirectorLineChart series={efficiencySeries} />
            </DirectorChartPanel>
          </DirectorReportGrid>
        </DirectorReportSection>
      ) : (
        <DirectorDataTable
          table={table}
          columns={tableColumns}
          rowKey={(r) => r.date}
          searchPlaceholder="Որոնել ամսաթվով…"
        />
      )}
    </DirectorLayout>
  );
}
