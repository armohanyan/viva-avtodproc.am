import AdminLayout from "src/components/AdminLayout";
import AdminTableScroll from "src/components/AdminTableScroll";
import AdminTableRowActions, { AdminTableRowContextMenu } from "src/components/AdminTableRowActions";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { Card } from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import { Input } from "src/components/ui/input";
import { Button } from "src/components/ui/button";
import { AppModal } from "src/components/AppModal";
import DataTableToolbar from "src/components/DataTableToolbar";
import CsvExportButton from "src/components/CsvExportButton";
import { TableColumnHeaderWithFilter } from "src/components/TableColumnFilter";
import PanelPageHeader from "src/components/PanelPageHeader";
import { Plus, Edit2, Users } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import type { AccountType } from "src/modules/accounts";
import { canInviteAccountType, isStaffAccountType, useAccount } from "src/modules/accounts";
import type { TranslationKey } from "src/lib/i18n";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";

type Account = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: AccountType;
  status: "active" | "inactive";
  created: string;
};

const roleBadge: Record<AccountType, string> = {
  super_admin: "bg-amber-100 text-amber-900",
  admin: "bg-violet-100 text-violet-800",
  instructor: "bg-sky-100 text-sky-800",
  student: "bg-slate-100 text-slate-700",
};

const ALL_ROLES: AccountType[] = ["super_admin", "admin"];

function roleOptionsForEdit(editor: AccountType, current: AccountType): AccountType[] {
  return ALL_ROLES.filter((r) => r === current || canInviteAccountType(editor, r));
}

function roleLabelKey(r: AccountType): TranslationKey {
  switch (r) {
    case "super_admin":
      return "roleLabelSuperAdmin";
    case "admin":
      return "roleAdmin";
    case "instructor":
      return "roleInstructor";
    case "student":
      return "roleStudent";
  }
}

