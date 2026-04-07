import InstructorPanelLayout from "src/components/InstructorPanelLayout";
import { useLang } from "src/lib/i18n";
import { Card } from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import { Input } from "src/components/ui/input";
import DataTableToolbar from "src/components/DataTableToolbar";
import PanelPageHeader from "src/components/PanelPageHeader";
import { Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

type Row = {
  id: string;
  name: string;
  email: string;
  phone: string;
  package: string;
  lessons: string;
  status: string;
  skillRating: number;
  licenseAchieved: boolean;
};

const initialRows: Row[] = [
  { id: "ST-101", name: "Ani Karapetyan", email: "ani@example.com", phone: "+374 99 111 222", package: "Standard", lessons: "4/18", status: "active", skillRating: 2, licenseAchieved: false },
  { id: "ST-102", name: "Suren Danielyan", email: "suren@example.com", phone: "+374 98 777 888", package: "Standard", lessons: "0/18", status: "inactive", skillRating: 1, licenseAchieved: false },
  { id: "ST-103", name: "Mane Poghosyan", email: "mane@example.com", phone: "+374 91 999 000", package: "Basic", lessons: "6/10", status: "completed", skillRating: 0, licenseAchieved: true },
];

const statusColor: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-slate-100 text-slate-500",
  completed: "bg-blue-100 text-blue-700",
};

export default function InstructorStudents() {
  const { t } = useLang();
  const [rows, setRows] = useState(initialRows);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const hay = [r.id, r.name, r.email, r.phone, r.package, r.lessons, r.status, String(r.skillRating), r.licenseAchieved ? t("studentLicenseAchieved") : t("studentLicenseNotYet")].join(" ").toLowerCase();
      return !q || hay.includes(q);
    });
  }, [rows, search, t]);

  const ratingStats = useMemo(
    () =>
      Array.from({ length: 11 }, (_, rating) => {
        const group = rows.filter((r) => r.skillRating === rating);
        const licensed = group.filter((r) => r.licenseAchieved).length;
        return { rating, total: group.length, licensed };
      }),
    [rows],
  );
  const maxRatingGroup = useMemo(
    () => Math.max(...ratingStats.map((s) => s.total), 1),
    [ratingStats],
  );
  const ratingChartData = useMemo(
    () => ({
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
    }),
    [ratingStats, t],
  );

  return (
    <InstructorPanelLayout>
      <PanelPageHeader icon={Users} title={t("instructorMyStudents")} subtitle={t("instructorStudentsPageSubtitle")} />

      <Card className="border-border overflow-hidden">
        <DataTableToolbar value={search} onChange={setSearch} placeholder={`${t("search")}…`} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                {[t("name"), t("accountsColEmail"), t("phoneNumber"), t("packages"), t("purchasesProgress"), t("studentSkillRating"), t("status"), t("studentLicense")].map((h, i) => (
                  <th key={i} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium text-foreground">{r.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.email}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{r.phone}</td>
                  <td className="px-4 py-3">{r.package}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.lessons}</td>
                  <td className="px-4 py-3">
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      className="h-8 w-20"
                      value={r.skillRating}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((x) =>
                            x.id === r.id
                              ? { ...x, skillRating: Math.max(0, Math.min(10, Number(e.target.value) || 0)) }
                              : x,
                          ),
                        )
                      }
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={statusColor[r.status] ?? ""}>
                      {r.status === "completed" ? t("userStatusCompleted") : t(r.status as "active" | "inactive")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() =>
                        setRows((prev) =>
                          prev.map((x) =>
                            x.id === r.id
                              ? {
                                  ...x,
                                  licenseAchieved: !x.licenseAchieved,
                                  status: !x.licenseAchieved ? "completed" : x.status === "completed" ? "active" : x.status,
                                }
                              : x,
                          ),
                        )
                      }
                      className="text-xs px-2.5 py-1.5 rounded-md border border-input hover:bg-accent"
                    >
                      {r.licenseAchieved ? t("studentLicenseAchieved") : t("studentLicenseNotYet")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <p className="p-6 text-sm text-muted-foreground text-center">{t("tableNoMatches")}</p>}
      </Card>
      <Card className="border-border overflow-hidden mt-4">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="font-semibold text-foreground text-sm">{t("studentRatingStatsTitle")}</h3>
        </div>
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[28rem]">
            <thead className="bg-muted/40">
              <tr>
                {[t("studentSkillRating"), t("studentRatingTotal"), t("studentRatingLicensed"), t("studentRatingLicenseRate")].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider whitespace-nowrap">{h}</th>
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
        </div>
      </Card>
    </InstructorPanelLayout>
  );
}
