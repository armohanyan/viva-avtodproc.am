import InstructorPanelLayout from "src/components/InstructorPanelLayout";
import { useLang } from "src/lib/i18n";
import { Card } from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import DataTableToolbar from "src/components/DataTableToolbar";
import PanelPageHeader from "src/components/PanelPageHeader";
import { CalendarClock } from "lucide-react";
import { useMemo, useState } from "react";

type Booking = { id: string; student: string; date: string; time: string; type: "practical" | "theory"; status: string };

const initialBookings: Booking[] = [
  { id: "BK-101", student: "Ani Karapetyan", date: "Apr 4, 2026", time: "10:00", type: "practical", status: "confirmed" },
  { id: "BK-102", student: "Tigran Mkhitaryan", date: "Apr 5, 2026", time: "14:00", type: "theory", status: "confirmed" },
  { id: "BK-103", student: "Nare Harutyunyan", date: "Apr 6, 2026", time: "09:00", type: "practical", status: "pending" },
];

const statusColor: Record<string, string> = {
  confirmed: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  cancelled: "bg-red-100 text-red-600",
};
const typeColor: Record<string, string> = {
  practical: "bg-blue-100 text-blue-700",
  theory: "bg-purple-100 text-purple-700",
};

export default function InstructorBookings() {
  const { t } = useLang();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return initialBookings.filter((b) => {
      const hay = [b.id, b.student, b.date, b.time, b.type, b.status].join(" ").toLowerCase();
      const matchSearch = !q || hay.includes(q);
      const matchStatus = statusFilter === "all" || b.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [search, statusFilter]);

  return (
    <InstructorPanelLayout>
      <PanelPageHeader icon={CalendarClock} title={t("bookings")} subtitle={t("instructorBookingsPageSubtitle")} />

      <Card className="border-border overflow-hidden">
        <DataTableToolbar value={search} onChange={setSearch} placeholder={`${t("search")}…`}>
          <div className="flex gap-2 flex-wrap">
            {["all", "confirmed", "pending", "cancelled"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize ${
                  statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "border-input text-muted-foreground hover:border-primary/40"
                }`}
              >
                {s === "all" ? t("filterOptionAll") : t(s as "confirmed" | "pending" | "cancelled")}
              </button>
            ))}
          </div>
        </DataTableToolbar>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                {[t("tableColId"), t("name"), t("date"), t("bookingTimeLabel"), t("filterByType"), t("status")].map((h, i) => (
                  <th key={i} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((b) => (
                <tr key={b.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{b.id}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{b.student}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{b.date}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{b.time}</td>
                  <td className="px-4 py-3">
                    <Badge className={typeColor[b.type] ?? ""}>{t(b.type === "theory" ? "lessonTypeTheory" : "lessonTypePractical")}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={statusColor[b.status] ?? ""}>{t(b.status as "confirmed" | "pending" | "cancelled")}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <p className="p-6 text-sm text-muted-foreground text-center">{t("tableNoMatches")}</p>}
      </Card>
    </InstructorPanelLayout>
  );
}
