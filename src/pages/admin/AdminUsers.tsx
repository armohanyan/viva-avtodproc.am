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
import { Plus, Edit2, Trash2, GraduationCap } from "lucide-react";
import { useState } from "react";
import { branchNameById, DEFAULT_PRIMARY_BRANCH_ID, useBranches } from "src/modules/branches";

type User = {
  id: string;
  name: string;
  email: string;
  phone: string;
  instructor: string;
  package: string;
  lessons: string;
  status: string;
  joined: string;
  branchId: string;
};

const instructorOptions = [
  "Armen Petrosyan",
  "Narine Hovhannisyan",
  "Vardan Grigoryan",
  "Lilit Sargsyan",
  "Hovhannes Mkrtchyan",
];

const initialUsers: User[] = [
  { id: "USR-001", name: "Ani Karapetyan", email: "ani@example.com", phone: "+374 99 111 222", instructor: "Armen Petrosyan", package: "Standard", lessons: "4/18", status: "active", joined: "Mar 1, 2026", branchId: "br-garegin-8" },
  { id: "USR-002", name: "Tigran Mkhitaryan", email: "tigran@example.com", phone: "+374 77 333 444", instructor: "Vardan Grigoryan", package: "Basic", lessons: "10/10", status: "completed", joined: "Feb 10, 2026", branchId: "br-azatamart-75" },
  { id: "USR-003", name: "Nare Harutyunyan", email: "nare@example.com", phone: "+374 55 555 666", instructor: "Narine Hovhannisyan", package: "Premium", lessons: "2/28", status: "active", joined: "Mar 15, 2026", branchId: "br-masis-125" },
  { id: "USR-004", name: "Suren Danielyan", email: "suren@example.com", phone: "+374 98 777 888", instructor: "Armen Petrosyan", package: "Standard", lessons: "0/18", status: "inactive", joined: "Jan 20, 2026", branchId: "br-garegin-8" },
  { id: "USR-005", name: "Mane Poghosyan", email: "mane@example.com", phone: "+374 91 999 000", instructor: "Lilit Sargsyan", package: "Basic", lessons: "6/10", status: "active", joined: "Mar 20, 2026", branchId: "br-azatamart-75" },
  { id: "USR-006", name: "Artak Sargsyan", email: "artak@example.com", phone: "+374 95 123 456", instructor: "Vardan Grigoryan", package: "Premium", lessons: "15/28", status: "active", joined: "Feb 1, 2026", branchId: "br-masis-125" },
];

const statusColor: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  completed: "bg-blue-100 text-blue-700",
  inactive: "bg-slate-100 text-slate-500",
};

