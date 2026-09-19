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
  DirectorMultiBarChart,
  DirectorRankChart,
  DirectorReportGrid,
  DirectorReportSection,
  DirectorChartEmpty,
  DirectorTrendChart,
} from "src/modules/director/components/DirectorCharts";
import { fetchDirectorStudentAnalytics } from "src/modules/director/director.api";
import type { DirectorStudentAnalytics } from "src/modules/director/director.types";
import { getApiErrorMessage } from "src/lib/vivaApi";
import { useToast } from "src/lib/toast";
import { useCallback, useMemo, useState } from "react";
import { GraduationCap } from "lucide-react";
import { topN } from "src/modules/director/directorChartUtils";

const EMPTY: DirectorStudentAnalytics = {
  totalRealStudents: 0,
  registeredStudents: 0,
  newInPeriod: 0,
  monthlyReport: { labels: [], newStudents: [] },
  byBranch: [],
  registrationSplit: [],
};

export default function DirectorStudentsPage() {
  const { showToast } = useToast();
  const { start, end, setStart, setEnd, query, branchFilterRevision } = useDirectorDateRange();
  const [data, setData] = useState<DirectorStudentAnalytics>(EMPTY);

  const load = useCallback(async () => {
    try {
      setData(await fetchDirectorStudentAnalytics(query));
    } catch (e) {
      setData(EMPTY);
      showToast(getApiErrorMessage(e), "error");
    }
  }, [query, showToast]);

  useDirectorReload(load, [query, branchFilterRevision]);

  const registrationRate = useMemo(() => {
    if (data.totalRealStudents <= 0) return "—";
    const pct = Math.round((data.registeredStudents / data.totalRealStudents) * 100);
    return `${pct}%`;
  }, [data.registeredStudents, data.totalRealStudents]);

  const monthlyTrend = useMemo(
    () =>
      data.monthlyReport.labels.map((label, i) => ({
        label,
        value: data.monthlyReport.newStudents[i] ?? 0,
      })),
    [data.monthlyReport],
  );

  const branchTop = useMemo(() => topN(data.byBranch, 8), [data.byBranch]);

  return (
    <DirectorLayout>
      <PanelPageHeader icon={GraduationCap} title="Ուսանողներ" />
      <p className="text-sm text-muted-foreground -mt-2 mb-4 max-w-2xl">
        Հաշվարկում են միայն իրական ուսանողական հաշիվները (առանց գրասենյակային placeholder էլ. փոստի{" "}
        <span className="font-mono text-xs">@no-login.local</span>)։
      </p>
      <DirectorDateFilters
        start={start}
        end={end}
        onStartChange={setStart}
        onEndChange={setEnd}
        onRefresh={() => void load()}
      />
      <DirectorStatGrid>
        <DirectorStatCard label="Ընդամենը ուսանողներ" value={String(data.totalRealStudents)} />
        <DirectorStatCard label="Գրանցված հաշիվներ" value={String(data.registeredStudents)} />
        <DirectorStatCard label="Նոր ընդունումներ (ժամանակահատված)" value={String(data.newInPeriod)} />
        <DirectorStatCard label="Գրանցման մասնակցություն" value={registrationRate} />
      </DirectorStatGrid>

      <DirectorReportSection title="Դինամիկա">
        <DirectorReportGrid>
          <DirectorChartPanel title="Նոր ուսանողներ ըստ ամիսների" subtitle="ըստ ընդունման ամսաթվի" tall>
            <DirectorMultiBarChart
              labels={data.monthlyReport.labels}
              series={[{ label: "Ուսանողներ", data: data.monthlyReport.newStudents, colorIndex: 0 }]}
            />
          </DirectorChartPanel>
          <DirectorChartPanel title="Ընդամենը ըստ ամիսների" subtitle="ամսական միտում" tall>
            <DirectorTrendChart points={monthlyTrend} label="Նոր ուսանողներ" valueFormat="count" />
          </DirectorChartPanel>
        </DirectorReportGrid>
      </DirectorReportSection>

      <DirectorReportSection title="Բաշխում">
        <DirectorReportGrid>
          <DirectorChartPanel title="Գրանցում vs անհրաժեշտ գրանցում">
            {data.registrationSplit.length > 0 ? (
              <DirectorDoughnutChart points={data.registrationSplit} valueFormat="count" />
            ) : (
              <DirectorChartEmpty />
            )}
          </DirectorChartPanel>
          <DirectorChartPanel title="Ուսանողներ ըստ մասնաճյուղի">
            {branchTop.length > 0 ? (
              <DirectorRankChart points={branchTop} label="հաշիվ" valueFormat="count" />
            ) : (
              <DirectorChartEmpty />
            )}
          </DirectorChartPanel>
        </DirectorReportGrid>
      </DirectorReportSection>
    </DirectorLayout>
  );
}
