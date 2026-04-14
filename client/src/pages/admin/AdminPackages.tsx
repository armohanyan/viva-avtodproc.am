import AdminLayout from "src/components/AdminLayout";
import AdminTableScroll from "src/components/AdminTableScroll";
import AdminTableRowActions, { AdminTableRowContextMenu } from "src/components/AdminTableRowActions";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { Badge } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "src/components/ui/dialog";
import ConfirmDialog from "src/components/ConfirmDialog";
import DataTableToolbar from "src/components/DataTableToolbar";
import CsvExportButton from "src/components/CsvExportButton";
import TableColumnFilter, { TableColumnHeaderWithFilter } from "src/components/TableColumnFilter";
import PanelPageHeader from "src/components/PanelPageHeader";
import { Plus, Edit2, Trash2, Package } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { vivaApiJson } from "src/lib/vivaApi";

type Pkg = { id: string; name: string; price: string; lessons: number; enrolled: number; status: string; features: string[]; };

export default function AdminPackages() {
  const { t } = useLang();
  const { showToast } = useToast();
  const [packages, setPackages] = useState<Pkg[]>([]);

  const refresh = useCallback(async () => {
    try {
      const data = await vivaApiJson<Pkg[]>("/packages");
      setPackages(Array.isArray(data) ? data : []);
    } catch {
      showToast(t("fillRequired"), "error");
    }
  }, [showToast, t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | string>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editPkg, setEditPkg] = useState<Pkg | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newPkg, setNewPkg] = useState({ name: "", price: "", lessons: 10 });

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await vivaApiJson(`/packages/${encodeURIComponent(deleteId)}`, { method: "DELETE" });
      setDeleteId(null);
      await refresh();
      showToast(t("packageDeleted"), "success");
    } catch {
      showToast(t("fillRequired"), "error");
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPkg) return;
    try {
      await vivaApiJson(`/packages/${encodeURIComponent(editPkg.id)}`, {
        method: "PATCH",
        body: {
          name: editPkg.name,
          price: editPkg.price,
          lessons: editPkg.lessons,
          status: editPkg.status,
          features: editPkg.features,
        },
      });
      setEditPkg(null);
      await refresh();
      showToast(t("packageUpdatedToast"), "success");
    } catch {
      showToast(t("fillRequired"), "error");
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPkg.name || !newPkg.price) {
      showToast(t("fillRequired"), "error");
      return;
    }
    try {
      await vivaApiJson("/packages", {
        method: "POST",
        body: { name: newPkg.name, price: newPkg.price, lessons: newPkg.lessons, status: "active", features: [] },
      });
      setAddOpen(false);
      setNewPkg({ name: "", price: "", lessons: 10 });
      await refresh();
      showToast(t("packageCreatedToast"), "success");
    } catch {
      showToast(t("fillRequired"), "error");
    }
  };

  const filteredPackages = useMemo(() => {
    const q = search.trim().toLowerCase();
    return packages.filter((pkg) => {
      const hay = [pkg.id, pkg.name, pkg.price, String(pkg.lessons), String(pkg.enrolled), pkg.status, pkg.features.join(" ")]
        .join(" ")
        .toLowerCase();
      const matchSearch = !q || hay.includes(q);
      const matchStatus = statusFilter === "all" || pkg.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [packages, search, statusFilter]);

  return (
    <AdminLayout>
      <PanelPageHeader
        icon={Package}
        title={t("packages")}
        subtitle={t("adminPackagesPageSubtitle")}
        actions={
          <Button onClick={() => setAddOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
            <Plus className="w-4 h-4" />
            {t("addNew")}
          </Button>
        }
      />

      <div className="rounded-xl border border-border bg-card overflow-hidden min-w-0">
        <DataTableToolbar value={search} onChange={setSearch} placeholder={`${t("search")}…`}>
          <CsvExportButton
            filename="admin-packages.csv"
            headers={[
              t("tableColId"),
              t("name"),
              t("adminColPrice"),
              t("lessons"),
              t("adminColEnrolled"),
              t("adminColFeatures"),
              t("status"),
            ]}
            rows={filteredPackages.map((pkg) => [
              pkg.id,
              pkg.name,
              `${pkg.price} ֏`,
              String(pkg.lessons),
              String(pkg.enrolled),
              pkg.features.join(", ") || "—",
              t(pkg.status === "active" ? "active" : "inactive"),
            ])}
          />
        </DataTableToolbar>
        <AdminTableScroll>
          <table className="w-full text-sm min-w-[40rem]">
            <thead className="bg-muted/40">
              <tr>
                <TableColumnHeaderWithFilter title={t("tableColId")} />
                <TableColumnHeaderWithFilter title={t("name")} />
                <TableColumnHeaderWithFilter title={t("adminColPrice")} />
                <TableColumnHeaderWithFilter title={t("lessons")} />
                <TableColumnHeaderWithFilter title={t("adminColEnrolled")} />
                <TableColumnHeaderWithFilter title={t("adminColFeatures")} />
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
                        { value: "inactive", label: t("inactive") },
                      ]}
                    />
                  }
                />
                <TableColumnHeaderWithFilter title={t("actions")} align="end" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredPackages.map((pkg) => (
                <AdminTableRowContextMenu
                  key={pkg.id}
                  actions={[
                    {
                      kind: "item",
                      id: "edit",
                      label: t("edit"),
                      icon: Edit2,
                      onClick: () => setEditPkg({ ...pkg }),
                    },
                    {
                      kind: "item",
                      id: "delete",
                      label: t("delete"),
                      icon: Trash2,
                      destructive: true,
                      onClick: () => setDeleteId(pkg.id),
                    },
                  ]}
                >
                  <tr className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3.5 text-xs font-mono text-muted-foreground whitespace-nowrap">{pkg.id}</td>
                    <td className="px-4 py-3.5 font-medium text-foreground whitespace-nowrap">{pkg.name}</td>
                    <td className="px-4 py-3.5 text-foreground whitespace-nowrap">{pkg.price} ֏</td>
                    <td className="px-4 py-3.5 text-foreground whitespace-nowrap">{pkg.lessons}</td>
                    <td className="px-4 py-3.5 text-foreground whitespace-nowrap">{pkg.enrolled}</td>
                    <td className="px-4 py-3.5 text-muted-foreground min-w-[240px]">{pkg.features.join(", ") || "—"}</td>
                    <td className="px-4 py-3.5">
                      <Badge className="bg-emerald-100 text-emerald-700 text-xs">{t("active")}</Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <AdminTableRowActions
                        toolbarOnly
                        actions={[
                          {
                            kind: "item",
                            id: "edit",
                            label: t("edit"),
                            icon: Edit2,
                            onClick: () => setEditPkg({ ...pkg }),
                          },
                          {
                            kind: "item",
                            id: "delete",
                            label: t("delete"),
                            icon: Trash2,
                            destructive: true,
                            onClick: () => setDeleteId(pkg.id),
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
      </div>

      <Dialog open={!!editPkg} onOpenChange={() => setEditPkg(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t("packageDialogEditTitle")}</DialogTitle></DialogHeader>
          {editPkg && (
            <form onSubmit={handleEdit} className="space-y-3 mt-2">
              <div><label className="block text-sm font-medium text-muted-foreground mb-1">{t("name")}</label>
                <Input value={editPkg.name} onChange={e => setEditPkg({ ...editPkg, name: e.target.value })} className="h-10" /></div>
              <div><label className="block text-sm font-medium text-muted-foreground mb-1">{t("packageLabelPriceDram")}</label>
                <Input value={editPkg.price} onChange={e => setEditPkg({ ...editPkg, price: e.target.value })} className="h-10" /></div>
              <div><label className="block text-sm font-medium text-muted-foreground mb-1">{t("packageLabelLessonsCount")}</label>
                <Input type="number" value={editPkg.lessons} onChange={e => setEditPkg({ ...editPkg, lessons: +e.target.value })} className="h-10" /></div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setEditPkg(null)}>{t("cancel")}</Button>
                <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">{t("save")}</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t("packageDialogNewTitle")}</DialogTitle></DialogHeader>
          <form onSubmit={handleAdd} className="space-y-3 mt-2">
            <div><label className="block text-sm font-medium text-muted-foreground mb-1">{t("name")} *</label>
              <Input value={newPkg.name} onChange={e => setNewPkg({ ...newPkg, name: e.target.value })} placeholder={t("packagePlaceholderName")} className="h-10" /></div>
            <div><label className="block text-sm font-medium text-muted-foreground mb-1">{t("packageLabelPriceDram")} *</label>
              <Input value={newPkg.price} onChange={e => setNewPkg({ ...newPkg, price: e.target.value })} placeholder={t("packagePlaceholderPrice")} className="h-10" /></div>
            <div><label className="block text-sm font-medium text-muted-foreground mb-1">{t("packageLabelLessonsCount")}</label>
              <Input type="number" value={newPkg.lessons} onChange={e => setNewPkg({ ...newPkg, lessons: +e.target.value })} className="h-10" /></div>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>{t("cancel")}</Button>
              <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">{t("addNew")}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title={t("packageDeleteTitle")} description={t("packageDeleteDesc")} confirmLabel={t("delete")} danger />
    </AdminLayout>
  );
}
