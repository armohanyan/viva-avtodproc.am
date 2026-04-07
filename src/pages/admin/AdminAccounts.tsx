import AdminLayout from "src/components/AdminLayout";
import AdminTableScroll from "src/components/AdminTableScroll";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { Card } from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import { Input } from "src/components/ui/input";
import { Button } from "src/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "src/components/ui/dialog";
import DataTableToolbar from "src/components/DataTableToolbar";
import CsvExportButton from "src/components/CsvExportButton";
import PanelPageHeader from "src/components/PanelPageHeader";
import { Plus, Edit2, Users } from "lucide-react";
import { useMemo, useState } from "react";

type Role = "admin" | "instructor" | "student";

type Account = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  status: "active" | "inactive";
  created: string;
};

const initialAccounts: Account[] = [
  { id: "ACC-001", name: "Super Admin", email: "admin@vivadrive.am", phone: "+374 10 000 001", role: "admin", status: "active", created: "Jan 5, 2024" },
  { id: "ACC-002", name: "Armen Petrosyan", email: "armen@vivadrive.am", phone: "+374 99 123 456", role: "instructor", status: "active", created: "Feb 1, 2024" },
  { id: "ACC-003", name: "Narine Hovhannisyan", email: "narine@vivadrive.am", phone: "+374 77 222 333", role: "instructor", status: "active", created: "Mar 10, 2024" },
  { id: "ACC-004", name: "Demo Student", email: "student@example.com", phone: "+374 91 444 555", role: "student", status: "active", created: "Apr 2, 2026" },
];

const roleBadge: Record<Role, string> = {
  admin: "bg-violet-100 text-violet-800",
  instructor: "bg-sky-100 text-sky-800",
  student: "bg-slate-100 text-slate-700",
};

export default function AdminAccounts() {
  const { t } = useLang();
  const { showToast } = useToast();
  const [accounts, setAccounts] = useState(initialAccounts);
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<"staff" | "all">("staff");
  const [edit, setEdit] = useState<Account | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<Account>>({
    name: "",
    email: "",
    phone: "",
    role: "instructor",
    status: "active",
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return accounts.filter((a) => {
      const staff = a.role === "admin" || a.role === "instructor";
      if (scope === "staff" && !staff) return false;
      const hay = [a.id, a.name, a.email, a.phone, a.role, a.status, a.created].join(" ").toLowerCase();
      return (!q || hay.includes(q));
    });
  }, [accounts, search, scope]);

  const roleLabel = (r: Role) => t(r === "admin" ? "roleAdmin" : r === "instructor" ? "roleInstructor" : "roleStudent");

  const displayCreated = (c: string) => (c === "Today" ? t("dateLabelToday") : c);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!edit) return;
    setAccounts((list) => list.map((x) => (x.id === edit.id ? edit : x)));
    setEdit(null);
    showToast(t("accountUpdatedToast"), "success");
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.name?.trim() || !draft.email?.trim()) {
      showToast(t("fillRequired"), "error");
      return;
    }
    const acc: Account = {
      id: `ACC-${String(accounts.length + 1).padStart(3, "0")}`,
      name: draft.name!.trim(),
      email: draft.email!.trim(),
      phone: draft.phone?.trim() || "",
      role: (draft.role as Role) || "student",
      status: draft.status === "inactive" ? "inactive" : "active",
      created: "Today",
    };
    setAccounts((list) => [acc, ...list]);
    setAddOpen(false);
    setDraft({ name: "", email: "", phone: "", role: "instructor", status: "active" });
    showToast(t("accountCreatedToast"), "success");
  };

  return (
    <AdminLayout>
      <PanelPageHeader
        icon={Users}
        title={t("adminAccounts")}
        subtitle={t("accountsPageSubtitle")}
        actions={
          <Button onClick={() => setAddOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
            <Plus className="w-4 h-4" />
            {t("createAccount")}
          </Button>
        }
      />

      <Card className="border-border overflow-hidden min-w-0">
        <DataTableToolbar value={search} onChange={setSearch} placeholder={`${t("search")}…`}>
          <div className="flex gap-2 flex-wrap">
            {(
              [
                ["staff", t("accountsStaffFilter")],
                ["all", t("accountsFilterAll")],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setScope(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  scope === key ? "bg-primary text-primary-foreground border-primary" : "border-input text-muted-foreground hover:border-primary/40"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <CsvExportButton
            filename="admin-accounts.csv"
            headers={[
              t("tableColId"),
              t("name"),
              t("accountsColEmail"),
              t("phoneNumber"),
              t("accountsColRole"),
              t("status"),
              t("accountsColCreated"),
            ]}
            rows={filtered.map((a) => [
              a.id,
              a.name,
              a.email,
              a.phone,
              roleLabel(a.role),
              t(a.status),
              displayCreated(a.created),
            ])}
          />
        </DataTableToolbar>

        <AdminTableScroll>
          <table className="w-full text-sm min-w-[56rem]">
            <thead className="bg-muted/40">
              <tr>
                {[t("tableColId"), t("name"), t("accountsColEmail"), t("phoneNumber"), t("accountsColRole"), t("status"), t("accountsColCreated"), t("actions")].map((h, i) => (
                  <th key={i} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((a) => (
                <tr key={a.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{a.id}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{a.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.email}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{a.phone}</td>
                  <td className="px-4 py-3">
                    <Badge className={roleBadge[a.role]}>{roleLabel(a.role)}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={a.status === "active" ? "default" : "secondary"}>{t(a.status)}</Badge>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{displayCreated(a.created)}</td>
                  <td className="px-4 py-3">
                    <button type="button" className="p-1.5 hover:bg-accent rounded-md" onClick={() => setEdit(a)} aria-label={t("edit")} title={t("edit")}>
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminTableScroll>
        {filtered.length === 0 && <p className="p-6 text-sm text-muted-foreground text-center">{t("tableNoMatches")}</p>}
      </Card>

      <Dialog open={!!edit} onOpenChange={() => setEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("edit")}</DialogTitle>
          </DialogHeader>
          {edit && (
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">{t("name")}</label>
                <Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">{t("accountsColEmail")}</label>
                <Input type="email" value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">{t("phoneNumber")}</label>
                <Input value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">{t("accountsColRole")}</label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={edit.role}
                  onChange={(e) => setEdit({ ...edit, role: e.target.value as Role })}
                >
                  <option value="admin">{t("roleAdmin")}</option>
                  <option value="instructor">{t("roleInstructor")}</option>
                  <option value="student">{t("roleStudent")}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">{t("status")}</label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={edit.status}
                  onChange={(e) => setEdit({ ...edit, status: e.target.value as "active" | "inactive" })}
                >
                  <option value="active">{t("active")}</option>
                  <option value="inactive">{t("inactive")}</option>
                </select>
              </div>
              <Button type="submit" className="w-full bg-primary text-primary-foreground">
                {t("saveChanges")}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("createAccount")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">{t("name")}</label>
              <Input value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">{t("accountsColEmail")}</label>
              <Input type="email" value={draft.email} onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">{t("phoneNumber")}</label>
              <Input value={draft.phone} onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">{t("accountsColRole")}</label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={draft.role}
                onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value as Role }))}
              >
                <option value="admin">{t("roleAdmin")}</option>
                <option value="instructor">{t("roleInstructor")}</option>
                <option value="student">{t("roleStudent")}</option>
              </select>
            </div>
            <p className="text-xs text-muted-foreground">{t("accountsInviteHint")}</p>
            <Button type="submit" className="w-full bg-primary text-primary-foreground">
              {t("createAccount")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
