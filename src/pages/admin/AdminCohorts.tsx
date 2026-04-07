import AdminLayout from "src/components/AdminLayout";
import AdminTableScroll from "src/components/AdminTableScroll";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { formatShortDateFromIso } from "src/lib/adminFormat";
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
import { allInstructorNames } from "src/modules/admin/adminPeople";

const instructorNames = allInstructorNames();

type Cohort = {
  id: string;
  name: string;
  startDateIso: string;
  endDateIso: string;
  schedule: string;
  seats: number;
  enrolled: number;
  instructorName: string;
  meetLink: string;
  status: string;
  branchId: string;
};

const initialCohorts: Cohort[] = [
  {
    id: "COH-012",
    name: "Theory Cohort 12",
    startDateIso: "2026-03-20",
    endDateIso: "2026-04-10",
    schedule: "Tue & Thu, 18:00–20:00",
    seats: 12,
    enrolled: 10,
    instructorName: "Narine Hovhannisyan",
    meetLink: "https://meet.google.com/abc-def",
    status: "active",
    branchId: "br-garegin-8",
  },
  {
    id: "COH-013",
    name: "Theory Cohort 13",
    startDateIso: "2026-04-15",
    endDateIso: "2026-05-05",
    schedule: "Mon & Wed, 18:00–20:00",
    seats: 15,
    enrolled: 3,
    instructorName: "Vardan Grigoryan",
    meetLink: "https://meet.google.com/xyz-123",
    status: "upcoming",
    branchId: "br-azatamart-75",
  },
  {
    id: "COH-011",
    name: "Theory Cohort 11",
    startDateIso: "2026-02-01",
    endDateIso: "2026-02-21",
    schedule: "Mon & Wed, 17:00–19:00",
    seats: 12,
    enrolled: 12,
    instructorName: "Narine Hovhannisyan",
    meetLink: "",
    status: "completed",
    branchId: "br-masis-125",
  },
];

const statusColor: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  upcoming: "bg-blue-100 text-blue-700",
  completed: "bg-slate-100 text-slate-500",
};

