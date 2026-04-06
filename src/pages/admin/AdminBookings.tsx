import AdminLayout from "src/components/AdminLayout";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { Card } from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import { Input } from "src/components/ui/input";
import { Button } from "src/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "src/components/ui/dialog";
import ConfirmDialog from "src/components/ConfirmDialog";
import DataTableToolbar from "src/components/DataTableToolbar";
import CsvExportButton from "src/components/CsvExportButton";
import PanelPageHeader from "src/components/PanelPageHeader";
import { Plus, Edit2, Trash2, CalendarRange } from "lucide-react";
import { useState } from "react";
import { branchNameById, useBranches } from "src/modules/branches";

type Booking = {
  id: string;
  student: string;
  instructor: string;
  date: string;
  time: string;
  type: "practical" | "theory";
  status: string;
  branchId: string;
};

const initialBookings: Booking[] = [
  { id: "BK-001", student: "Ani Karapetyan", instructor: "Armen Petrosyan", date: "Mar 28, 2026", time: "10:00", type: "practical", status: "confirmed", branchId: "br-garegin-8" },
  { id: "BK-002", student: "Tigran Mkhitaryan", instructor: "Vardan Grigoryan", date: "Mar 28, 2026", time: "14:00", type: "practical", status: "confirmed", branchId: "br-azatamart-75" },
  { id: "BK-003", student: "Nare Harutyunyan", instructor: "Narine Hovhannisyan", date: "Mar 29, 2026", time: "09:00", type: "theory", status: "pending", branchId: "br-masis-125" },
  { id: "BK-004", student: "Suren Danielyan", instructor: "Armen Petrosyan", date: "Mar 29, 2026", time: "11:00", type: "practical", status: "cancelled", branchId: "br-garegin-8" },
  { id: "BK-005", student: "Mane Poghosyan", instructor: "Vardan Grigoryan", date: "Mar 30, 2026", time: "16:00", type: "practical", status: "confirmed", branchId: "br-azatamart-75" },
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

export default function AdminBookings() {
  const { t } = useLang();
  const { showToast } = useToast();
  const { branches } = useBranches();
  const [bookings, setBookings] = useState(initialBookings);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [lessonTypeFilter, setLessonTypeFilter] = useState<"all" | "practical" | "theory">("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editBooking, setEditBooking] = useState<Booking | null>(null);

  const filtered = bookings.filter((b) => {
    const q = search.trim().toLowerCase();
    const branchLabel = branchNameById(branches, b.branchId);
    const hay = [b.id, b.student, b.instructor, b.date, b.time, b.type, b.status, branchLabel].join(" ").toLowerCase();
    const matchSearch = !q || hay.includes(q);
    const matchStatus = statusFilter === "all" || b.status === statusFilter;
    const matchBranch = branchFilter === "all" || b.branchId === branchFilter;
    const matchLessonType = lessonTypeFilter === "all" || b.type === lessonTypeFilter;
    return matchSearch && matchStatus && matchBranch && matchLessonType;
  });

  const handleDelete = () => {
    setBookings(b => b.filter(x => x.id !== deleteId));
    showToast(t("bookingCancelledMsg"), "success");
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBooking) return;
    setBookings(b => b.map(x => x.id === editBooking.id ? editBooking : x));
    setEditBooking(null);
    showToast(t("bookingUpdatedToast"), "success");
  };

  return (
    <AdminLayout>
      <PanelPageHeader
        icon={CalendarRange}
        title={t("bookings")}
        subtitle={t("adminBookingsPageSubtitle")}
        actions={
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2" onClick={() => showToast(t("addBookingComingSoonToast"), "info")}>
            <Plus className="w-4 h-4" />
            {t("addNew")}
          </Button>
        }
      />

      <Card className="border-border overflow-hidden">
        <DataTableToolbar value={search} onChange={setSearch} placeholder={`${t("search")}…`}>
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground min-w-[11rem]"
            aria-label={t("filterByBranch")}
          >
            <option value="all">{t("adminBranchFilterAll")}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <select
            value={lessonTypeFilter}
            onChange={(e) => setLessonTypeFilter(e.target.value as "all" | "practical" | "theory")}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground min-w-[10rem]"
            aria-label={t("filterByType")}
          >
            <option value="all">{t("adminBookingsFilterAllTypes")}</option>
            <option value="practical">{t("lessonTypePractical")}</option>
            <option value="theory">{t("lessonTypeTheory")}</option>
          </select>
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
          <CsvExportButton
            filename="admin-bookings.csv"
            headers={[
              t("tableColId"),
              t("bookingColStudent"),
              t("adminColBranch"),
              t("cohortColInstructor"),
              t("date"),
              t("bookingColTime"),
              t("bookingColType"),
              t("status"),
            ]}
            rows={filtered.map((b) => [
              b.id,
              b.student,
              branchNameById(branches, b.branchId),
              b.instructor,
              b.date,
              b.time,
              t(b.type === "theory" ? "lessonTypeTheory" : "lessonTypePractical"),
              t(b.status as "confirmed" | "pending" | "cancelled"),
            ])}
          />
        </DataTableToolbar>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                {[t("tableColId"), t("bookingColStudent"), t("adminColBranch"), t("cohortColInstructor"), t("date"), t("bookingColTime"), t("bookingColType"), t("status"), t("actions")].map((h, i) => (
                  <th key={i} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((b, i) => (
                <tr key={i} className="hover:bg-muted/30">
                  <td className="px-4 py-3.5 text-muted-foreground text-xs font-mono">{b.id}</td>
                  <td className="px-4 py-3.5 font-medium text-foreground whitespace-nowrap">{b.student}</td>
                  <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap max-w-[10rem] truncate" title={branchNameById(branches, b.branchId)}>
                    {branchNameById(branches, b.branchId)}
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">{b.instructor}</td>
                  <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">{b.date}</td>
                  <td className="px-4 py-3.5 text-muted-foreground">{b.time}</td>
                  <td className="px-4 py-3.5"><Badge className={`text-xs ${typeColor[b.type]}`}>{t(b.type === "theory" ? "lessonTypeTheory" : "lessonTypePractical")}</Badge></td>
                  <td className="px-4 py-3.5"><Badge className={`text-xs ${statusColor[b.status]}`}>{t(b.status as any)}</Badge></td>
                  <td className="px-4 py-3.5">
                    <div className="flex gap-2">
                      <button onClick={() => setEditBooking({ ...b })} className="p-1.5 rounded hover:bg-primary/10 text-primary"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDeleteId(b.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
          {t("panelShowingLabel")} {filtered.length} / {bookings.length} {t("bookings")}
        </div>
      </Card>

      <Dialog open={!!editBooking} onOpenChange={() => setEditBooking(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t("bookingDialogEditTitle")}</DialogTitle></DialogHeader>
          {editBooking && (
            <form onSubmit={handleEdit} className="space-y-3 mt-2">
              <div><label className="block text-sm font-medium text-muted-foreground mb-1">{t("bookingColStudent")}</label>
                <Input value={editBooking.student} onChange={e => setEditBooking({ ...editBooking, student: e.target.value })} className="h-10" /></div>
              <div><label className="block text-sm font-medium text-muted-foreground mb-1">{t("adminSelectBranch")}</label>
                <select value={editBooking.branchId} onChange={e => setEditBooking({ ...editBooking, branchId: e.target.value })}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  {branches.map((br) => (
                    <option key={br.id} value={br.id}>{br.name}</option>
                  ))}
                </select></div>
              <div><label className="block text-sm font-medium text-muted-foreground mb-1">{t("cohortColInstructor")}</label>
                <Input value={editBooking.instructor} onChange={e => setEditBooking({ ...editBooking, instructor: e.target.value })} className="h-10" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-muted-foreground mb-1">{t("date")}</label>
                  <Input value={editBooking.date} onChange={e => setEditBooking({ ...editBooking, date: e.target.value })} className="h-10" /></div>
                <div><label className="block text-sm font-medium text-muted-foreground mb-1">{t("bookingColTime")}</label>
                  <Input value={editBooking.time} onChange={e => setEditBooking({ ...editBooking, time: e.target.value })} className="h-10" /></div>
              </div>
              <div><label className="block text-sm font-medium text-muted-foreground mb-1">{t("status")}</label>
                <select value={editBooking.status} onChange={e => setEditBooking({ ...editBooking, status: e.target.value })}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="confirmed">{t("confirmed")}</option>
                  <option value="pending">{t("pending")}</option>
                  <option value="cancelled">{t("cancelled")}</option>
                </select></div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setEditBooking(null)}>{t("cancel")}</Button>
                <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">{t("save")}</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title={t("bookingCancelTitle")} description={t("bookingCancelDesc")} confirmLabel={t("delete")} danger />
    </AdminLayout>
  );
}
