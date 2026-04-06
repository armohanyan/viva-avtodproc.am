import AdminLayout from "src/components/AdminLayout";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { Badge } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "src/components/ui/dialog";
import ConfirmDialog from "src/components/ConfirmDialog";
import DataTableToolbar from "src/components/DataTableToolbar";
import CsvExportButton from "src/components/CsvExportButton";
import PanelPageHeader from "src/components/PanelPageHeader";
import { Plus, Users, UsersRound, Video, Edit2, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { branchNameById, DEFAULT_PRIMARY_BRANCH_ID, useBranches } from "src/modules/branches";

type Cohort = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  schedule: string;
  seats: number;
  enrolled: number;
  instructor: string;
  meetLink: string;
  status: string;
  branchId: string;
};

const initialCohorts: Cohort[] = [
  { id: "COH-012", name: "Theory Cohort 12", startDate: "Mar 20, 2026", endDate: "Apr 10, 2026", schedule: "Tue & Thu, 18:00–20:00", seats: 12, enrolled: 10, instructor: "Narine H.", meetLink: "https://meet.google.com/abc-def", status: "active", branchId: "br-garegin-8" },
  { id: "COH-013", name: "Theory Cohort 13", startDate: "Apr 15, 2026", endDate: "May 5, 2026", schedule: "Mon & Wed, 18:00–20:00", seats: 15, enrolled: 3, instructor: "Vardan G.", meetLink: "https://meet.google.com/xyz-123", status: "upcoming", branchId: "br-azatamart-75" },
  { id: "COH-011", name: "Theory Cohort 11", startDate: "Feb 1, 2026", endDate: "Feb 21, 2026", schedule: "Mon & Wed, 17:00–19:00", seats: 12, enrolled: 12, instructor: "Narine H.", meetLink: "", status: "completed", branchId: "br-masis-125" },
];

const statusColor: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  upcoming: "bg-blue-100 text-blue-700",
  completed: "bg-slate-100 text-slate-500",
};

