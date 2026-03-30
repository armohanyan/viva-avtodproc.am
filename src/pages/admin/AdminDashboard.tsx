import AdminLayout from "src/components/AdminLayout";
import { useLang } from "src/lib/i18n";
import { Card } from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import { Users, Calendar, TrendingUp, Car, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { CountUpText } from "src/lib/motion";
import { useToast } from "src/lib/toast";

const recentBookings = [
  { student: "Ani Karapetyan", instructor: "Armen P.", date: "Mar 28", time: "10:00", status: "confirmed" },
  { student: "Tigran Mkhitaryan", instructor: "Vardan G.", date: "Mar 28", time: "14:00", status: "confirmed" },
  { student: "Nare Harutyunyan", instructor: "Narine H.", date: "Mar 29", time: "09:00", status: "pending" },
  { student: "Suren Danielyan", instructor: "Armen P.", date: "Mar 29", time: "11:00", status: "cancelled" },
  { student: "Mane Poghosyan", instructor: "Vardan G.", date: "Mar 30", time: "16:00", status: "confirmed" },
];

export default function AdminDashboard() {
  const { t } = useLang();
  const { showToast } = useToast();

  const stats = [
    { label: t("totalUsers"), value: "3,245", change: "+12%", up: true, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { label: t("totalBookings"), value: "186", change: "+8%", up: true, icon: Calendar, color: "text-purple-600", bg: "bg-purple-50" },
    { label: t("revenue"), value: "4.2M ֏", change: "+18%", up: true, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: t("activeInstructors"), value: "18", change: "0%", up: true, icon: Car, color: "text-amber-600", bg: "bg-amber-50" },
  ];

  const statusColor: Record<string, string> = {
    confirmed: "bg-emerald-100 text-emerald-700",
    pending: "bg-amber-100 text-amber-700",
    cancelled: "bg-red-100 text-red-600",
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">{t("adminDashboard")}</h2>
        <p className="text-slate-500 text-sm mt-1">{t("adminWelcomeBack")}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {stats.map((s, i) => (
          <Card key={i} className="p-5 border-slate-100">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-500 mb-1">{s.label}</p>
                <p className="text-2xl font-bold text-slate-900">
                  <CountUpText value={s.value} />
                </p>
                <div className="flex items-center gap-1 mt-1">
                  {s.up ? (
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />
                  )}
                  <span className={`text-xs font-medium ${s.up ? "text-emerald-600" : "text-red-500"}`}>
                    {s.change} this month
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
      <Card className="border-slate-100">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Recent Bookings</h3>
          <a href="/admin/bookings" className="text-sm text-blue-600 hover:underline">{t("viewAll")}</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                {["Student", "Instructor", t("date"), "Time", t("status"), t("actions")].map((h, i) => (
                  <th key={i} className="text-left text-xs font-semibold text-slate-500 px-5 py-3 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {recentBookings.map((b, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-slate-900">{b.student}</td>
                  <td className="px-5 py-3.5 text-slate-600">{b.instructor}</td>
                  <td className="px-5 py-3.5 text-slate-600">{b.date}</td>
                  <td className="px-5 py-3.5 text-slate-600">{b.time}</td>
                  <td className="px-5 py-3.5">
                    <Badge className={`text-xs ${statusColor[b.status]}`}>
                      {t(b.status as any)}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      type="button"
                      className="text-blue-600 hover:underline text-xs mr-3"
                      onClick={() => showToast(`Edit booking for ${b.student}`, "info")}
                    >
                      {t("edit")}
                    </button>
                    <button
                      type="button"
                      className="text-red-500 hover:underline text-xs"
                      onClick={() => showToast(`Delete booking for ${b.student}`, "info")}
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
