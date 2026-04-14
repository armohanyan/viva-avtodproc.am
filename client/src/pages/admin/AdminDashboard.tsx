import AdminLayout from "src/components/AdminLayout";
import AdminTableScroll from "src/components/AdminTableScroll";
import AdminTableRowActions, { AdminTableRowContextMenu } from "src/components/AdminTableRowActions";
import { useLang } from "src/lib/i18n";
import { Card } from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import DataTableToolbar from "src/components/DataTableToolbar";
import CsvExportButton from "src/components/CsvExportButton";
import TableColumnFilter, { TableColumnHeaderWithFilter } from "src/components/TableColumnFilter";
import PanelPageHeader from "src/components/PanelPageHeader";
import { Users, Calendar, TrendingUp, Car, ArrowUpRight, ArrowDownRight, LayoutDashboard } from "lucide-react";
import { useToast } from "src/lib/toast";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatShortDateFromIso } from "src/lib/adminFormat";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";

type BookingAdminRow = {
  id: string;
  studentId: string;
  instructorName: string;
  dateIso: string;
  time: string;
  type: string;
  status: string;
  branchId: string;
};

type StudentMini = { id: string; name: string };
type FinanceTx = { status: string; grossAmd: number; createdAt: string };

type RecentBookingRow = { student: string; instructor: string; date: string; time: string; status: string };

export default function AdminDashboard() {
  const { t, lang } = useLang();
  const { showToast } = useToast();
  const [bookingSearch, setBookingSearch] = useState("");
  const [bookingStatus, setBookingStatus] = useState<string>("all");
  const [recentBookingsData, setRecentBookingsData] = useState<RecentBookingRow[]>([]);
  const [statsValues, setStatsValues] = useState({ users: 0, bookings: 0, revenueMonth: 0, activeInstructors: 0 });

  const loadDashboard = useCallback(async () => {
    try {
      const [students, bookings, instructors, txs] = await Promise.all([
        vivaApiJson<StudentMini[]>("/students"),
        vivaApiJson<BookingAdminRow[]>("/bookings"),
        vivaApiJson<Array<{ status?: string }>>("/instructors"),
        vivaApiJson<FinanceTx[]>("/finance/transactions"),
      ]);
      const byStudent = new Map((Array.isArray(students) ? students : []).map((s) => [s.id, s.name]));
      const rows = (Array.isArray(bookings) ? bookings : []).slice(0, 12).map((b) => ({
        student: byStudent.get(b.studentId) ?? b.studentId,
        instructor: b.instructorName,
        date: formatShortDateFromIso(b.dateIso, lang),
        time: b.time,
        status: b.status,
      }));
      setRecentBookingsData(rows);
      const now = new Date();
      const m0 = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const m1 = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
      const rev = (Array.isArray(txs) ? txs : [])
        .filter((x) => x.status === "completed")
        .filter((x) => {
          const ts = new Date(x.createdAt).getTime();
          return ts >= m0 && ts <= m1;
        })
        .reduce((s, x) => s + (x.grossAmd ?? 0), 0);
      setStatsValues({
        users: Array.isArray(students) ? students.length : 0,
        bookings: Array.isArray(bookings) ? bookings.length : 0,
        revenueMonth: rev,
        activeInstructors: (Array.isArray(instructors) ? instructors : []).filter((i) => i.status !== "inactive").length,
      });
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    }
  }, [lang, showToast]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const filteredRecentBookings = useMemo(() => {
    const q = bookingSearch.trim().toLowerCase();
    return recentBookingsData.filter((b) => {
      const hay = [b.student, b.instructor, b.date, b.time, b.status].join(" ").toLowerCase();
      const matchSearch = !q || hay.includes(q);
      const matchStatus = bookingStatus === "all" || b.status === bookingStatus;
      return matchSearch && matchStatus;
    });
  }, [bookingSearch, bookingStatus, recentBookingsData]);

  const stats = [
    { label: t("totalUsers"), value: String(statsValues.users), change: "—", up: true, icon: Users, color: "text-primary", bg: "bg-primary/10" },
    { label: t("totalBookings"), value: String(statsValues.bookings), change: "—", up: true, icon: Calendar, color: "text-primary", bg: "bg-primary/10" },
    {
      label: t("revenue"),
      value: `${statsValues.revenueMonth.toLocaleString()} ֏`,
      change: "—",
      up: true,
      icon: TrendingUp,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    { label: t("activeInstructors"), value: String(statsValues.activeInstructors), change: "—", up: true, icon: Car, color: "text-primary", bg: "bg-primary/10" },
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
      <Card className="border-border overflow-hidden min-w-0">
        <div className="p-5 border-b border-border flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-semibold text-foreground">{t("adminRecentBookingsTitle")}</h3>
          <a href="/admin/bookings" className="text-sm text-primary hover:underline shrink-0">{t("viewAll")}</a>
        </div>
        <DataTableToolbar value={bookingSearch} onChange={setBookingSearch} placeholder={`${t("search")}…`}>
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
        <AdminTableScroll>
          <table className="w-full text-sm min-w-[40rem]">
            <thead className="bg-muted/40">
              <tr>
                <TableColumnHeaderWithFilter title={t("bookingColStudent")} className="px-5 py-3" />
                <TableColumnHeaderWithFilter title={t("cohortColInstructor")} className="px-5 py-3" />
                <TableColumnHeaderWithFilter title={t("date")} className="px-5 py-3" />
                <TableColumnHeaderWithFilter title={t("bookingColTime")} className="px-5 py-3" />
                <TableColumnHeaderWithFilter
                  title={t("status")}
                  className="px-5 py-3"
                  filter={
                    <TableColumnFilter
                      value={bookingStatus}
                      onChange={setBookingStatus}
                      ariaLabel={t("filterByStatus")}
                      options={[
                        { value: "all", label: t("filterOptionAll") },
                        { value: "confirmed", label: t("confirmed") },
                        { value: "pending", label: t("pending") },
                        { value: "cancelled", label: t("cancelled") },
                      ]}
                    />
                  }
                />
                <TableColumnHeaderWithFilter title={t("actions")} align="end" className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRecentBookings.map((b, i) => (
                <AdminTableRowContextMenu
                  key={i}
                  actions={[
                    {
                      kind: "item",
                      id: "edit",
                      label: t("edit"),
                      onClick: () => showToast(`${t("adminEditBookingToastPrefix")}: ${b.student}`, "info"),
                    },
                    {
                      kind: "item",
                      id: "delete",
                      label: t("delete"),
                      destructive: true,
                      onClick: () => showToast(`${t("adminDeleteBookingToastPrefix")}: ${b.student}`, "info"),
                    },
                  ]}
                >
                  <tr className="hover:bg-muted/30 transition-colors">
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
                      <AdminTableRowActions
                        toolbarOnly
                        presentation="text"
                        actions={[
                          {
                            kind: "item",
                            id: "edit",
                            label: t("edit"),
                            onClick: () => showToast(`${t("adminEditBookingToastPrefix")}: ${b.student}`, "info"),
                          },
                          {
                            kind: "item",
                            id: "delete",
                            label: t("delete"),
                            destructive: true,
                            onClick: () => showToast(`${t("adminDeleteBookingToastPrefix")}: ${b.student}`, "info"),
                          },
                        ]}
                      />
                    </td>
                  </tr>
                </AdminTableRowContextMenu>
              ))}
            </tbody>
          </table>
        </AdminTableScroll>
      </Card>
    </AdminLayout>
  );
}