export default function AdminCohorts() {
  const { t } = useLang();
  const { showToast } = useToast();
  const { branches } = useBranches();
  const [cohorts, setCohorts] = useState(initialCohorts);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editCohort, setEditCohort] = useState<Cohort | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newCohort, setNewCohort] = useState({
    name: "",
    startDate: "",
    endDate: "",
    schedule: "",
    seats: 15,
    instructor: "",
    meetLink: "",
    branchId: DEFAULT_PRIMARY_BRANCH_ID,
  });

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
      ...newCohort,
      branchId: newCohort.branchId || DEFAULT_PRIMARY_BRANCH_ID,
      enrolled: 0,
      status: "upcoming",
    };
    setCohorts(c => [cohort, ...c]);
    setAddOpen(false);
    setNewCohort({
      name: "",
      startDate: "",
      endDate: "",
      schedule: "",
      seats: 15,
      instructor: "",
      meetLink: "",
      branchId: branches[0]?.id ?? DEFAULT_PRIMARY_BRANCH_ID,
    });
    showToast(t("cohortCreatedToast"), "success");
  };

  const handleJoinMeeting = (link: string) => {
    window.open(link, "_blank");
    showToast(t("openingMeetingLinkToast"), "info");
  };

  const handleViewStudents = () => showToast(t("studentListComingSoonToast"), "info");

  const filteredCohorts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cohorts.filter((c) => {
      const branchLabel = branchNameById(branches, c.branchId);
      const hay = [c.id, c.name, c.instructor, c.schedule, c.startDate, c.endDate, c.status, c.meetLink, branchLabel].join(" ").toLowerCase();
      const matchSearch = !q || hay.includes(q);
      const matchStatus = statusFilter === "all" || c.status === statusFilter;
      const matchBranch = branchFilter === "all" || c.branchId === branchFilter;
      return matchSearch && matchStatus && matchBranch;
    });
  }, [branches, cohorts, search, statusFilter, branchFilter]);

  const cohortStatusLabel = (s: string) => {
    if (s === "active") return t("active");
    if (s === "upcoming") return t("cohortStatusLabelUpcoming");
    if (s === "completed") return t("cohortStatusLabelCompleted");
    return s;
  };

  return (
    <AdminLayout>
      <PanelPageHeader
        icon={UsersRound}
        title={t("adminSidebarGroups")}
        subtitle={t("adminCohortsPageSubtitle")}
        actions={
          <Button
            onClick={() => {
              setNewCohort((n) => ({ ...n, branchId: branches[0]?.id ?? DEFAULT_PRIMARY_BRANCH_ID }));
              setAddOpen(true);
            }}
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
          >
            <Plus className="w-4 h-4" />
            {t("addNew")}
          </Button>
        }
      />

      <div className="rounded-xl border border-border bg-card overflow-hidden">
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
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground min-w-[9rem]"
            aria-label={t("filterByStatus")}
          >
            <option value="all">{t("filterOptionAll")}</option>
            <option value="active">{t("active")}</option>
            <option value="upcoming">{t("cohortStatusLabelUpcoming")}</option>
            <option value="completed">{t("cohortStatusLabelCompleted")}</option>
          </select>
          <CsvExportButton
            filename="admin-cohorts.csv"
            headers={[
              t("tableColId"),
              t("adminColBranch"),
              t("name"),
              t("cohortColInstructor"),
              t("cohortColSchedule"),
              t("cohortColPeriod"),
              t("cohortColEnrollment"),
              t("status"),
            ]}
            rows={filteredCohorts.map((c) => [
              c.id,
              branchNameById(branches, c.branchId),
              c.name,
              c.instructor,
              c.schedule,
              `${c.startDate} - ${c.endDate}`,
              `${c.enrolled} / ${c.seats}`,
              cohortStatusLabel(c.status),
            ])}
          />
        </DataTableToolbar>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                {[t("tableColId"), t("adminColBranch"), t("name"), t("cohortColInstructor"), t("cohortColSchedule"), t("cohortColPeriod"), t("cohortColEnrollment"), t("status"), t("actions")].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredCohorts.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3.5 text-xs font-mono text-muted-foreground whitespace-nowrap">{c.id}</td>
                  <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap max-w-[12rem] truncate" title={branchNameById(branches, c.branchId)}>
                    {branchNameById(branches, c.branchId)}
                  </td>
                  <td className="px-4 py-3.5 font-medium text-foreground min-w-[220px]">{c.name}</td>
                  <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">{c.instructor}</td>
                  <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">{c.schedule}</td>
                  <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">{c.startDate} - {c.endDate}</td>
                  <td className="px-4 py-3.5 text-foreground whitespace-nowrap">
                    {c.enrolled} / {c.seats}
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge className={`text-xs ${statusColor[c.status]}`}>{cohortStatusLabel(c.status)}</Badge>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      {c.meetLink && (
                        <button onClick={() => handleJoinMeeting(c.meetLink)} className="p-1.5 rounded hover:bg-primary/10 text-primary" aria-label={t("meetLink")}>
                          <Video className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={() => setEditCohort({ ...c })} className="p-1.5 rounded hover:bg-primary/10 text-primary" aria-label={t("edit")}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={handleViewStudents} className="p-1.5 rounded hover:bg-primary/10 text-primary" aria-label={t("cohortAriaViewStudents")}>
                        <Users className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setDeleteId(c.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500" aria-label={t("delete")}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit */}
      <Dialog open={!!editCohort} onOpenChange={() => setEditCohort(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t("cohortDialogEditTitle")}</DialogTitle></DialogHeader>
          {editCohort && (
            <form onSubmit={handleEdit} className="space-y-3 mt-2">
              <div><label className="block text-sm font-medium text-muted-foreground mb-1">{t("adminSelectBranch")}</label>
                <select value={editCohort.branchId} onChange={e => setEditCohort({ ...editCohort, branchId: e.target.value })}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select></div>
              <div><label className="block text-sm font-medium text-muted-foreground mb-1">{t("name")}</label>
                <Input value={editCohort.name} onChange={e => setEditCohort({ ...editCohort, name: e.target.value })} className="h-10" /></div>
              <div><label className="block text-sm font-medium text-muted-foreground mb-1">{t("cohortLabelSchedule")}</label>
                <Input value={editCohort.schedule} onChange={e => setEditCohort({ ...editCohort, schedule: e.target.value })} className="h-10" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium text-muted-foreground mb-1">{t("cohortLabelStartShort")}</label>
                  <Input value={editCohort.startDate} onChange={e => setEditCohort({ ...editCohort, startDate: e.target.value })} className="h-10" /></div>
                <div><label className="block text-sm font-medium text-muted-foreground mb-1">{t("cohortLabelEndShort")}</label>
                  <Input value={editCohort.endDate} onChange={e => setEditCohort({ ...editCohort, endDate: e.target.value })} className="h-10" /></div>
              </div>
              <div><label className="block text-sm font-medium text-muted-foreground mb-1">{t("cohortLabelMeetLink")}</label>
                <Input value={editCohort.meetLink} onChange={e => setEditCohort({ ...editCohort, meetLink: e.target.value })} placeholder={t("cohortPlaceholderMeetLink")} className="h-10" /></div>
              <div><label className="block text-sm font-medium text-muted-foreground mb-1">{t("status")}</label>
                <select value={editCohort.status} onChange={e => setEditCohort({ ...editCohort, status: e.target.value })}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="upcoming">{t("cohortStatusLabelUpcoming")}</option>
                  <option value="active">{t("active")}</option>
                  <option value="completed">{t("cohortStatusLabelCompleted")}</option>
                </select></div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setEditCohort(null)}>{t("cancel")}</Button>
                <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">{t("save")}</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Add */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t("cohortDialogNewTitle")}</DialogTitle></DialogHeader>
          <form onSubmit={handleAdd} className="space-y-3 mt-2">
            <div><label className="block text-sm font-medium text-muted-foreground mb-1">{t("adminSelectBranch")}</label>
              <select value={newCohort.branchId} onChange={e => setNewCohort({ ...newCohort, branchId: e.target.value })}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select></div>
            <div><label className="block text-sm font-medium text-muted-foreground mb-1">{t("name")} *</label>
              <Input value={newCohort.name} onChange={e => setNewCohort({ ...newCohort, name: e.target.value })} placeholder={t("cohortPlaceholderCohortName")} className="h-10" /></div>
            <div><label className="block text-sm font-medium text-muted-foreground mb-1">{t("cohortColInstructor")}</label>
              <Input value={newCohort.instructor} onChange={e => setNewCohort({ ...newCohort, instructor: e.target.value })} placeholder={t("cohortPlaceholderInstructor")} className="h-10" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium text-muted-foreground mb-1">{t("cohortLabelStartShort")} *</label>
                <Input value={newCohort.startDate} onChange={e => setNewCohort({ ...newCohort, startDate: e.target.value })} className="h-10" /></div>
              <div><label className="block text-sm font-medium text-muted-foreground mb-1">{t("cohortLabelEndShort")}</label>
                <Input value={newCohort.endDate} onChange={e => setNewCohort({ ...newCohort, endDate: e.target.value })} className="h-10" /></div>
            </div>
            <div><label className="block text-sm font-medium text-muted-foreground mb-1">{t("cohortLabelSchedule")}</label>
              <Input value={newCohort.schedule} onChange={e => setNewCohort({ ...newCohort, schedule: e.target.value })} className="h-10" /></div>
            <div><label className="block text-sm font-medium text-muted-foreground mb-1">{t("cohortLabelMeetLink")}</label>
              <Input value={newCohort.meetLink} onChange={e => setNewCohort({ ...newCohort, meetLink: e.target.value })} placeholder={t("cohortPlaceholderMeetLink")} className="h-10" /></div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>{t("cancel")}</Button>
              <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">{t("addNew")}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title={t("cohortDeleteTitle")} description={t("cohortDeleteDesc")} confirmLabel={t("delete")} danger />
    </AdminLayout>
  );
}
