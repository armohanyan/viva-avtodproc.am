import AdminLayout from "src/components/AdminLayout";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { Badge } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "src/components/ui/dialog";
import ConfirmDialog from "src/components/ConfirmDialog";
import DataTableToolbar from "src/components/DataTableToolbar";
import { Plus, Edit2, Trash2, Calendar } from "lucide-react";
import { useState } from "react";

type Instructor = { name: string; email: string; phone: string; years: number; students: number; rating: number; status: string; schedule: string; };

const initialInstructors: Instructor[] = [
  { name: "Armen Petrosyan", email: "armen.p@vivadrive.am", phone: "+374 99 111 111", years: 12, students: 340, rating: 4.9, status: "active", schedule: "Mon–Sat" },
  { name: "Narine Hovhannisyan", email: "narine.h@vivadrive.am", phone: "+374 77 222 222", years: 8, students: 210, rating: 4.8, status: "active", schedule: "Mon–Fri" },
  { name: "Vardan Grigoryan", email: "vardan.g@vivadrive.am", phone: "+374 55 333 333", years: 15, students: 420, rating: 5.0, status: "active", schedule: "Tue–Sun" },
  { name: "Lilit Sargsyan", email: "lilit.s@vivadrive.am", phone: "+374 91 444 444", years: 6, students: 175, rating: 4.7, status: "active", schedule: "Mon–Fri" },
  { name: "Hovhannes Mkrtchyan", email: "hov.m@vivadrive.am", phone: "+374 95 555 555", years: 10, students: 290, rating: 4.9, status: "inactive", schedule: "Mon–Sat" },
];

