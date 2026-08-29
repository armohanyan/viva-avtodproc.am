import DirectorLayout from "src/modules/director/DirectorLayout";
import PanelPageHeader from "src/components/PanelPageHeader";
import { DirectorStatCard, DirectorStatGrid } from "src/modules/director/components/DirectorUi";
import DirectorDateFilters, {
  useDirectorDateRange,
  useDirectorReload,
} from "src/modules/director/components/DirectorDateFilters";
import { fetchDirectorDashboard } from "src/modules/director/director.api";
import { formatAmd } from "src/pages/admin/finance/adminFinanceShared";
import { useCallback, useState } from "react";
import type { DirectorDashboard } from "src/modules/director/director.types";
import { getApiErrorMessage } from "src/lib/vivaApi";
import { useToast } from "src/lib/toast";
import { Bar } from "react-chartjs-2";
import { LayoutGrid } from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

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

export default function DirectorDashboardPage() {
  const { showToast } = useToast();
  const { start, end, setStart, setEnd, query, branchFilterRevision } = useDirectorDateRange();
  const [data, setData] = useState<DirectorDashboard>(EMPTY);

  const load = useCallback(async () => {
    try {
      const res = await fetchDirectorDashboard(query);
      setData(res);
    } catch (e) {
      setData(EMPTY);
      showToast(getApiErrorMessage(e), "error");
    }
  }, [query, showToast]);

  const reload = useDirectorReload(load, [query, branchFilterRevision]);

  const chartData = {
    labels: ["Քարտ/POS", "Կանխիկ", "Ծախս", "Վառելիք", "Աշխատավարձ"],
    datasets: [
      {
        label: "AMD",
        data: [data.cardPos, data.cash, data.totalExpense, data.fuel, data.salaryTotal],
        backgroundColor: "hsl(var(--primary))",
      },
    ],
  };

  return (
    <DirectorLayout>
      <PanelPageHeader icon={LayoutGrid} title="Գլխավոր վահանակ" />
      <DirectorDateFilters
        start={start}
        end={end}
        onStartChange={setStart}
        onEndChange={setEnd}
        onRefresh={reload}
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
        <DirectorStatCard label="Հրահանգիչների ժամ" value={data.instructorHours.toFixed(1)} />
        <DirectorStatCard label="Հրահանգիչների աշխատավարձ" value={formatAmd(data.instructorSalary)} />
        <DirectorStatCard label="Ինկասացիա" value={formatAmd(data.incashment)} />
        <DirectorStatCard label="Վառելիք լիտր" value={data.fuelLiters.toFixed(1)} />
      </DirectorStatGrid>
      <div className="mt-6 h-64">
        <Bar
          data={chartData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
          }}
        />
      </div>
    </DirectorLayout>
  );
}