export default function AdminCohorts() {
  const { t, lang } = useLang();
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
    startDateIso: "",
    endDateIso: "",
    schedule: "",
    seats: 15,
    instructorName: instructorNames[0] ?? "",
    meetLink: "",
    branchId: DEFAULT_PRIMARY_BRANCH_ID,
  });

  const handleDelete = () => {
    setCohorts((c) => c.filter((x) => x.id !== deleteId));
    showToast(t("cohortDeleted"), "success");
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCohort) return;
    setCohorts((c) => c.map((x) => (x.id === editCohort.id ? editCohort : x)));
    setEditCohort(null);
    showToast(t("cohortUpdatedToast"), "success");
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCohort.name?.trim() || !newCohort.startDateIso) {
      showToast(t("fillRequired"), "error");
      return;
    }
    const cohort: Cohort = {
      id: `COH-${String(cohorts.length + 14).padStart(3, "0")}`,
      name: newCohort.name.trim(),
      startDateIso: newCohort.startDateIso,
      endDateIso: newCohort.endDateIso || newCohort.startDateIso,
      schedule: newCohort.schedule,
      seats: Math.max(1, newCohort.seats || 1),
      enrolled: 0,
      instructorName: newCohort.instructorName || instructorNames[0] || "",
      meetLink: newCohort.meetLink,
      branchId: newCohort.branchId || DEFAULT_PRIMARY_BRANCH_ID,
      status: "upcoming",
    };
    setCohorts((c) => [cohort, ...c]);
    setAddOpen(false);
    setNewCohort({
      name: "",
      startDateIso: "",
      endDateIso: "",
      schedule: "",
      seats: 15,
      instructorName: instructorNames[0] ?? "",
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
      const period = `${formatShortDateFromIso(c.startDateIso, lang)} ${formatShortDateFromIso(c.endDateIso, lang)}`;
      const hay = [c.id, c.name, c.instructorName, c.schedule, c.startDateIso, c.endDateIso, period, c.status, c.meetLink, branchLabel].join(" ").toLowerCase();
      const matchSearch = !q || hay.includes(q);
      const matchStatus = statusFilter === "all" || c.status === statusFilter;
      const matchBranch = branchFilter === "all" || c.branchId === branchFilter;
      return matchSearch && matchStatus && matchBranch;
    });
  }, [branches, cohorts, search, statusFilter, branchFilter, lang]);

  const cohortStatusLabel = (s: string) => {
    if (s === "active") return t("active");
    if (s === "upcoming") return t("cohortStatusLabelUpcoming");
    if (s === "completed") return t("cohortStatusLabelCompleted");
    return s;
  };

  const periodLabel = (c: Cohort) =>
    `${formatShortDateFromIso(c.startDateIso, lang)} – ${formatShortDateFromIso(c.endDateIso, lang)}`;

  return (
    <AdminLayout>
      <PanelPageHeader
        icon={UsersRound}
        title={t("adminSidebarGroups")}
        subtitle={t("adminCohortsPageSubtitle")}
        actions={
          <Button
            onClick={() => {
              setNewCohort((n) => ({
                ...n,
                branchId: branches[0]?.id ?? DEFAULT_PRIMARY_BRANCH_ID,
                instructorName: instructorNames[0] ?? n.instructorName,
              }));
              setAddOpen(true);
            }}
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
          >
            <Plus className="w-4 h-4" />
            {t("addNew")}
          </Button>
        }
      />

      <div className="rounded-xl border border-border bg-card overflow-hidden min-w-0">
        <DataTableToolbar value={search} onChange={setSearch} placeholder={`${t("search")}…`}>
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground min-w-0 w-full sm:min-w-[11rem] sm:w-auto"
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
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground min-w-0 w-full sm:min-w-[9rem] sm:w-auto"
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
              c.instructorName,
              c.schedule,
              periodLabel(c),
              `${c.enrolled} / ${c.seats}`,
              cohortStatusLabel(c.status),
            ])}
          />
        </DataTableToolbar>
        <AdminTableScroll>
          <table className="w-full text-sm min-w-[56rem]">
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
                  <td className="px-4 py-3.5 font-medium text-foreground min-w-[200px]">{c.name}</td>
                  <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">{c.instructorName}</td>
                  <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">{c.schedule}</td>
                  <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">{periodLabel(c)}</td>
                  <td className="px-4 py-3.5 text-foreground whitespace-nowrap">
                    {c.enrolled} / {c.seats}
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge className={`text-xs ${statusColor[c.status]}`}>{cohortStatusLabel(c.status)}</Badge>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      {c.meetLink && (
                        <button type="button" onClick={() => handleJoinMeeting(c.meetLink)} className="p-1.5 rounded hover:bg-primary/10 text-primary" aria-label={t("meetLink")} title={t("meetLink")}>
                          <Video className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button type="button" onClick={() => setEditCohort({ ...c })} className="p-1.5 rounded hover:bg-primary/10 text-primary" aria-label={t("edit")} title={t("edit")}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={handleViewStudents} className="p-1.5 rounded hover:bg-primary/10 text-primary" aria-label={t("cohortAriaViewStudents")} title={t("cohortAriaViewStudents")}>
                        <Users className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={() => setDeleteId(c.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500" aria-label={t("delete")} title={t("delete")}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminTableScroll>
      </div>

      <Dialog open={!!editCohort} onOpenChange={() => setEditCohort(null)}>
        <DialogContent className="max-w-md max-h-[min(90vh,720px)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("cohortDialogEditTitle")}</DialogTitle>
          </DialogHeader>
          {editCohort && (
            <form onSubmit={handleEdit} className="space-y-3 mt-2">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("adminSelectBranch")}</label>
                <select
                  value={editCohort.branchId}
                  onChange={(e) => setEditCohort({ ...editCohort, branchId: e.target.value })}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("name")}</label>
                <Input value={editCohort.name} onChange={(e) => setEditCohort({ ...editCohort, name: e.target.value })} className="h-10" />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("cohortColInstructor")}</label>
                <select
                  value={editCohort.instructorName}
                  onChange={(e) => setEditCohort({ ...editCohort, instructorName: e.target.value })}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {instructorNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("cohortLabelSchedule")}</label>
                <Input value={editCohort.schedule} onChange={(e) => setEditCohort({ ...editCohort, schedule: e.target.value })} className="h-10" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">{t("cohortLabelStartShort")}</label>
                  <Input type="date" value={editCohort.startDateIso} onChange={(e) => setEditCohort({ ...editCohort, startDateIso: e.target.value })} className="h-10" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">{t("cohortLabelEndShort")}</label>
                  <Input type="date" value={editCohort.endDateIso} onChange={(e) => setEditCohort({ ...editCohort, endDateIso: e.target.value })} className="h-10" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("seats")}</label>
                <Input
                  type="number"
                  min={1}
                  value={editCohort.seats}
                  onChange={(e) => setEditCohort({ ...editCohort, seats: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                  className="h-10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("cohortLabelMeetLink")}</label>
                <Input value={editCohort.meetLink} onChange={(e) => setEditCohort({ ...editCohort, meetLink: e.target.value })} placeholder={t("cohortPlaceholderMeetLink")} className="h-10" />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("status")}</label>
                <select
                  value={editCohort.status}
                  onChange={(e) => setEditCohort({ ...editCohort, status: e.target.value })}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="upcoming">{t("cohortStatusLabelUpcoming")}</option>
                  <option value="active">{t("active")}</option>
                  <option value="completed">{t("cohortStatusLabelCompleted")}</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setEditCohort(null)}>
                  {t("cancel")}
                </Button>
                <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">
                  {t("save")}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md max-h-[min(90vh,720px)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("cohortDialogNewTitle")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-3 mt-2">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("adminSelectBranch")}</label>
              <select
                value={newCohort.branchId}
                onChange={(e) => setNewCohort({ ...newCohort, branchId: e.target.value })}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("name")} *</label>
              <Input value={newCohort.name} onChange={(e) => setNewCohort({ ...newCohort, name: e.target.value })} placeholder={t("cohortPlaceholderCohortName")} className="h-10" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("cohortColInstructor")}</label>
              <select
                value={newCohort.instructorName}
                onChange={(e) => setNewCohort({ ...newCohort, instructorName: e.target.value })}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {instructorNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("cohortLabelStartShort")} *</label>
                <Input type="date" value={newCohort.startDateIso} onChange={(e) => setNewCohort({ ...newCohort, startDateIso: e.target.value })} className="h-10" />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("cohortLabelEndShort")}</label>
                <Input type="date" value={newCohort.endDateIso} onChange={(e) => setNewCohort({ ...newCohort, endDateIso: e.target.value })} className="h-10" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("cohortLabelSchedule")}</label>
              <Input value={newCohort.schedule} onChange={(e) => setNewCohort({ ...newCohort, schedule: e.target.value })} className="h-10" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("seats")}</label>
              <Input
                type="number"
                min={1}
                value={newCohort.seats}
                onChange={(e) => setNewCohort({ ...newCohort, seats: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                className="h-10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("cohortLabelMeetLink")}</label>
              <Input value={newCohort.meetLink} onChange={(e) => setNewCohort({ ...newCohort, meetLink: e.target.value })} placeholder={t("cohortPlaceholderMeetLink")} className="h-10" />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">
                {t("addNew")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title={t("cohortDeleteTitle")} description={t("cohortDeleteDesc")} confirmLabel={t("delete")} danger />
    </AdminLayout>
  );
}