export default function AdminUsers() {
  const { t } = useLang();
  const { showToast } = useToast();
  const { branches } = useBranches();
  const [users, setUsers] = useState(initialUsers);
  const [search, setSearch] = useState("");
  const [instructorFilter, setInstructorFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newUser, setNewUser] = useState<Partial<User>>({
    name: "",
    email: "",
    phone: "",
    instructor: instructorOptions[0],
    package: "Basic",
    status: "active",
    branchId: DEFAULT_PRIMARY_BRANCH_ID,
  });

  const filtered = users.filter((u) => {
    const q = search.trim().toLowerCase();
    const branchLabel = branchNameById(branches, u.branchId);
    const hay = [u.id, u.name, u.email, u.phone, u.instructor, u.package, u.lessons, u.status, u.joined, branchLabel].join(" ").toLowerCase();
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

  const displayJoined = (j: string) => (j === "Now" ? t("dateLabelNow") : j);

  const handleDelete = () => {
    setUsers(u => u.filter(x => x.id !== deleteId));
    showToast(t("userDeleted"), "success");
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setUsers(u => u.map(x => x.id === editUser.id ? editUser : x));
    setEditUser(null);
    showToast(t("profileSaved"), "success");
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email) { showToast(t("fillRequired"), "error"); return; }
    const user: User = {
      id: `USR-${String(users.length + 1).padStart(3, "0")}`,
      name: newUser.name!,
      email: newUser.email!,
      phone: newUser.phone || "",
      instructor: newUser.instructor || instructorOptions[0],
      package: newUser.package || "Basic",
      lessons: "0/10",
      status: "active",
      joined: "Now",
      branchId: newUser.branchId || DEFAULT_PRIMARY_BRANCH_ID,
    };
    setUsers(u => [user, ...u]);
    setAddOpen(false);
    setNewUser({
      name: "",
      email: "",
      phone: "",
      instructor: instructorOptions[0],
      package: "Basic",
      status: "active",
      branchId: branches[0]?.id ?? DEFAULT_PRIMARY_BRANCH_ID,
    });
    showToast(t("userAddedToast"), "success");
  };

  return (
    <AdminLayout>
      <PanelPageHeader
        icon={GraduationCap}
        title={t("adminSidebarStudents")}
        subtitle={t("adminStudentsPageSubtitle")}
        actions={
          <Button
            onClick={() => {
              setNewUser((n) => ({ ...n, branchId: branches[0]?.id ?? DEFAULT_PRIMARY_BRANCH_ID }));
              setAddOpen(true);
            }}
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
          >
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
            value={instructorFilter}
            onChange={(e) => setInstructorFilter(e.target.value)}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground min-w-[10rem]"
            aria-label={t("bookingInstructorLabel")}
          >
            <option value="all">{t("filterOptionAll")}</option>
            {instructorOptions.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
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
              t("status"),
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
              userStatusLabel(u.status),
              displayJoined(u.joined),
            ])}
          />
        </DataTableToolbar>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                {[t("name"), t("email"), t("phone"), t("adminColBranch"), t("cohortColInstructor"), t("adminColPackage"), t("adminColLessons"), t("status"), t("adminColJoined"), t("actions")].map((h, i) => (
                  <th key={i} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((u, i) => (
                <tr key={i} className="hover:bg-muted/30 transition-colors">
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
                  <td className="px-4 py-3.5"><Badge className={`text-xs ${statusColor[u.status]}`}>{userStatusLabel(u.status)}</Badge></td>
                  <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">{displayJoined(u.joined)}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex gap-2">
                      <button onClick={() => setEditUser({ ...u })} className="p-1.5 rounded hover:bg-primary/10 text-primary"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDeleteId(u.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
          {t("panelShowingLabel")} {filtered.length} / {users.length} {t("adminTableUsersFooter")}
        </div>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t("userDialogEditTitle")}</DialogTitle></DialogHeader>
          {editUser && (
            <form onSubmit={handleEdit} className="space-y-3 mt-2">
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
                <select value={editUser.status} onChange={e => setEditUser({ ...editUser, status: e.target.value })}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="active">{t("active")}</option>
                  <option value="inactive">{t("inactive")}</option>
                  <option value="completed">{t("userStatusCompleted")}</option>
                </select></div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setEditUser(null)}>{t("cancel")}</Button>
                <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">{t("save")}</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t("userDialogAddTitle")}</DialogTitle></DialogHeader>
          <form onSubmit={handleAdd} className="space-y-3 mt-2">
            <div><label className="block text-sm font-medium text-muted-foreground mb-1">{t("name")} *</label>
              <Input value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} placeholder={t("placeholderFullName")} className="h-10" /></div>
            <div><label className="block text-sm font-medium text-muted-foreground mb-1">{t("emailAddress")} *</label>
              <Input type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} placeholder={t("placeholderEmailExample")} className="h-10" /></div>
            <div><label className="block text-sm font-medium text-muted-foreground mb-1">{t("phoneNumber")}</label>
              <Input value={newUser.phone} onChange={e => setNewUser({ ...newUser, phone: e.target.value })} placeholder="+374 99 000 000" className="h-10" /></div>
            <div><label className="block text-sm font-medium text-muted-foreground mb-1">{t("adminSelectBranch")}</label>
              <select value={newUser.branchId} onChange={e => setNewUser({ ...newUser, branchId: e.target.value })}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select></div>
            <div><label className="block text-sm font-medium text-muted-foreground mb-1">{t("cohortColInstructor")}</label>
              <select value={newUser.instructor} onChange={e => setNewUser({ ...newUser, instructor: e.target.value })}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                {instructorOptions.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select></div>
            <div><label className="block text-sm font-medium text-muted-foreground mb-1">{t("adminColPackage")}</label>
              <select value={newUser.package} onChange={e => setNewUser({ ...newUser, package: e.target.value })}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="Basic">{t("basic")}</option>
                <option value="Standard">{t("standard")}</option>
                <option value="Premium">{t("premium")}</option>
              </select></div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>{t("cancel")}</Button>
              <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">{t("addNew")}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

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