export default function AdminAccounts() {
  const editAccountFormId = useId();
  const addAccountFormId = useId();
  const { t } = useLang();
  const { showToast } = useToast();
  const { user } = useAccount();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [edit, setEdit] = useState<Account | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<Account>>({
    name: "",
    email: "",
    phone: "",
    role: "admin",
    status: "active",
  });

  const editor = user?.accountType;

  const assignableRoles = useMemo(() => {
    if (!editor) return ALL_ROLES;
    return ALL_ROLES.filter((r) => canInviteAccountType(editor, r));
  }, [editor]);

  const defaultInviteRole: AccountType = assignableRoles.includes("admin") ? "admin" : assignableRoles[0] ?? "admin";

  const refreshAccounts = useCallback(async () => {
    setListLoading(true);
    try {
      const data = await vivaApiJson<Account[]>("/accounts?roles=admin,super_admin");
      setAccounts(Array.isArray(data) ? data : []);
    } catch (e) {
      setAccounts([]);
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setListLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void refreshAccounts();
  }, [refreshAccounts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return accounts.filter((a) => {
      if (!isStaffAccountType(a.role)) return false;
      if (a.role !== "admin" && a.role !== "super_admin") return false;
      const hay = [a.id, a.name, a.email, a.phone, a.role, a.status, a.created].join(" ").toLowerCase();
      return !q || hay.includes(q);
    });
  }, [accounts, search]);

  const roleLabel = (r: AccountType) => t(roleLabelKey(r));

  const displayCreated = (c: string) => (c === "Today" ? t("dateLabelToday") : c);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!edit || !editor) return;
    const prevRole = accounts.find((x) => x.id === edit.id)?.role;
    if (edit.role !== prevRole && !canInviteAccountType(editor, edit.role)) {
      showToast(t("accountsInviteAdminRolesHint"), "error");
      return;
    }
    try {
      await vivaApiJson(`/accounts/${encodeURIComponent(edit.id)}`, {
        method: "PATCH",
        body: {
          name: edit.name.trim(),
          email: edit.email.trim(),
          phone: edit.phone.trim() || null,
          accountType: edit.role,
          isActive: edit.status === "active",
        },
      });
      setEdit(null);
      showToast(t("accountUpdatedToast"), "success");
      await refreshAccounts();
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.name?.trim() || !draft.email?.trim()) {
      showToast(t("fillRequired"), "error");
      return;
    }
    const role = (draft.role as AccountType) || "admin";
    if (!editor || !canInviteAccountType(editor, role)) {
      showToast(t("accountsInviteAdminRolesHint"), "error");
      return;
    }
    try {
      await vivaApiJson("/accounts", {
        method: "POST",
        body: {
          name: draft.name!.trim(),
          email: draft.email!.trim(),
          phone: draft.phone?.trim() || undefined,
          accountType: role,
          isActive: draft.status !== "inactive",
        },
      });
      setAddOpen(false);
      setDraft({ name: "", email: "", phone: "", role: defaultInviteRole, status: "active" });
      showToast(t("inviteRecordedToast"), "success");
      await refreshAccounts();
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    }
  };

  return (
    <AdminLayout>
      <PanelPageHeader
        icon={Users}
        title={t("adminAccounts")}
        subtitle={t("accountsPageSubtitle")}
        actions={
          <Button
            onClick={() => {
              setDraft({ name: "", email: "", phone: "", role: defaultInviteRole, status: "active" });
              setAddOpen(true);
            }}
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
          >
            <Plus className="w-4 h-4" />
            {t("sendInvite")}
          </Button>
        }
      />

      <Card className="border-border overflow-hidden min-w-0">
        {listLoading ? (
          <p className="p-6 text-sm text-muted-foreground text-center">{t("redirecting")}</p>
        ) : null}
        <DataTableToolbar value={search} onChange={setSearch} placeholder={`${t("search")}…`}>
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
                <TableColumnHeaderWithFilter title={t("tableColId")} />
                <TableColumnHeaderWithFilter title={t("name")} />
                <TableColumnHeaderWithFilter title={t("accountsColEmail")} />
                <TableColumnHeaderWithFilter title={t("phoneNumber")} />
                <TableColumnHeaderWithFilter title={t("accountsColRole")} />
                <TableColumnHeaderWithFilter title={t("status")} />
                <TableColumnHeaderWithFilter title={t("accountsColCreated")} />
                <TableColumnHeaderWithFilter title={t("actions")} align="end" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((a) => (
                <AdminTableRowContextMenu
                  key={a.id}
                  actions={[
                    {
                      kind: "item",
                      id: "edit",
                      label: t("edit"),
                      icon: Edit2,
                      onClick: () => setEdit(a),
                    },
                  ]}
                >
                  <tr className="hover:bg-muted/30">
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
                      <AdminTableRowActions
                        toolbarOnly
                        actions={[
                          {
                            kind: "item",
                            id: "edit",
                            label: t("edit"),
                            icon: Edit2,
                            onClick: () => setEdit(a),
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
        {filtered.length === 0 && <p className="p-6 text-sm text-muted-foreground text-center">{t("tableNoMatches")}</p>}
      </Card>

      <AppModal
        open={!!edit}
        onOpenChange={(o) => !o && setEdit(null)}
        title={t("edit")}
        footer={
          edit ? (
            <Button type="submit" form={editAccountFormId} className="w-full bg-primary text-primary-foreground">
              {t("saveChanges")}
            </Button>
          ) : null
        }
      >
        {edit && (
          <form id={editAccountFormId} onSubmit={handleSave} className="space-y-4">
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
                onChange={(e) => setEdit({ ...edit, role: e.target.value as AccountType })}
              >
                {roleOptionsForEdit(editor, edit.role).map((r) => (
                  <option key={r} value={r}>
                    {roleLabel(r)}
                  </option>
                ))}
              </select>
            </div>
            {editor === "admin" ? <p className="text-xs text-muted-foreground">{t("accountsInviteAdminRolesHint")}</p> : null}
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
          </form>
        )}
      </AppModal>

      <AppModal
        open={addOpen}
        onOpenChange={setAddOpen}
        title={t("sendInvite")}
        footer={
          <Button type="submit" form={addAccountFormId} className="w-full bg-primary text-primary-foreground">
            {t("sendInvite")}
          </Button>
        }
      >
        <form id={addAccountFormId} onSubmit={handleAdd} className="space-y-4">
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
              value={draft.role as AccountType}
              onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value as AccountType }))}
            >
              {assignableRoles.map((r) => (
                <option key={r} value={r}>
                  {roleLabel(r)}
                </option>
              ))}
            </select>
          </div>
          <p className="text-xs text-muted-foreground">{t("accountsInviteHint")}</p>
          {editor === "admin" ? <p className="text-xs text-muted-foreground">{t("accountsInviteAdminRolesHint")}</p> : null}
        </form>
      </AppModal>
    </AdminLayout>
  );
}
