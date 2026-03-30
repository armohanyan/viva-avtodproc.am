import AdminLayout from "src/components/AdminLayout";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { Card } from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "src/components/ui/dialog";
import ConfirmDialog from "src/components/ConfirmDialog";
import { Plus, Calendar, Users, Video, Edit2, Trash2 } from "lucide-react";
import { useState } from "react";
import { CountUpText, Reveal } from "src/lib/motion";

type Cohort = { id: string; name: string; startDate: string; endDate: string; schedule: string; seats: number; enrolled: number; instructor: string; meetLink: string; status: string; };

const initialCohorts: Cohort[] = [
  { id: "COH-012", name: "Theory Cohort 12", startDate: "Mar 20, 2026", endDate: "Apr 10, 2026", schedule: "Tue & Thu, 18:00–20:00", seats: 12, enrolled: 10, instructor: "Narine H.", meetLink: "https://meet.google.com/abc-def", status: "active" },
  { id: "COH-013", name: "Theory Cohort 13", startDate: "Apr 15, 2026", endDate: "May 5, 2026", schedule: "Mon & Wed, 18:00–20:00", seats: 15, enrolled: 3, instructor: "Vardan G.", meetLink: "https://meet.google.com/xyz-123", status: "upcoming" },
  { id: "COH-011", name: "Theory Cohort 11", startDate: "Feb 1, 2026", endDate: "Feb 21, 2026", schedule: "Mon & Wed, 17:00–19:00", seats: 12, enrolled: 12, instructor: "Narine H.", meetLink: "", status: "completed" },
];

const statusColor: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  upcoming: "bg-blue-100 text-blue-700",
  completed: "bg-slate-100 text-slate-500",
};

