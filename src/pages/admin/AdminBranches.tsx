import AdminLayout from "src/components/AdminLayout";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "src/components/ui/dialog";
import ConfirmDialog from "src/components/ConfirmDialog";
import DataTableToolbar from "src/components/DataTableToolbar";
import CsvExportButton from "src/components/CsvExportButton";
import PanelPageHeader from "src/components/PanelPageHeader";
import { Plus, Edit2, Trash2, MapPin } from "lucide-react";
import { useMemo, useState } from "react";
import type { Branch } from "src/modules/branches";
import { useBranches } from "src/modules/branches";

export default function AdminBranches() {
  const { t } = useLang();
  const { showToast } = useToast();
  const { branches, addBranch, updateBranch, removeBranch } = useBranches();
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newBranch, setNewBranch] = useState({
    name: "",
    mapUrl: "",
    phone: "",
    email: "",
    workHours: "",
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return branches.filter((b) => {
      const hay = [b.name, b.mapUrl, b.phone, b.email, b.workHours].filter(Boolean).join(" ").toLowerCase();
      return !q || hay.includes(q);
    });
  }, [branches, search]);

  const handleDelete = () => {
    if (!deleteId) return;
    if (branches.length <= 1) {
      showToast(t("branchDeleteNeedOneToast"), "error");
      setDeleteId(null);
      return;
    }
    removeBranch(deleteId);
    setDeleteId(null);
    showToast(t("branchDeletedToast"), "success");
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBranch) return;
    if (!editBranch.name.trim() || !editBranch.mapUrl.trim()) {
      showToast(t("fillRequired"), "error");
      return;
    }
    updateBranch(editBranch.id, {
      name: editBranch.name.trim(),
      mapUrl: editBranch.mapUrl.trim(),
      phone: editBranch.phone?.trim() || undefined,
      email: editBranch.email?.trim() || undefined,
      workHours: editBranch.workHours?.trim() || undefined,
    });
    setEditBranch(null);
    showToast(t("branchUpdatedToast"), "success");
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranch.name.trim() || !newBranch.mapUrl.trim()) {
      showToast(t("fillRequired"), "error");
      return;
    }
    addBranch({
      name: newBranch.name.trim(),
      mapUrl: newBranch.mapUrl.trim(),
      phone: newBranch.phone.trim() || undefined,
      email: newBranch.email.trim() || undefined,
      workHours: newBranch.workHours.trim() || undefined,
    });
    setAddOpen(false);
    setNewBranch({ name: "", mapUrl: "", phone: "", email: "", workHours: "" });
    showToast(t("branchCreatedToast"), "success");
  };

  return (
    <AdminLayout>
      <PanelPageHeader
        icon={MapPin}
        title={t("adminSidebarBranches")}
        subtitle={t("adminBranchesPageSubtitle")}
        actions={
          <Button onClick={() => setAddOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
            <Plus className="w-4 h-4" />
            {t("addNew")}
          </Button>
        }
      />

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <DataTableToolbar value={search} onChange={setSearch} placeholder={`${t("search")}…`}>
          <CsvExportButton
            filename="admin-branches.csv"
            headers={[t("name"), t("phone"), t("email"), t("workHours"), t("branchMapEmbedUrl")]}
            rows={filtered.map((b) => [
              b.name,
              b.phone ?? "—",
              b.email ?? "—",
              b.workHours ?? "—",
              b.mapUrl,
            ])}
          />
        </DataTableToolbar>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                {[t("name"), t("phone"), t("email"), t("workHours"), t("branchMapEmbedUrl"), t("actions")].map((h) => (
                  <th
                    key={h}
                    className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((b) => (
                <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3.5 font-medium text-foreground min-w-[200px]">
                    <span className="inline-flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                      {b.name}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap max-w-[10rem] truncate">{b.phone ?? "—"}</td>
                  <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap max-w-[12rem] truncate">{b.email ?? "—"}</td>
                  <td className="px-4 py-3.5 text-muted-foreground max-w-[14rem] truncate">{b.workHours ?? "—"}</td>
                  <td className="px-4 py-3.5 text-xs text-muted-foreground font-mono max-w-[180px] truncate" title={b.mapUrl}>
                    {b.mapUrl}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditBranch({ ...b })}
                        className="p-1.5 rounded hover:bg-primary/10 text-primary"
                        aria-label={t("edit")}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteId(b.id)}
                        className="p-1.5 rounded hover:bg-red-50 text-red-500"
                        aria-label={t("delete")}
                      >
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
          {filtered.length} / {branches.length}
        </div>
      </div>

      <Dialog open={!!editBranch} onOpenChange={() => setEditBranch(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("branchEditTitle")}</DialogTitle>
          </DialogHeader>
          {editBranch && (
            <form onSubmit={handleEdit} className="space-y-3 mt-2">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("name")} *</label>
                <Input
                  value={editBranch.name}
                  onChange={(e) => setEditBranch({ ...editBranch, name: e.target.value })}
                  className="h-10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("branchMapEmbedUrl")} *</label>
                <Input
                  value={editBranch.mapUrl}
                  onChange={(e) => setEditBranch({ ...editBranch, mapUrl: e.target.value })}
                  placeholder={t("placeholderMapEmbedUrl")}
                  className="h-10 text-xs"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("phone")}</label>
                <Input
                  value={editBranch.phone ?? ""}
                  onChange={(e) => setEditBranch({ ...editBranch, phone: e.target.value })}
                  className="h-10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("email")}</label>
                <Input
                  value={editBranch.email ?? ""}
                  onChange={(e) => setEditBranch({ ...editBranch, email: e.target.value })}
                  className="h-10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("workHours")}</label>
                <Input
                  value={editBranch.workHours ?? ""}
                  onChange={(e) => setEditBranch({ ...editBranch, workHours: e.target.value })}
                  className="h-10"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setEditBranch(null)}>
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
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("branchNewTitle")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-3 mt-2">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("name")} *</label>
              <Input
                value={newBranch.name}
                onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
                className="h-10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("branchMapEmbedUrl")} *</label>
              <Input
                value={newBranch.mapUrl}
                onChange={(e) => setNewBranch({ ...newBranch, mapUrl: e.target.value })}
                placeholder={t("placeholderMapEmbedUrl")}
                className="h-10 text-xs"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("phone")}</label>
              <Input
                value={newBranch.phone}
                onChange={(e) => setNewBranch({ ...newBranch, phone: e.target.value })}
                className="h-10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("email")}</label>
              <Input
                value={newBranch.email}
                onChange={(e) => setNewBranch({ ...newBranch, email: e.target.value })}
                className="h-10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("workHours")}</label>
              <Input
                value={newBranch.workHours}
                onChange={(e) => setNewBranch({ ...newBranch, workHours: e.target.value })}
                className="h-10"
              />
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

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title={t("branchDeleteConfirmTitle")}
        description={t("branchDeleteConfirmDesc")}
        confirmLabel={t("delete")}
        danger
      />
    </AdminLayout>
  );
}
