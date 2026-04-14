import AdminLayout from "src/components/AdminLayout";
import AdminTableScroll from "src/components/AdminTableScroll";
import AdminTableRowActions, {
  AdminTableRowContextMenu,
  type AdminTableRowAction,
} from "src/components/AdminTableRowActions";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { formatShortDateFromIso } from "src/lib/adminFormat";
import { Badge } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "src/components/ui/dialog";
import ConfirmDialog from "src/components/ConfirmDialog";
import DataTableToolbar from "src/components/DataTableToolbar";
import CsvExportButton from "src/components/CsvExportButton";
import TableColumnFilter, { TableColumnHeaderWithFilter } from "src/components/TableColumnFilter";
import PanelPageHeader from "src/components/PanelPageHeader";
import { Plus, Users, UsersRound, Video, Edit2, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { branchNameById, DEFAULT_PRIMARY_BRANCH_ID, useBranches } from "src/modules/branches";
import { allInstructorNames } from "src/modules/admin/adminPeople";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { useInstructors } from "src/modules/instructors/useInstructors";

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

type CohortStudentRow = {
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
};

const statusColor: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  upcoming: "bg-blue-100 text-blue-700",
  completed: "bg-slate-100 text-slate-500",
};

export default function AdminCohorts() {
  const { t, lang } = useLang();
  const { showToast } = useToast();
  const { branches } = useBranches();
  const { instructors } = useInstructors();
  const instructorNames = useMemo(() => allInstructorNames(instructors), [instructors]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);

  const refreshCohorts = useCallback(async () => {
    try {
      const data = await vivaApiJson<Cohort[]>("/theory-cohorts");
      setCohorts(Array.isArray(data) ? data : []);
    } catch (e) {
      setCohorts([]);
      showToast(getApiErrorMessage(e), "error");
    }
  }, [showToast]);

  useEffect(() => {
    void refreshCohorts();
  }, [refreshCohorts]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editCohort, setEditCohort] = useState<Cohort | null>(null);
  const [studentsDialogCohort, setStudentsDialogCohort] = useState<Cohort | null>(null);
  const [cohortStudents, setCohortStudents] = useState<CohortStudentRow[]>([]);
  const [cohortStudentsLoading, setCohortStudentsLoading] = useState(false);
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

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await vivaApiJson(`/theory-cohorts/${encodeURIComponent(deleteId)}`, { method: "DELETE" });
      setDeleteId(null);
      showToast(t("cohortDeleted"), "success");
      await refreshCohorts();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCohort) return;
    try {
      await vivaApiJson(`/theory-cohorts/${encodeURIComponent(editCohort.id)}`, {
        method: "PATCH",
        body: {
          name: editCohort.name.trim(),
          startDateIso: editCohort.startDateIso,
          endDateIso: editCohort.endDateIso || editCohort.startDateIso,
          schedule: editCohort.schedule.trim() || "—",
          seats: Math.max(1, editCohort.seats || 1),
          instructorName: editCohort.instructorName.trim() || instructorNames[0] || "—",
          meetLink: editCohort.meetLink?.trim() ?? "",
          status: editCohort.status,
          branchId: editCohort.branchId,
        },
      });
      setEditCohort(null);
      showToast(t("cohortUpdatedToast"), "success");
      await refreshCohorts();
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCohort.name?.trim() || !newCohort.startDateIso) {
      showToast(t("fillRequired"), "error");
      return;
    }
    try {
      await vivaApiJson("/theory-cohorts", {
        method: "POST",
        body: {
          name: newCohort.name.trim(),
          startDateIso: newCohort.startDateIso,
          endDateIso: newCohort.endDateIso || newCohort.startDateIso,
          schedule: newCohort.schedule.trim() || "—",
          seats: Math.max(1, newCohort.seats || 1),
          instructorName: newCohort.instructorName || instructorNames[0] || "—",
          meetLink: newCohort.meetLink?.trim() ?? "",
          status: "upcoming",
          branchId: newCohort.branchId || DEFAULT_PRIMARY_BRANCH_ID,
        },
      });
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
      await refreshCohorts();
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    }
  };

  const handleJoinMeeting = (link: string) => {
    window.open(link, "_blank");
    showToast(t("openingMeetingLinkToast"), "info");
  };

  const openStudentsDialog = useCallback(
    async (cohort: Cohort) => {
      setStudentsDialogCohort(cohort);
      setCohortStudents([]);
      setCohortStudentsLoading(true);
      try {
        const data = await vivaApiJson<CohortStudentRow[]>(
          `/theory-cohorts/${encodeURIComponent(cohort.id)}/enrollments`,
        );
        setCohortStudents(Array.isArray(data) ? data : []);
      } catch (e) {
        setCohortStudents([]);
        setStudentsDialogCohort(null);
        showToast(getApiErrorMessage(e), "error");
      } finally {
        setCohortStudentsLoading(false);
      }
    },
    [showToast],
  );

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
                <TableColumnHeaderWithFilter title={t("tableColId")} />
                <TableColumnHeaderWithFilter
                  title={t("adminColBranch")}
                  filter={
                    <TableColumnFilter
                      value={branchFilter}
                      onChange={setBranchFilter}
                      ariaLabel={t("filterByBranch")}
                      options={[
                        { value: "all", label: t("filterOptionAll") },
                        ...branches.map((b) => ({ value: b.id, label: b.name })),
                      ]}
                    />
                  }
                />
                <TableColumnHeaderWithFilter title={t("name")} />
                <TableColumnHeaderWithFilter title={t("cohortColInstructor")} />
                <TableColumnHeaderWithFilter title={t("cohortColSchedule")} />
                <TableColumnHeaderWithFilter title={t("cohortColPeriod")} />
                <TableColumnHeaderWithFilter title={t("cohortColEnrollment")} />
                <TableColumnHeaderWithFilter
                  title={t("status")}
                  filter={
                    <TableColumnFilter
                      value={statusFilter}
                      onChange={setStatusFilter}
                      ariaLabel={t("filterByStatus")}
                      options={[
                        { value: "all", label: t("filterOptionAll") },
                        { value: "active", label: t("active") },
                        { value: "upcoming", label: t("cohortStatusLabelUpcoming") },
                        { value: "completed", label: t("cohortStatusLabelCompleted") },
                      ]}
                    />
                  }
                />
                <TableColumnHeaderWithFilter title={t("actions")} align="end" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredCohorts.map((c) => {
                const rowActions: AdminTableRowAction[] = [
                  ...(c.meetLink
                    ? [
                        {
                          kind: "item" as const,
                          id: "meet",
                          label: t("meetLink"),
                          icon: Video,
                          onClick: () => handleJoinMeeting(c.meetLink!),
                        },
                      ]
                    : []),
                  {
                    kind: "item",
                    id: "edit",
                    label: t("edit"),
                    icon: Edit2,
                    onClick: () => setEditCohort({ ...c }),
                  },
                  {
                    kind: "item",
                    id: "students",
                    label: t("cohortAriaViewStudents"),
                    ariaLabel: t("cohortAriaViewStudents"),
                    icon: Users,
                    onClick: () => void openStudentsDialog(c),
                  },
                  {
                    kind: "item",
                    id: "delete",
                    label: t("delete"),
                    icon: Trash2,
                    destructive: true,
                    onClick: () => setDeleteId(c.id),
                  },
                ];
                return (
                  <AdminTableRowContextMenu key={c.id} actions={rowActions}>
                    <tr className="hover:bg-muted/30 transition-colors">
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
                        <AdminTableRowActions toolbarOnly actions={rowActions} />
                      </td>
                    </tr>
                  </AdminTableRowContextMenu>
                );
              })}
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

      <Dialog
        open={!!studentsDialogCohort}
        onOpenChange={(open) => {
          if (!open) {
            setStudentsDialogCohort(null);
            setCohortStudents([]);
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[min(90vh,560px)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("cohortStudentsDialogTitle")}</DialogTitle>
            {studentsDialogCohort ? (
              <DialogDescription className="text-foreground font-medium">{studentsDialogCohort.name}</DialogDescription>
            ) : null}
          </DialogHeader>
          {cohortStudentsLoading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">{t("loading")}</p>
          ) : cohortStudents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">{t("cohortStudentsEmpty")}</p>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden mt-2">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">{t("name")}</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">{t("email")}</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">{t("phone")}</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">{t("status")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {cohortStudents.map((s) => (
                    <tr key={s.userId} className="hover:bg-muted/20">
                      <td className="px-3 py-2 font-medium text-foreground">{s.name}</td>
                      <td className="px-3 py-2 text-muted-foreground break-all">{s.email}</td>
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{s.phone ?? "—"}</td>
                      <td className="px-3 py-2">
                        <Badge className={`text-xs ${s.isActive ? statusColor.active : "bg-slate-100 text-slate-500"}`}>
                          {s.isActive ? t("active") : t("inactive")}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
