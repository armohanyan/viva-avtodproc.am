import AdminLayout from "src/components/AdminLayout";
import { useLang } from "src/lib/i18n";
import { Card } from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import DataTableToolbar from "src/components/DataTableToolbar";
import CsvExportButton from "src/components/CsvExportButton";
import PanelPageHeader from "src/components/PanelPageHeader";
import { Users, Calendar, TrendingUp, Car, ArrowUpRight, ArrowDownRight, LayoutDashboard } from "lucide-react";
import { useToast } from "src/lib/toast";
import { useMemo, useState } from "react";

const recentBookingsData = [
  { student: "Ani Karapetyan", instructor: "Armen P.", date: "Mar 28", time: "10:00", status: "confirmed" },
  { student: "Tigran Mkhitaryan", instructor: "Vardan G.", date: "Mar 28", time: "14:00", status: "confirmed" },
  { student: "Nare Harutyunyan", instructor: "Narine H.", date: "Mar 29", time: "09:00", status: "pending" },
  { student: "Suren Danielyan", instructor: "Armen P.", date: "Mar 29", time: "11:00", status: "cancelled" },
  { student: "Mane Poghosyan", instructor: "Vardan G.", date: "Mar 30", time: "16:00", status: "confirmed" },
];

export default function AdminDashboard() {
  const { t } = useLang();
  const { showToast } = useToast();
  const [bookingSearch, setBookingSearch] = useState("");
  const [bookingStatus, setBookingStatus] = useState<string>("all");

  const filteredRecentBookings = useMemo(() => {
    const q = bookingSearch.trim().toLowerCase();
    return recentBookingsData.filter((b) => {
      const hay = [b.student, b.instructor, b.date, b.time, b.status].join(" ").toLowerCase();
      const matchSearch = !q || hay.includes(q);
      const matchStatus = bookingStatus === "all" || b.status === bookingStatus;
      return matchSearch && matchStatus;
    });
  }, [bookingSearch, bookingStatus]);

  const stats = [
    { label: t("totalUsers"), value: "3,245", change: "+12%", up: true, icon: Users, color: "text-primary", bg: "bg-primary/10" },
    { label: t("totalBookings"), value: "186", change: "+8%", up: true, icon: Calendar, color: "text-primary", bg: "bg-primary/10" },
    { label: t("revenue"), value: "4.2M ֏", change: "+18%", up: true, icon: TrendingUp, color: "text-primary", bg: "bg-primary/10" },
    { label: t("activeInstructors"), value: "18", change: "0%", up: true, icon: Car, color: "text-primary", bg: "bg-primary/10" },
  ];

  const statusColor: Record<string, string> = {
    confirmed: "bg-emerald-100 text-emerald-700",
    pending: "bg-amber-100 text-amber-700",
    cancelled: "bg-red-100 text-red-600",
  };

  return (
    <AdminLayout>
      <PanelPageHeader icon={LayoutDashboard} title={t("adminDashboard")} subtitle={t("adminDashboardPageSubtitle")} />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {stats.map((s, i) => (
          <Card key={i} className="p-5 border-border">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                <p className="text-2xl font-bold text-foreground">
                  {s.value}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  {s.up ? (
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />
                  )}
                  <span className={`text-xs font-medium ${s.up ? "text-emerald-600" : "text-red-500"}`}>
                    {s.change} {t("adminStatsChangeThisMonth")}
                  </span>
                </div>
              </div>
              <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center shrink-0`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Recent Bookings Table */}
      <Card className="border-border overflow-hidden">
        <div className="p-5 border-b border-border flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-semibold text-foreground">{t("adminRecentBookingsTitle")}</h3>
          <a href="/admin/bookings" className="text-sm text-primary hover:underline shrink-0">{t("viewAll")}</a>
        </div>
        <DataTableToolbar value={bookingSearch} onChange={setBookingSearch} placeholder={`${t("search")}…`}>
          <div className="flex flex-wrap gap-2">
            {["all", "confirmed", "pending", "cancelled"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setBookingStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize ${
                  bookingStatus === s ? "bg-primary text-primary-foreground border-primary" : "border-input text-muted-foreground hover:border-primary/40"
                }`}
              >
                {s === "all" ? t("filterOptionAll") : t(s as "confirmed" | "pending" | "cancelled")}
              </button>
            ))}
          </div>
          <CsvExportButton
            filename="admin-dashboard-recent-bookings.csv"
            headers={[t("bookingColStudent"), t("cohortColInstructor"), t("date"), t("bookingColTime"), t("status")]}
            rows={filteredRecentBookings.map((b) => [
              b.student,
              b.instructor,
              b.date,
              b.time,
              t(b.status as "confirmed" | "pending" | "cancelled"),
            ])}
          />
        </DataTableToolbar>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                {[t("bookingColStudent"), t("cohortColInstructor"), t("date"), t("bookingColTime"), t("status"), t("actions")].map((h, i) => (
                  <th key={i} className="text-left text-xs font-semibold text-muted-foreground px-5 py-3 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRecentBookings.map((b, i) => (
                <tr key={i} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-foreground">{b.student}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{b.instructor}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{b.date}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{b.time}</td>
                  <td className="px-5 py-3.5">
                    <Badge className={`text-xs ${statusColor[b.status]}`}>
                      {t(b.status as any)}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      type="button"
                      className="text-primary hover:underline text-xs mr-3"
                      onClick={() => showToast(`${t("adminEditBookingToastPrefix")}: ${b.student}`, "info")}
                    >
                      {t("edit")}
                    </button>
                    <button
                      type="button"
                      className="text-red-500 hover:underline text-xs"
                      onClick={() => showToast(`${t("adminDeleteBookingToastPrefix")}: ${b.student}`, "info")}
                    >
                      {t("delete")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </AdminLayout>
  );
}
