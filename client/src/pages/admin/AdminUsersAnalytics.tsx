import AdminLayout from "src/components/AdminLayout";
import AdminTableScroll from "src/components/AdminTableScroll";
import PanelPageHeader from "src/components/PanelPageHeader";
import { Card } from "src/components/ui/card";
import { GraduationCap } from "lucide-react";
import { useLang } from "src/lib/i18n";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

type StudentOutcome = {
  id: string;
  skillRating: number;
  licenseAchieved: boolean;
};

const outcomes: StudentOutcome[] = [
  { id: "USR-001", skillRating: 2, licenseAchieved: false },
  { id: "USR-002", skillRating: 0, licenseAchieved: true },
  { id: "USR-003", skillRating: 4, licenseAchieved: false },
  { id: "USR-004", skillRating: 1, licenseAchieved: false },
  { id: "USR-005", skillRating: 3, licenseAchieved: false },
  { id: "USR-006", skillRating: 6, licenseAchieved: false },
];

export default function AdminUsersAnalytics() {
  const { t } = useLang();
  const ratingStats = Array.from({ length: 11 }, (_, rating) => {
    const group = outcomes.filter((u) => u.skillRating === rating);
    const licensed = group.filter((u) => u.licenseAchieved).length;
    return { rating, total: group.length, licensed };
  });
  const maxRatingGroup = Math.max(...ratingStats.map((s) => s.total), 1);
  const ratingChartData = {
    labels: ratingStats.map((s) => `${s.rating}`),
    datasets: [
      {
        label: t("studentRatingTotal"),
        data: ratingStats.map((s) => s.total),
        backgroundColor: "rgba(59, 130, 246, 0.30)",
        borderColor: "rgba(59, 130, 246, 0.8)",
        borderWidth: 1,
      },
      {
        label: t("studentRatingLicensed"),
        data: ratingStats.map((s) => s.licensed),
        backgroundColor: "rgba(16, 185, 129, 0.35)",
        borderColor: "rgba(16, 185, 129, 0.9)",
        borderWidth: 1,
      },
    ],
  };

  return (
    <AdminLayout>
      <PanelPageHeader
        icon={GraduationCap}
        title={t("adminStudentsAnalytics")}
        subtitle={t("studentRatingStatsSubtitle")}
      />

      <Card className="border-border overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border/70">
          <Bar
            data={ratingChartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { position: "top" } },
              scales: {
                x: { title: { display: true, text: "Rating (0-10)" } },
                y: { beginAtZero: true, suggestedMax: maxRatingGroup, ticks: { precision: 0 } },
              },
            }}
            height={220}
          />
        </div>
        <AdminTableScroll>
          <table className="w-full text-sm min-w-[34rem]">
            <thead className="bg-muted/40">
              <tr>
                {[t("studentSkillRating"), t("studentRatingTotal"), t("studentRatingLicensed"), t("studentRatingLicenseRate")].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ratingStats.map((s) => (
                <tr key={s.rating} className="hover:bg-muted/20">
                  <td className="px-4 py-2.5 font-medium">{s.rating}/10</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{s.total}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{s.licensed}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {s.total > 0 ? `${Math.round((s.licensed / s.total) * 100)}%` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminTableScroll>
      </Card>
    </AdminLayout>
  );
}
