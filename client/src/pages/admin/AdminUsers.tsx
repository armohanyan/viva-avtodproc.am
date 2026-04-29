import AdminLayout from "src/components/AdminLayout";
import AdminTableScroll from "src/components/AdminTableScroll";
import AdminTableRowActions, { AdminTableRowContextMenu } from "src/components/AdminTableRowActions";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { formatShortDateFromIso, todayIsoDate } from "src/lib/adminFormat";
import { Card } from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import { Input } from "src/components/ui/input";
import { Button } from "src/components/ui/button";
import { AppModal } from "src/components/AppModal";
import ConfirmDialog from "src/components/ConfirmDialog";
import DataTableToolbar from "src/components/DataTableToolbar";
import CsvExportButton from "src/components/CsvExportButton";
import TableColumnFilter, { TableColumnHeaderWithFilter } from "src/components/TableColumnFilter";
import PanelPageHeader from "src/components/PanelPageHeader";
import { Plus, Edit2, Trash2, GraduationCap, CalendarPlus, Mail } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { branchNameById, useBranches } from "src/modules/branches";
import { allInstructorNames } from "src/modules/admin/adminPeople";
import { useInstructors } from "src/modules/instructors/useInstructors";
type PackageRow = { id: string; name: string; lessons: number; theoryLessons: number };
const INTERNAL_NO_LOGIN_EMAIL_DOMAIN = "no-login.local";

type NewUserDraft = Partial<User> & { inviteToSystem: boolean };

function displayStudentEmail(email: string): string {
  const value = (email ?? "").trim();
  return value.toLowerCase().endsWith(`@${INTERNAL_NO_LOGIN_EMAIL_DOMAIN}`) ? "" : value;
}

function parseLessons(lessons: string): { completed: number; total: number } | null {
  const m = /^(\d+)\s*\/\s*(\d+)$/.exec(lessons.trim());
  if (!m) return null;
  return { completed: Number(m[1]), total: Number(m[2]) };
}

type User = {
  id: string;
  name: string;
  email: string;
  phone: string;
  instructor: string;
  package: string;
  lessons: string;
  status: string;
  /** YYYY-MM-DD */
  joinedIso: string;
  branchId: string;
  /** 0-10, where 0 means complete beginner */
  skillRating: number;
  licenseAchieved: boolean;
};

const statusColor: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  completed: "bg-blue-100 text-blue-700",
  inactive: "bg-slate-100 text-slate-500",
};

function adminBookingHref(opts: { studentId: string; branchId: string | number | null | undefined }) {
  const p = new URLSearchParams({ student: String(opts.studentId) });
  const branch = String(opts.branchId ?? "").trim();
  if (branch) p.set("branch", branch);
  return `/admin/bookings?${p.toString()}`;
}