export default function AdminCohorts() {
  const { t } = useLang();
  const { showToast } = useToast();
  const [cohorts, setCohorts] = useState(initialCohorts);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editCohort, setEditCohort] = useState<Cohort | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newCohort, setNewCohort] = useState({ name: "", startDate: "", endDate: "", schedule: "", seats: 15, instructor: "", meetLink: "" });

  const handleDelete = () => {
    setCohorts(c => c.filter(x => x.id !== deleteId));
    showToast(t("cohortDeleted"), "success");
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCohort) return;
    setCohorts(c => c.map(x => x.id === editCohort.id ? editCohort : x));
    setEditCohort(null);
    showToast(t("cohortUpdatedToast"), "success");
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCohort.name || !newCohort.startDate) { showToast(t("fillRequired"), "error"); return; }
    const cohort: Cohort = {
      id: `COH-${String(cohorts.length + 14).padStart(3, "0")}`,
      ...newCohort, enrolled: 0, status: "upcoming"
    };
    setCohorts(c => [cohort, ...c]);
    setAddOpen(false);
    showToast(t("cohortCreatedToast"), "success");
  };

  const handleJoinMeeting = (link: string) => {
    window.open(link, "_blank");
    showToast(t("openingMeetingLinkToast"), "info");
  };

  const handleViewStudents = () => showToast(t("studentListComingSoonToast"), "info");

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-900">{t("cohorts")}</h2>
        <Button onClick={() => setAddOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
          <Plus className="w-4 h-4" />{t("addNew")}
        </Button>
      </div>

      <div className="space-y-5">
        {cohorts.map((c, i) => (
          <Reveal key={i} delay={i * 0.06}>
            <Card className="p-6 border-slate-100">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-lg text-slate-900">{c.name}</h3>
                  <span className="text-xs text-slate-400 font-mono">{c.id}</span>
                  <Badge className={`text-xs ${statusColor[c.status]}`}>{c.status}</Badge>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-1"><Calendar className="w-3.5 h-3.5" />Schedule</div>
                  <p className="text-sm font-medium text-slate-900">{c.schedule}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{c.startDate} – {c.endDate}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-1"><Users className="w-3.5 h-3.5" />Enrollment</div>
                  <p className="text-sm font-medium text-slate-900"><CountUpText value={c.enrolled} /> / {c.seats}</p>
                  <div className="mt-1.5 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(c.enrolled / c.seats) * 100}%` }} />
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Instructor</p>
                  <p className="text-sm font-medium text-slate-900">{c.instructor}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">{t("seats")}</p>
                  <p className="text-sm font-medium text-slate-900"><CountUpText value={c.seats - c.enrolled} /> left</p>
                </div>
              </div>
            <div className="flex gap-3 mt-5 pt-4 border-t border-slate-100 flex-wrap">
              {c.meetLink && (
                <Button size="sm" onClick={() => handleJoinMeeting(c.meetLink)} className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5">
                  <Video className="w-3.5 h-3.5" />{t("meetLink")}
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => setEditCohort({ ...c })} className="border-slate-200 gap-1.5">
                <Edit2 className="w-3.5 h-3.5" />{t("edit")}
              </Button>
              <Button size="sm" variant="outline" onClick={handleViewStudents} className="border-slate-200 gap-1.5 text-slate-500">
                <Users className="w-3.5 h-3.5" />View Students
              </Button>
              <Button size="sm" variant="outline" onClick={() => setDeleteId(c.id)} className="border-red-100 text-red-500 hover:bg-red-50 gap-1.5">
                <Trash2 className="w-3.5 h-3.5" />{t("delete")}
              </Button>
            </div>
            </Card>
          </Reveal>
        ))}
      </div>

      {/* Edit */}
      <Dialog open={!!editCohort} onOpenChange={() => setEditCohort(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Cohort</DialogTitle></DialogHeader>
          {editCohort && (
            <form onSubmit={handleEdit} className="space-y-3 mt-2">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">{t("name")}</label>
                <Input value={editCohort.name} onChange={e => setEditCohort({ ...editCohort, name: e.target.value })} className="h-10" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Schedule</label>
                <Input value={editCohort.schedule} onChange={e => setEditCohort({ ...editCohort, schedule: e.target.value })} className="h-10" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Start</label>
                  <Input value={editCohort.startDate} onChange={e => setEditCohort({ ...editCohort, startDate: e.target.value })} className="h-10" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">End</label>
                  <Input value={editCohort.endDate} onChange={e => setEditCohort({ ...editCohort, endDate: e.target.value })} className="h-10" /></div>
              </div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Meet Link</label>
                <Input value={editCohort.meetLink} onChange={e => setEditCohort({ ...editCohort, meetLink: e.target.value })} placeholder="https://meet.google.com/..." className="h-10" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">{t("status")}</label>
                <select value={editCohort.status} onChange={e => setEditCohort({ ...editCohort, status: e.target.value })}
                  className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="upcoming">Upcoming</option><option value="active">Active</option><option value="completed">Completed</option>
                </select></div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setEditCohort(null)}>Cancel</Button>
                <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">Save</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Add */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Cohort</DialogTitle></DialogHeader>
          <form onSubmit={handleAdd} className="space-y-3 mt-2">
            <div><label className="block text-sm font-medium text-slate-700 mb-1">{t("name")} *</label>
              <Input value={newCohort.name} onChange={e => setNewCohort({ ...newCohort, name: e.target.value })} placeholder="Theory Cohort 14" className="h-10" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Instructor</label>
              <Input value={newCohort.instructor} onChange={e => setNewCohort({ ...newCohort, instructor: e.target.value })} placeholder="Instructor" className="h-10" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Start *</label>
                <Input value={newCohort.startDate} onChange={e => setNewCohort({ ...newCohort, startDate: e.target.value })} placeholder="Apr 15, 2026" className="h-10" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">End</label>
                <Input value={newCohort.endDate} onChange={e => setNewCohort({ ...newCohort, endDate: e.target.value })} placeholder="May 5, 2026" className="h-10" /></div>
            </div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Schedule</label>
              <Input value={newCohort.schedule} onChange={e => setNewCohort({ ...newCohort, schedule: e.target.value })} placeholder="Mon & Wed, 18:00–20:00" className="h-10" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Meet Link</label>
              <Input value={newCohort.meetLink} onChange={e => setNewCohort({ ...newCohort, meetLink: e.target.value })} placeholder="https://meet.google.com/..." className="h-10" /></div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">{t("addNew")}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Delete Cohort" description="This will remove the cohort. Enrolled students will be notified." confirmLabel={t("delete")} danger />
    </AdminLayout>
  );
}