export default function AdminInstructors() {
  const { t } = useLang();
  const { showToast } = useToast();
  const [instructors, setInstructors] = useState(initialInstructors);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [scheduleFilter, setScheduleFilter] = useState("all");
  const [deleteIdx, setDeleteIdx] = useState<number | null>(null);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newIns, setNewIns] = useState({ name: "", email: "", phone: "", years: 1, schedule: "Mon–Fri" });

  const editIns = editIdx !== null ? instructors[editIdx] : null;
  const scheduleOptions = Array.from(new Set(instructors.map((i) => i.schedule)));

  const filteredInstructors = instructors.filter((ins) => {
    const q = search.trim().toLowerCase();
    const hay = [ins.name, ins.email, ins.phone, ins.schedule, ins.status, String(ins.years), String(ins.students), String(ins.rating)]
      .join(" ")
      .toLowerCase();
    const matchesSearch = !q || hay.includes(q);
    const matchesStatus = statusFilter === "all" || ins.status === statusFilter;
    const matchesSchedule = scheduleFilter === "all" || ins.schedule === scheduleFilter;
    return matchesSearch && matchesStatus && matchesSchedule;
  });

  const handleDelete = () => {
    setInstructors(ins => ins.filter((_, i) => i !== deleteIdx));
    showToast(t("instructorDeleted"), "success");
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editIdx === null || !editIns) return;
    setInstructors(ins => ins.map((x, i) => i === editIdx ? editIns : x));
    setEditIdx(null);
    showToast(t("instructorUpdatedToast"), "success");
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIns.name || !newIns.email) { showToast(t("fillRequired"), "error"); return; }
    setInstructors(ins => [...ins, { ...newIns, students: 0, rating: 5.0, status: "active" }]);
    setAddOpen(false);
    setNewIns({ name: "", email: "", phone: "", years: 1, schedule: "Mon–Fri" });
    showToast(t("instructorAddedToast"), "success");
  };

  const updateEdit = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (editIdx === null) return;
    setInstructors(ins => ins.map((x, i) => i === editIdx ? { ...x, [k]: k === "years" ? +e.target.value : e.target.value } : x));
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h2 className="text-2xl font-bold text-foreground">{t("instructors")}</h2>
        <Button onClick={() => setAddOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
          <Plus className="w-4 h-4" />{t("addNew")}
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <DataTableToolbar value={search} onChange={setSearch} placeholder={`${t("search")}…`}>
          <div className="flex flex-wrap gap-2 items-center">
            {["all", "active", "inactive"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s as "all" | "active" | "inactive")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize ${
                  statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "border-input text-muted-foreground hover:border-primary/40"
                }`}
              >
                {s === "all" ? t("filterOptionAll") : t(s as "active" | "inactive")}
              </button>
            ))}
            <select
              value={scheduleFilter}
              onChange={(e) => setScheduleFilter(e.target.value)}
              className="h-9 rounded-lg border border-input bg-background px-3 text-xs text-foreground min-w-[8rem]"
              aria-label={t("filter")}
            >
              <option value="all">{t("filterOptionAll")}</option>
              {scheduleOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </DataTableToolbar>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                {["Instructor", "Phone", "Schedule", "Rating", "Experience", "Students", t("status"), t("actions")].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredInstructors.map((ins) => (
                <tr key={ins.email} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3.5 min-w-[220px]">
                    <p className="font-medium text-foreground">{ins.name}</p>
                    <p className="text-xs text-muted-foreground">{ins.email}</p>
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">{ins.phone}</td>
                  <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">{ins.schedule}</td>
                  <td className="px-4 py-3.5 text-foreground whitespace-nowrap">
                    {ins.rating.toFixed(1)}
                  </td>
                  <td className="px-4 py-3.5 text-foreground whitespace-nowrap">
                    {ins.years} yrs
                  </td>
                  <td className="px-4 py-3.5 text-foreground whitespace-nowrap">
                    {ins.students}
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge className={`text-xs ${ins.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {ins.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setEditIdx(instructors.findIndex((x) => x.email === ins.email))} className="p-1.5 rounded hover:bg-primary/10 text-primary" aria-label={t("edit")}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => showToast(`${ins.name}'s schedule — coming soon.`, "info")} className="p-1.5 rounded hover:bg-primary/10 text-primary" aria-label="Schedule">
                        <Calendar className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDeleteIdx(instructors.findIndex((x) => x.email === ins.email))} className="p-1.5 rounded hover:bg-red-50 text-red-500" aria-label={t("delete")}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
          Showing {filteredInstructors.length} of {instructors.length} instructors
        </div>
      </div>

      {/* Edit */}
      <Dialog open={editIdx !== null} onOpenChange={() => setEditIdx(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Instructor</DialogTitle></DialogHeader>
          {editIns && (
            <form onSubmit={handleEdit} className="space-y-3 mt-2">
              <div><label className="block text-sm font-medium text-muted-foreground mb-1">{t("name")}</label>
                <Input value={editIns.name} onChange={updateEdit("name")} className="h-10" /></div>
              <div><label className="block text-sm font-medium text-muted-foreground mb-1">{t("emailAddress")}</label>
                <Input value={editIns.email} onChange={updateEdit("email")} className="h-10" /></div>
              <div><label className="block text-sm font-medium text-muted-foreground mb-1">{t("phoneNumber")}</label>
                <Input value={editIns.phone} onChange={updateEdit("phone")} className="h-10" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-muted-foreground mb-1">Years Exp.</label>
                  <Input type="number" value={editIns.years} onChange={updateEdit("years")} className="h-10" /></div>
                <div><label className="block text-sm font-medium text-muted-foreground mb-1">Schedule</label>
                  <Input value={editIns.schedule} onChange={updateEdit("schedule")} className="h-10" /></div>
              </div>
              <div><label className="block text-sm font-medium text-muted-foreground mb-1">{t("status")}</label>
                <select value={editIns.status} onChange={updateEdit("status")}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="active">Active</option><option value="inactive">Inactive</option>
                </select></div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setEditIdx(null)}>Cancel</Button>
                <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">Save</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Add */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Instructor</DialogTitle></DialogHeader>
          <form onSubmit={handleAdd} className="space-y-3 mt-2">
            <div><label className="block text-sm font-medium text-muted-foreground mb-1">{t("name")} *</label>
              <Input value={newIns.name} onChange={e => setNewIns({ ...newIns, name: e.target.value })} placeholder="Full name" className="h-10" /></div>
            <div><label className="block text-sm font-medium text-muted-foreground mb-1">{t("emailAddress")} *</label>
              <Input type="email" value={newIns.email} onChange={e => setNewIns({ ...newIns, email: e.target.value })} placeholder="name@vivadrive.am" className="h-10" /></div>
            <div><label className="block text-sm font-medium text-muted-foreground mb-1">{t("phoneNumber")}</label>
              <Input value={newIns.phone} onChange={e => setNewIns({ ...newIns, phone: e.target.value })} placeholder="+374 99 000 000" className="h-10" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium text-muted-foreground mb-1">Years Exp.</label>
                <Input type="number" value={newIns.years} onChange={e => setNewIns({ ...newIns, years: +e.target.value })} className="h-10" /></div>
              <div><label className="block text-sm font-medium text-muted-foreground mb-1">Schedule</label>
                <Input value={newIns.schedule} onChange={e => setNewIns({ ...newIns, schedule: e.target.value })} placeholder="Mon–Fri" className="h-10" /></div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">{t("addNew")}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={deleteIdx !== null} onClose={() => setDeleteIdx(null)} onConfirm={handleDelete}
        title="Remove Instructor" description="Are you sure you want to remove this instructor?" confirmLabel={t("delete")} danger />
    </AdminLayout>
  );
}