export default function AdminUsers() {
  const editUserFormId = useId();
  const addUserFormId = useId();
  const [, setLocation] = useLocation();
  const { t, lang } = useLang();
  const { showToast } = useToast();
  const { branches } = useBranches();
  const { instructors } = useInstructors();
  const instructorOptions = useMemo(() => allInstructorNames(instructors), [instructors]);
  const instructorRows = useMemo(() => instructors.map((i) => ({ id: i.id, name: i.name })), [instructors]);
  const [users, setUsers] = useState<User[]>([]);
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [invitingId, setInvitingId] = useState<string | null>(null);

  const inviteStudent = useCallback(
    async (studentId: string, email?: string) => {
      if (invitingId) {
        return;
      }
      if (!displayStudentEmail(email ?? "").trim()) {
        showToast(t("inviteStudentEmailRequired"), "error");
        return;
      }
      setInvitingId(studentId);
      try {
        await vivaApiJson<{ sent: boolean }>("/admin/invite-student", {
          method: "POST",
          body: { studentUserId: Number(studentId) },
        });
        showToast(t("inviteStudentSent"), "success");
      } catch (e) {
        showToast(getApiErrorMessage(e) || t("inviteStudentFailed"), "error");
      } finally {
        setInvitingId(null);
      }
    },
    [invitingId, showToast, t],
  );

  const refresh = useCallback(async () => {
    try {
      const [stu, pkg] = await Promise.all([
        vivaApiJson<User[]>("/students"),
        vivaApiJson<PackageRow[]>("/packages"),
      ]);
      setUsers(
        Array.isArray(stu)
          ? stu.map((u) => ({
              ...u,
              email: displayStudentEmail(u.email),
            }))
          : [],
      );
      setPackages(
        Array.isArray(pkg)
          ? pkg.map((p) => ({
              id: p.id,
              name: p.name,
              lessons: p.lessons,
              theoryLessons: Number((p as PackageRow).theoryLessons ?? 0),
            }))
          : [],
      );
    } catch (e) {
      showToast(getApiErrorMessage(e) || t("fillRequired"), "error");
    }
  }, [showToast, t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);
  const [search, setSearch] = useState("");
  const [instructorFilter, setInstructorFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newUser, setNewUser] = useState<NewUserDraft>({
    name: "",
    email: "",
    inviteToSystem: true,
    phone: "",
    status: "active",
    branchId: "",
    skillRating: 0,
    licenseAchieved: false,
  });

  const filtered = users.filter((u) => {
    const q = search.trim().toLowerCase();
    const branchLabel = branchNameById(branches, u.branchId);
    const hay = [u.id, u.name, u.email, u.phone, u.instructor, u.package, u.lessons, u.status, u.joinedIso, formatShortDateFromIso(u.joinedIso, lang), branchLabel, String(u.skillRating), u.licenseAchieved ? t("studentLicenseAchieved") : t("studentLicenseNotYet")].join(" ").toLowerCase();
    const matchesSearch = !q || hay.includes(q);
    const matchesInstructor = instructorFilter === "all" || u.instructor === instructorFilter;
    const matchesBranch = branchFilter === "all" || u.branchId === branchFilter;
    return matchesSearch && matchesInstructor && matchesBranch;
  });

  const userStatusLabel = (s: string) => {
    if (s === "active") return t("active");
    if (s === "inactive") return t("inactive");
    if (s === "completed") return t("userStatusCompleted");
    return s;
  };

  const displayJoined = (iso: string) => formatShortDateFromIso(iso, lang);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await vivaApiJson(`/students/${encodeURIComponent(deleteId)}`, { method: "DELETE" });
      setDeleteId(null);
      await refresh();
      showToast(t("userDeleted"), "success");
    } catch (e) {
      showToast(getApiErrorMessage(e) || t("fillRequired"), "error");
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    const parsed = parseLessons(editUser.lessons);
    const pkg = packages.find((p) => p.name === editUser.package);
    const ins = instructorRows.find((i) => i.name === editUser.instructor);
    try {
      await vivaApiJson(`/students/${encodeURIComponent(editUser.id)}`, {
        method: "PATCH",
        body: {
          name: editUser.name,
          email: editUser.email,
          phone: editUser.phone,
          branchId: editUser.branchId,
          packageId: pkg?.id,
          instructorUserId: ins?.id ?? null,
          enrollmentStatus: editUser.status,
          skillRating: editUser.skillRating,
          licenseAchieved: editUser.licenseAchieved,
          joinedIso: editUser.joinedIso,
          ...(parsed
            ? { lessonsCompleted: parsed.completed, lessonsTotal: parsed.total }
            : {}),
        },
      });
      setEditUser(null);
      await refresh();
      showToast(t("profileSaved"), "success");
    } catch (e) {
      showToast(getApiErrorMessage(e) || t("fillRequired"), "error");
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || (newUser.inviteToSystem && !newUser.email?.trim())) {
      showToast(t("fillRequired"), "error");
      return;
    }
    try {
      await vivaApiJson("/students", {
        method: "POST",
        body: {
          name: newUser.name,
          email: newUser.email?.trim() || undefined,
          inviteToSystem: newUser.inviteToSystem,
          phone: newUser.phone || "",
          branchId: newUser.branchId || branches[0]?.id || "",
          packageId: null,
          instructorUserId: null,
          enrollmentStatus: "active",
          lessonsCompleted: 0,
          lessonsTotal: 0,
          theoryLessonsCompleted: 0,
          theoryLessonsTotal: 0,
          skillRating: Number(newUser.skillRating ?? 0),
          licenseAchieved: !!newUser.licenseAchieved,
          joinedIso: todayIsoDate(),
        },
      });
      setAddOpen(false);
      setNewUser({
        name: "",
        email: "",
        inviteToSystem: true,
        phone: "",
        status: "active",
        branchId: branches[0]?.id ?? "",
        skillRating: 0,
        licenseAchieved: false,
      });
      await refresh();
      showToast(t("userAddedToast"), "success");
    } catch (e) {
      showToast(getApiErrorMessage(e) || t("fillRequired"), "error");
    }
  };

  return (
    <AdminLayout>
      <PanelPageHeader
        icon={GraduationCap}
        title={t("adminSidebarStudents")}
        subtitle={t("adminStudentsPageSubtitle")}
        actions={
          <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-2">
            <Link href="/admin/students/analytics" className="block w-full min-w-0 sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto">
                {t("adminStudentsAnalytics")}
              </Button>
            </Link>
            <Button
              className="w-full gap-2 sm:w-auto"
              onClick={() => {
                setNewUser((n) => ({ ...n, branchId: branches[0]?.id ?? "" }));
                setAddOpen(true);
              }}
            >
              <Plus className="w-4 h-4" />
              {t("adminStudentsAddStudent")}
            </Button>
          </div>
        }
      />

      <Card className="border-border overflow-hidden min-w-0">
        <DataTableToolbar value={search} onChange={setSearch} placeholder={`${t("search")}…`}>
          <CsvExportButton
            filename="admin-students.csv"
            headers={[
              t("name"),
              t("email"),
              t("phone"),
              t("adminColBranch"),
              t("cohortColInstructor"),
              t("adminColPackage"),
              t("adminColLessons"),
              t("studentSkillRating"),
              t("status"),
              t("studentLicense"),
              t("adminColJoined"),
            ]}
            rows={filtered.map((u) => [
              u.name,
              u.email,
              u.phone,
              branchNameById(branches, u.branchId),
              u.instructor,
              u.package,
              u.lessons,
              String(u.skillRating),
              userStatusLabel(u.status),
              u.licenseAchieved ? t("studentLicenseAchieved") : t("studentLicenseNotYet"),
              displayJoined(u.joinedIso),
            ])}
          />
        </DataTableToolbar>

        <AdminTableScroll>
          <table className="w-full text-sm min-w-[62rem]">
            <thead className="bg-muted/40">
              <tr>
                <TableColumnHeaderWithFilter title={t("name")} />
                <TableColumnHeaderWithFilter title={t("email")} />
                <TableColumnHeaderWithFilter title={t("phone")} />
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
                <TableColumnHeaderWithFilter
                  title={t("cohortColInstructor")}
                  filter={
                    <TableColumnFilter
                      value={instructorFilter}
                      onChange={setInstructorFilter}
                      ariaLabel={t("bookingInstructorLabel")}
                      options={[
                        { value: "all", label: t("filterOptionAll") },
                        ...instructorOptions.map((name) => ({ value: name, label: name })),
                      ]}
                    />
                  }
                />
                <TableColumnHeaderWithFilter title={t("adminColPackage")} />
                <TableColumnHeaderWithFilter title={t("adminColLessons")} />
                <TableColumnHeaderWithFilter title={t("studentSkillRating")} />
                <TableColumnHeaderWithFilter title={t("status")} />
                <TableColumnHeaderWithFilter title={t("studentLicense")} />
                <TableColumnHeaderWithFilter title={t("adminColJoined")} />
                <TableColumnHeaderWithFilter title={t("actions")} align="end" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((u, i) => (
                <AdminTableRowContextMenu
                  key={i}
                  actions={[
                    {
                      kind: "link",
                      id: "book",
                      label: t("adminStudentBookLesson"),
                      href: adminBookingHref({ studentId: u.id, branchId: u.branchId }),
                      icon: CalendarPlus,
                    },
                    {
                      kind: "item",
                      id: "invite",
                      label: invitingId === u.id ? t("loading") : t("inviteStudent"),
                      icon: Mail,
                      onClick: () => void inviteStudent(u.id, u.email),
                    },
                    {
                      kind: "item",
                      id: "edit",
                      label: t("edit"),
                      icon: Edit2,
                      onClick: () => setEditUser({ ...u }),
                    },
                    {
                      kind: "item",
                      id: "delete",
                      label: t("delete"),
                      icon: Trash2,
                      destructive: true,
                      onClick: () => setDeleteId(u.id),
                    },
                  ]}
                >
                  <tr className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary font-semibold text-xs shrink-0">{u.name[0]}</div>
                        <span className="font-medium text-foreground whitespace-nowrap">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">{u.email}</td>
                    <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">{u.phone}</td>
                    <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap max-w-[10rem] truncate" title={branchNameById(branches, u.branchId)}>
                      {branchNameById(branches, u.branchId)}
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">{u.instructor}</td>
                    <td className="px-4 py-3.5 text-muted-foreground">{u.package}</td>
                    <td className="px-4 py-3.5 text-muted-foreground">{u.lessons}</td>
                    <td className="px-4 py-3.5 text-muted-foreground font-medium whitespace-nowrap">{u.skillRating}/10</td>
                    <td className="px-4 py-3.5"><Badge className={`text-xs ${statusColor[u.status]}`}>{userStatusLabel(u.status)}</Badge></td>
                    <td className="px-4 py-3.5">
                      <Badge variant={u.licenseAchieved ? "default" : "secondary"} className="text-xs">
                        {u.licenseAchieved ? t("studentLicenseAchieved") : t("studentLicenseNotYet")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">{displayJoined(u.joinedIso)}</td>
                    <td className="px-4 py-3.5">
                      <AdminTableRowActions
                        toolbarOnly
                        className="gap-0.5"
                        actions={[
                          {
                            kind: "link",
                            id: "book",
                            label: t("adminStudentBookLesson"),
                            href: adminBookingHref({ studentId: u.id, branchId: u.branchId }),
                            icon: CalendarPlus,
                          },
                          {
                            kind: "item",
                            id: "invite",
                            label: invitingId === u.id ? t("loading") : t("inviteStudent"),
                            icon: Mail,
                            onClick: () => void inviteStudent(u.id, u.email),
                          },
                          {
                            kind: "item",
                            id: "edit",
                            label: t("edit"),
                            icon: Edit2,
                            onClick: () => setEditUser({ ...u }),
                          },
                          {
                            kind: "item",
                            id: "delete",
                            label: t("delete"),
                            icon: Trash2,
                            destructive: true,
                            onClick: () => setDeleteId(u.id),
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
        <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
          {t("panelShowingLabel")} {filtered.length} / {users.length} {t("adminTableUsersFooter")}
        </div>
      </Card>
      {/* Edit Dialog */}
      <AppModal
        open={!!editUser}
        onOpenChange={(o) => !o && setEditUser(null)}
        title={t("userDialogEditTitle")}
        contentClassName="max-w-md max-h-[min(90vh,720px)]"
        footer={
          editUser ? (
            <div className="flex flex-wrap gap-2 sm:gap-3 flex-1 min-w-0 w-full sm:justify-end">
              <Button type="button" variant="outline" className="min-w-[6rem] flex-1 sm:flex-none" onClick={() => setEditUser(null)}>
                {t("cancel")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="min-w-0 flex-1 sm:flex-none gap-2"
                onClick={() => {
                  setLocation(adminBookingHref({ studentId: editUser.id, branchId: editUser.branchId }));
                  setEditUser(null);
                }}
              >
                <CalendarPlus className="w-4 h-4 shrink-0" />
                {t("adminStudentBookLesson")}
              </Button>
              <Button type="submit" form={editUserFormId} className="min-w-[6rem] flex-1 sm:flex-none bg-primary hover:bg-primary/90 text-primary-foreground">
                {t("save")}
              </Button>
            </div>
          ) : null
        }
      >
        {editUser && (
            <form id={editUserFormId} onSubmit={handleEdit} className="space-y-3">
              <div><label className="block text-sm font-medium text-muted-foreground mb-1">{t("adminSelectBranch")}</label>
                <select value={editUser.branchId} onChange={e => setEditUser({ ...editUser, branchId: e.target.value })}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select></div>
              <div><label className="block text-sm font-medium text-muted-foreground mb-1">{t("name")}</label>
                <Input value={editUser.name} onChange={e => setEditUser({ ...editUser, name: e.target.value })} className="h-10" /></div>
              <div><label className="block text-sm font-medium text-muted-foreground mb-1">{t("emailAddress")}</label>
                <Input value={editUser.email} onChange={e => setEditUser({ ...editUser, email: e.target.value })} className="h-10" /></div>
              <div><label className="block text-sm font-medium text-muted-foreground mb-1">{t("phoneNumber")}</label>
                <Input value={editUser.phone} onChange={e => setEditUser({ ...editUser, phone: e.target.value })} className="h-10" /></div>
              <div><label className="block text-sm font-medium text-muted-foreground mb-1">{t("cohortColInstructor")}</label>
                <select value={editUser.instructor} onChange={e => setEditUser({ ...editUser, instructor: e.target.value })}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  {instructorOptions.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select></div>
              <div><label className="block text-sm font-medium text-muted-foreground mb-1">{t("status")}</label>
                <select value={editUser.status} onChange={e => setEditUser({ ...editUser, status: e.target.value, licenseAchieved: e.target.value === "completed" ? true : editUser.licenseAchieved })}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="active">{t("active")}</option>
                  <option value="inactive">{t("inactive")}</option>
                  <option value="completed">{t("userStatusCompleted")}</option>
                </select></div>
              <div><label className="block text-sm font-medium text-muted-foreground mb-1">{t("studentSkillRating")} (0-10)</label>
                <Input type="number" min={0} max={10} value={editUser.skillRating} onChange={e => setEditUser({ ...editUser, skillRating: Math.max(0, Math.min(10, Number(e.target.value) || 0)) })} className="h-10" /></div>
              <label className="flex items-center gap-2.5 cursor-pointer text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={editUser.licenseAchieved}
                  onChange={e => setEditUser({ ...editUser, licenseAchieved: e.target.checked, status: e.target.checked ? "completed" : editUser.status === "completed" ? "active" : editUser.status })}
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                {t("studentLicenseAchieved")}
              </label>
              <div><label className="block text-sm font-medium text-muted-foreground mb-1">{t("adminColJoined")}</label>
                <Input type="date" value={editUser.joinedIso} onChange={e => setEditUser({ ...editUser, joinedIso: e.target.value })} className="h-10" /></div>
            </form>
          )}
      </AppModal>

      {/* Add Dialog */}
      <AppModal
        open={addOpen}
        onOpenChange={setAddOpen}
        title={t("userDialogAddTitle")}
        contentClassName="max-w-md"
        footer={
          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" form={addUserFormId} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">
              {t("addNew")}
            </Button>
          </div>
        }
      >
        <form id={addUserFormId} onSubmit={handleAdd} className="space-y-3">
            <div><label className="block text-sm font-medium text-muted-foreground mb-1">{t("name")} *</label>
              <Input value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} placeholder={t("placeholderFullName")} className="h-10" /></div>
            <label className="flex items-center gap-2.5 cursor-pointer text-sm text-foreground">
              <input
                type="checkbox"
                checked={newUser.inviteToSystem}
                onChange={e => setNewUser({ ...newUser, inviteToSystem: e.target.checked })}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              {t("studentInviteToSystem")}
            </label>
            <div><label className="block text-sm font-medium text-muted-foreground mb-1">
              {t("emailAddress")} {newUser.inviteToSystem ? "*" : ""}
            </label>
              <Input
                type="email"
                value={newUser.email}
                onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                placeholder={newUser.inviteToSystem ? t("placeholderEmailExample") : t("studentEmailOptionalWhenNoInvite")}
                className="h-10"
              /></div>
            <div><label className="block text-sm font-medium text-muted-foreground mb-1">{t("phoneNumber")}</label>
              <Input value={newUser.phone} onChange={e => setNewUser({ ...newUser, phone: e.target.value })} placeholder="+374 99 000 000" className="h-10" /></div>
            <div><label className="block text-sm font-medium text-muted-foreground mb-1">{t("adminSelectBranch")}</label>
              <select value={newUser.branchId} onChange={e => setNewUser({ ...newUser, branchId: e.target.value })}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select></div>
            <div><label className="block text-sm font-medium text-muted-foreground mb-1">{t("studentSkillRating")} (0-10)</label>
              <Input type="number" min={0} max={10} value={newUser.skillRating ?? 0} onChange={e => setNewUser({ ...newUser, skillRating: Math.max(0, Math.min(10, Number(e.target.value) || 0)) })} className="h-10" /></div>
            <label className="flex items-center gap-2.5 cursor-pointer text-sm text-foreground">
              <input
                type="checkbox"
                checked={!!newUser.licenseAchieved}
                onChange={e => setNewUser((s) => ({ ...s, licenseAchieved: e.target.checked, status: e.target.checked ? "completed" : s.status === "completed" ? "active" : s.status }))}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              {t("studentLicenseAchieved")}
            </label>
        </form>
      </AppModal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title={t("userDeleteTitle")}
        description={t("userDeleteDesc")}
        confirmLabel={t("delete")}
        danger
      />
    </AdminLayout>
  );
}
