import AdminLayout from "@/components/AdminLayout";
import { useLang } from "@/lib/i18n";
import { useToast } from "@/lib/toast";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Search, Plus, Edit2, Trash2 } from "lucide-react";
import { useState } from "react";

type Booking = { id: string; student: string; instructor: string; date: string; time: string; type: string; status: string; };

const initialBookings: Booking[] = [
  { id: "BK-001", student: "Ani Karapetyan", instructor: "Armen Petrosyan", date: "Mar 28, 2026", time: "10:00", type: "Practical", status: "confirmed" },
  { id: "BK-002", student: "Tigran Mkhitaryan", instructor: "Vardan Grigoryan", date: "Mar 28, 2026", time: "14:00", type: "Practical", status: "confirmed" },
  { id: "BK-003", student: "Nare Harutyunyan", instructor: "Narine Hovhannisyan", date: "Mar 29, 2026", time: "09:00", type: "Theory", status: "pending" },
  { id: "BK-004", student: "Suren Danielyan", instructor: "Armen Petrosyan", date: "Mar 29, 2026", time: "11:00", type: "Practical", status: "cancelled" },
  { id: "BK-005", student: "Mane Poghosyan", instructor: "Vardan Grigoryan", date: "Mar 30, 2026", time: "16:00", type: "Practical", status: "confirmed" },
];

const statusColor: Record<string, string> = {
  confirmed: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  cancelled: "bg-red-100 text-red-600",
};
const typeColor: Record<string, string> = {
  Practical: "bg-blue-100 text-blue-700",
  Theory: "bg-purple-100 text-purple-700",
};

export default function AdminBookings() {
  const { t } = useLang();
  const { showToast } = useToast();
  const [bookings, setBookings] = useState(initialBookings);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editBooking, setEditBooking] = useState<Booking | null>(null);

  const filtered = bookings.filter(b => {
    const matchSearch = b.student.toLowerCase().includes(search.toLowerCase()) || b.instructor.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || b.status === statusFilter;
    return matchSearch && matchStatus;
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
    showToast("Booking updated.", "success");
  };

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-slate-900">{t("bookings")}</h2>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2" onClick={() => showToast("Add booking — coming soon.", "info")}>
          <Plus className="w-4 h-4" />{t("addNew")}
        </Button>
      </div>

      <Card className="border-slate-100">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder={`${t("search")}...`} value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {["all", "confirmed", "pending", "cancelled"].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize ${statusFilter === s ? "bg-blue-600 text-white border-blue-600" : "border-slate-200 text-slate-600 hover:border-blue-300"}`}>
                {s === "all" ? "All" : t(s as any)}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                {["ID", "Student", "Instructor", t("date"), "Time", "Type", t("status"), t("actions")].map((h, i) => (
                  <th key={i} className="text-left text-xs font-semibold text-slate-500 px-4 py-3 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((b, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-4 py-3.5 text-slate-400 text-xs font-mono">{b.id}</td>
                  <td className="px-4 py-3.5 font-medium text-slate-900 whitespace-nowrap">{b.student}</td>
                  <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{b.instructor}</td>
                  <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{b.date}</td>
                  <td className="px-4 py-3.5 text-slate-600">{b.time}</td>
                  <td className="px-4 py-3.5"><Badge className={`text-xs ${typeColor[b.type]}`}>{b.type}</Badge></td>
                  <td className="px-4 py-3.5"><Badge className={`text-xs ${statusColor[b.status]}`}>{t(b.status as any)}</Badge></td>
                  <td className="px-4 py-3.5">
                    <div className="flex gap-2">
                      <button onClick={() => setEditBooking({ ...b })} className="p-1.5 rounded hover:bg-blue-50 text-blue-600"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDeleteId(b.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-500">
          Showing {filtered.length} of {bookings.length} bookings
        </div>
      </Card>

      <Dialog open={!!editBooking} onOpenChange={() => setEditBooking(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Booking</DialogTitle></DialogHeader>
          {editBooking && (
            <form onSubmit={handleEdit} className="space-y-3 mt-2">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Student</label>
                <Input value={editBooking.student} onChange={e => setEditBooking({ ...editBooking, student: e.target.value })} className="h-10" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Instructor</label>
                <Input value={editBooking.instructor} onChange={e => setEditBooking({ ...editBooking, instructor: e.target.value })} className="h-10" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <Input value={editBooking.date} onChange={e => setEditBooking({ ...editBooking, date: e.target.value })} className="h-10" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
                  <Input value={editBooking.time} onChange={e => setEditBooking({ ...editBooking, time: e.target.value })} className="h-10" /></div>
              </div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">{t("status")}</label>
                <select value={editBooking.status} onChange={e => setEditBooking({ ...editBooking, status: e.target.value })}
                  className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="confirmed">Confirmed</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                </select></div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setEditBooking(null)}>Cancel</Button>
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">Save</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Cancel Booking" description="Are you sure you want to cancel this booking?" confirmLabel={t("delete")} danger />
    </AdminLayout>
  );
}
