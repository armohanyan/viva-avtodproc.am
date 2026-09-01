import DirectorLayout from "src/modules/director/DirectorLayout";
import PanelPageHeader from "src/components/PanelPageHeader";
import { DirectorStatCard, DirectorStatGrid } from "src/modules/director/components/DirectorUi";
import DirectorDateFilters, {
  useDirectorDateRange,
  useDirectorReload,
} from "src/modules/director/components/DirectorDateFilters";
import {
  DirectorChartPanel,
  DirectorDoughnutChart,
  DirectorLineChart,
  DirectorRankChart,
  DirectorReportGrid,
  DirectorReportSection,
} from "src/modules/director/components/DirectorCharts";
import { fetchDirectorDashboard, fetchDirectorMonthlyReport } from "src/modules/director/director.api";
import { formatAmd } from "src/pages/admin/finance/adminFinanceShared";
import { useCallback, useMemo, useState } from "react";
import type { DirectorDashboard, DirectorMonthlyReport } from "src/modules/director/director.types";
import { getApiErrorMessage } from "src/lib/vivaApi";
import { useToast } from "src/lib/toast";
import { formatDirectorLessonSlots } from "src/modules/director/directorFormat";
import { LayoutGrid } from "lucide-react";

const EMPTY: DirectorDashboard = {
  totalRevenue: 0,
  cardPos: 0,
  cash: 0,
  netProfit: 0,
  totalExpense: 0,
  fuel: 0,
  salaryTotal: 0,
  cashBalance: 0,
  instructorHours: 0,
  instructorSalary: 0,
  incashment: 0,
  fuelLiters: 0,
};

const EMPTY_REPORT: DirectorMonthlyReport = {
  labels: [],
  revenue: [],
  expenses: [],
  fuel: [],
  salary: [],
  netProfit: [],
};

export default function DirectorDashboardPage() {
  const { showToast } = useToast();
  const { start, end, setStart, setEnd, query, branchFilterRevision } = useDirectorDateRange();
  const [data, setData] = useState<DirectorDashboard>(EMPTY);
  const [report, setReport] = useState<DirectorMonthlyReport>(EMPTY_REPORT);

  const load = useCallback(async () => {
    try {
      const [dash, monthly] = await Promise.all([
        fetchDirectorDashboard(query),
        fetchDirectorMonthlyReport(query),
      ]);
      setData(dash);
      setReport(monthly);
    } catch (e) {
      setData(EMPTY);
      setReport(EMPTY_REPORT);
      showToast(getApiErrorMessage(e), "error");
    }
  }, [query, showToast]);

  useDirectorReload(load, [query, branchFilterRevision]);

  const incomeSplit = useMemo(
    () =>
      [
        { label: "Քարտ / POS", value: data.cardPos },
        { label: "Կանխիկ", value: data.cash },
      ].filter((p) => p.value > 0),
    [data.cardPos, data.cash],
  );

  const costBreakdown = useMemo(
    () =>
      [
        { label: "Ծախսեր", value: data.totalExpense },
        { label: "Վառելիք", value: data.fuel },
        { label: "Աշխատավարձ", value: data.salaryTotal },
      ].filter((p) => p.value > 0),
    [data.totalExpense, data.fuel, data.salaryTotal],
  );

  const trendSeries = useMemo(
    () => [
      { label: "Հասույթ", points: report.labels.map((label, i) => ({ label, value: report.revenue[i] ?? 0 })), colorIndex: 0 },
      { label: "Ծախսեր", points: report.labels.map((label, i) => ({ label, value: report.expenses[i] ?? 0 })), colorIndex: 1 },
      { label: "Մաքուր շահույթ", points: report.labels.map((label, i) => ({ label, value: report.netProfit[i] ?? 0 })), colorIndex: 2 },
    ],
    [report],
  );

  const opsSeries = useMemo(
    () => [
      { label: "Վառելիք", points: report.labels.map((label, i) => ({ label, value: report.fuel[i] ?? 0 })), colorIndex: 3 },
      { label: "Աշխատավարձ", points: report.labels.map((label, i) => ({ label, value: report.salary[i] ?? 0 })), colorIndex: 4 },
    ],
    [report],
  );

  return (
    <DirectorLayout>
      <PanelPageHeader icon={LayoutGrid} title="Գլխավոր վահանակ" />
      <DirectorDateFilters
        start={start}
        end={end}
        onStartChange={setStart}
        onEndChange={setEnd}
        onRefresh={() => void load()}
      />
      <DirectorStatGrid>
        <DirectorStatCard label="Ընդհանուր հասույթ" value={formatAmd(data.totalRevenue)} />
        <DirectorStatCard label="Քարտ / POS" value={formatAmd(data.cardPos)} />
        <DirectorStatCard label="Կանխիկ" value={formatAmd(data.cash)} />
        <DirectorStatCard label="Մաքուր շահույթ" value={formatAmd(data.netProfit)} />
        <DirectorStatCard label="Ընդհանուր ծախս" value={formatAmd(data.totalExpense)} />
        <DirectorStatCard label="Վառելիք" value={formatAmd(data.fuel)} />
        <DirectorStatCard label="Աշխատավարձ ընդհանուր" value={formatAmd(data.salaryTotal)} />
        <DirectorStatCard label="Կասսայի մնացորդ" value={formatAmd(data.cashBalance)} />
        <DirectorStatCard label="Հրահանգիչների դաս" value={formatDirectorLessonSlots(data.instructorHours)} />
        <DirectorStatCard label="Հրահանգիչների աշխատավարձ" value={formatAmd(data.instructorSalary)} />
        <DirectorStatCard label="Ինկասացիա" value={formatAmd(data.incashment)} />
        <DirectorStatCard label="Վառելիք լիտր" value={data.fuelLiters.toFixed(1)} />
      </DirectorStatGrid>

      <div className="mt-8">
        <DirectorReportSection title="Ֆինանսական հաշվետվություն">
          <DirectorReportGrid>
            <DirectorChartPanel
              title="Եկամուտ vs Ծախս vs Շահույթ"
              subtitle="Ըստ ամիսների"
              tall
              className="md:col-span-2"
            >
              <DirectorLineChart series={trendSeries} />
            </DirectorChartPanel>
            <DirectorChartPanel title="Վառելիք և աշխատավարձ" subtitle="Ըստ ամիսների">
              <DirectorLineChart series={opsSeries} />
            </DirectorChartPanel>
            <DirectorChartPanel title="Հասույթի բաժանում" subtitle="Քարտ vs կանխիկ">
              <DirectorDoughnutChart points={incomeSplit} />
            </DirectorChartPanel>
            <DirectorChartPanel title="Ծախսերի կառուցվածք" subtitle="Ընտրված ժամանակահատված">
              <DirectorRankChart points={costBreakdown} />
            </DirectorChartPanel>
          </DirectorReportGrid>
        </DirectorReportSection>
      </div>
    </DirectorLayout>
  );
}
