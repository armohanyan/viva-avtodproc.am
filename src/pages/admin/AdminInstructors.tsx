import AdminLayout from "src/components/AdminLayout";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { Card } from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "src/components/ui/dialog";
import ConfirmDialog from "src/components/ConfirmDialog";
import { Plus, Star, Clock, Edit2, Trash2, Calendar } from "lucide-react";
import { useState } from "react";

type Instructor = { name: string; email: string; phone: string; years: number; students: number; rating: number; status: string; schedule: string; };

const initialInstructors: Instructor[] = [
  { name: "Armen Petrosyan", email: "armen.p@vivadrive.am", phone: "+374 99 111 111", years: 12, students: 340, rating: 4.9, status: "active", schedule: "Mon–Sat" },
  { name: "Narine Hovhannisyan", email: "narine.h@vivadrive.am", phone: "+374 77 222 222", years: 8, students: 210, rating: 4.8, status: "active", schedule: "Mon–Fri" },
  { name: "Vardan Grigoryan", email: "vardan.g@vivadrive.am", phone: "+374 55 333 333", years: 15, students: 420, rating: 5.0, status: "active", schedule: "Tue–Sun" },
  { name: "Lilit Sargsyan", email: "lilit.s@vivadrive.am", phone: "+374 91 444 444", years: 6, students: 175, rating: 4.7, status: "active", schedule: "Mon–Fri" },
  { name: "Hovhannes Mkrtchyan", email: "hov.m@vivadrive.am", phone: "+374 95 555 555", years: 10, students: 290, rating: 4.9, status: "inactive", schedule: "Mon–Sat" },
];

const colors = ["bg-blue-500", "bg-purple-500", "bg-emerald-500", "bg-pink-500", "bg-amber-500"];

export default function AdminInstructors() {
  const { t } = useLang();
  const { showToast } = useToast();
  const [instructors, setInstructors] = useState(initialInstructors);
  const [deleteIdx, setDeleteIdx] = useState<number | null>(null);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newIns, setNewIns] = useState({ name: "", email: "", phone: "", years: 1, schedule: "Mon–Fri" });

  const editIns = editIdx !== null ? instructors[editIdx] : null;

  const handleDelete = () => {
    setInstructors(ins => ins.filter((_, i) => i !== deleteIdx));
    showToast(t("instructorDeleted"), "success");
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editIdx === null || !editIns) return;
    setInstructors(ins => ins.map((x, i) => i === editIdx ? editIns : x));
    setEditIdx(null);
    showToast("Instructor updated.", "success");
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIns.name || !newIns.email) { showToast(t("fillRequired"), "error"); return; }
    setInstructors(ins => [...ins, { ...newIns, students: 0, rating: 5.0, status: "active" }]);
    setAddOpen(false);
    setNewIns({ name: "", email: "", phone: "", years: 1, schedule: "Mon–Fri" });
    showToast("Instructor added!", "success");
  };

  const updateEdit = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (editIdx === null) return;
    setInstructors(ins => ins.map((x, i) => i === editIdx ? { ...x, [k]: k === "years" ? +e.target.value : e.target.value } : x));
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-900">{t("instructors")}</h2>
        <Button onClick={() => setAddOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
          <Plus className="w-4 h-4" />{t("addNew")}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {instructors.map((ins, i) => (
          <Card key={i} className="p-6 border-slate-100 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 ${colors[i % colors.length]} rounded-xl flex items-center justify-center text-white font-bold text-lg`}>
                  {ins.name.split(" ").map(n => n[0]).join("")}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{ins.name}</h3>
                  <p className="text-xs text-slate-500">{ins.email}</p>
                </div>
              </div>
              <Badge className={`text-xs ${ins.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                {ins.status}
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center bg-slate-50 rounded-lg p-2">
                <div className="flex items-center justify-center gap-0.5">
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span className="text-sm font-bold text-slate-900">{ins.rating}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">Rating</p>
              </div>
              <div className="text-center bg-slate-50 rounded-lg p-2">
                <span className="text-sm font-bold text-slate-900">{ins.years}</span>
                <p className="text-xs text-slate-400 mt-0.5">Years</p>
              </div>
              <div className="text-center bg-slate-50 rounded-lg p-2">
                <span className="text-sm font-bold text-slate-900">{ins.students}</span>
                <p className="text-xs text-slate-400 mt-0.5">Students</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-4">
              <Clock className="w-3.5 h-3.5" />{ins.schedule} · {ins.phone}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditIdx(i)} className="flex-1 border-slate-200 gap-1.5 text-xs">
                <Edit2 className="w-3.5 h-3.5" />{t("edit")}
              </Button>
              <Button size="sm" onClick={() => showToast(`${ins.name}'s schedule — coming soon.`, "info")} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5">
                <Calendar className="w-3.5 h-3.5" />Schedule
              </Button>
              <Button size="sm" variant="outline" onClick={() => setDeleteIdx(i)} className="border-red-100 text-red-500 hover:bg-red-50 px-2">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Edit */}
      <Dialog open={editIdx !== null} onOpenChange={() => setEditIdx(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Instructor</DialogTitle></DialogHeader>
          {editIns && (
            <form onSubmit={handleEdit} className="space-y-3 mt-2">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">{t("name")}</label>
                <Input value={editIns.name} onChange={updateEdit("name")} className="h-10" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">{t("emailAddress")}</label>
                <Input value={editIns.email} onChange={updateEdit("email")} className="h-10" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">{t("phoneNumber")}</label>
                <Input value={editIns.phone} onChange={updateEdit("phone")} className="h-10" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Years Exp.</label>
                  <Input type="number" value={editIns.years} onChange={updateEdit("years")} className="h-10" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Schedule</label>
                  <Input value={editIns.schedule} onChange={updateEdit("schedule")} className="h-10" /></div>
              </div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">{t("status")}</label>
                <select value={editIns.status} onChange={updateEdit("status")}
                  className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="active">Active</option><option value="inactive">Inactive</option>
                </select></div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setEditIdx(null)}>Cancel</Button>
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">Save</Button>
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
            <div><label className="block text-sm font-medium text-slate-700 mb-1">{t("name")} *</label>
              <Input value={newIns.name} onChange={e => setNewIns({ ...newIns, name: e.target.value })} placeholder="Full name" className="h-10" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">{t("emailAddress")} *</label>
              <Input type="email" value={newIns.email} onChange={e => setNewIns({ ...newIns, email: e.target.value })} placeholder="name@vivadrive.am" className="h-10" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">{t("phoneNumber")}</label>
              <Input value={newIns.phone} onChange={e => setNewIns({ ...newIns, phone: e.target.value })} placeholder="+374 99 000 000" className="h-10" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Years Exp.</label>
                <Input type="number" value={newIns.years} onChange={e => setNewIns({ ...newIns, years: +e.target.value })} className="h-10" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Schedule</label>
                <Input value={newIns.schedule} onChange={e => setNewIns({ ...newIns, schedule: e.target.value })} placeholder="Mon–Fri" className="h-10" /></div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">{t("addNew")}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={deleteIdx !== null} onClose={() => setDeleteIdx(null)} onConfirm={handleDelete}
        title="Remove Instructor" description="Are you sure you want to remove this instructor?" confirmLabel={t("delete")} danger />
    </AdminLayout>
  );
}
