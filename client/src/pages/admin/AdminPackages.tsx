import AdminLayout from "src/components/AdminLayout";
import AdminTableScroll from "src/components/AdminTableScroll";
import AdminTableRowActions, { AdminTableRowContextMenu } from "src/components/AdminTableRowActions";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { Badge } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import { AppModal } from "src/components/AppModal";
import ConfirmDialog from "src/components/ConfirmDialog";
import DataTableToolbar from "src/components/DataTableToolbar";
import CsvExportButton from "src/components/CsvExportButton";
import TableColumnFilter, { TableColumnHeaderWithFilter } from "src/components/TableColumnFilter";
import PanelPageHeader from "src/components/PanelPageHeader";
import { Plus, Edit2, Trash2, Package } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { sanitizeCoverImageUrl } from "src/lib/blogHtml";
import { sameOriginStaffUploadUrl } from "src/lib/sameOriginStaffUploadUrl";
import { uploadStaffImageFile } from "src/lib/staffImageUpload";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { Textarea } from "src/components/ui/textarea";

const PACKAGE_PROMO_IMAGE_MAX_BYTES = 800 * 1024;

function featuresFromMultiline(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

type Pkg = {
  id: string;
  name: string;
  price: string;
  lessons: number;
  theoryLessons: number;
  enrolled: number;
  status: string;
  features: string[];
  imageUrl: string | null;
};

export default function AdminPackages() {
  const editPkgFormId = useId();
  const addPkgFormId = useId();
  const editPackageImageFileRef = useRef<HTMLInputElement | null>(null);
  const addPackageImageFileRef = useRef<HTMLInputElement | null>(null);
  const { t } = useLang();
  const { showToast } = useToast();
  const [packages, setPackages] = useState<Pkg[]>([]);

  const applyUploadedPackageImage = useCallback(
    async (file: File | undefined, onUrl: (url: string) => void) => {
      if (!file) return;
      if (file.size > PACKAGE_PROMO_IMAGE_MAX_BYTES) {
        showToast(t("adminExamQuestionsImageTooLarge"), "error");
        return;
      }
      try {
        const url = await uploadStaffImageFile(file);
        if (!sanitizeCoverImageUrl(url)) {
          showToast(t("adminExamQuestionsImageInvalid"), "error");
          return;
        }
        onUrl(url);
      } catch (err) {
        showToast(getApiErrorMessage(err), "error");
      }
    },
    [showToast, t],
  );

  const refresh = useCallback(async () => {
    try {
      const data = await vivaApiJson<Pkg[]>("/packages");
      setPackages(
        Array.isArray(data)
          ? data.map((p) => ({
              ...p,
              theoryLessons: Number((p as Pkg).theoryLessons ?? 0),
              imageUrl: sameOriginStaffUploadUrl(p.imageUrl ?? null),
            }))
          : [],
      );
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
  const [editFeaturesText, setEditFeaturesText] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [newPkg, setNewPkg] = useState({
    name: "",
    price: "",
    lessons: 10,
    theoryLessons: 0,
    featuresText: "",
    imageUrl: "",
    status: "active" as "active" | "inactive",
  });

  const openEdit = useCallback((pkg: Pkg) => {
    setEditPkg({ ...pkg, features: Array.isArray(pkg.features) ? pkg.features : [], imageUrl: pkg.imageUrl ?? null });
    setEditFeaturesText((Array.isArray(pkg.features) ? pkg.features : []).join("\n"));
  }, []);

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
          theoryLessons: editPkg.theoryLessons,
          status: editPkg.status,
          features: featuresFromMultiline(editFeaturesText),
          imageUrl: editPkg.imageUrl?.trim() ? editPkg.imageUrl.trim() : null,
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
        body: {
          name: newPkg.name,
          price: newPkg.price,
          lessons: newPkg.lessons,
          theoryLessons: newPkg.theoryLessons,
          status: newPkg.status,
          features: featuresFromMultiline(newPkg.featuresText),
          imageUrl: newPkg.imageUrl.trim() ? newPkg.imageUrl.trim() : null,
        },
      });
      setAddOpen(false);
      setNewPkg({ name: "", price: "", lessons: 10, theoryLessons: 0, featuresText: "", imageUrl: "", status: "active" });
      await refresh();
      showToast(t("packageCreatedToast"), "success");
    } catch {
      showToast(t("fillRequired"), "error");
    }
  };

  const filteredPackages = useMemo(() => {
    const q = search.trim().toLowerCase();
    return packages.filter((pkg) => {
      const hay = [
        pkg.id,
        pkg.name,
        pkg.price,
        String(pkg.lessons),
        String(pkg.theoryLessons),
        String(pkg.enrolled),
        pkg.status,
        pkg.features.join(" "),
        pkg.imageUrl ?? "",
      ]
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
              t("packageColImage"),
              t("adminColPrice"),
              t("adminPackageColPracticalLessons"),
              t("adminPackageColTheoryLessons"),
              t("adminColEnrolled"),
              t("adminColFeatures"),
              t("status"),
            ]}
            rows={filteredPackages.map((pkg) => [
              pkg.id,
              pkg.name,
              pkg.imageUrl ?? "—",
              `${pkg.price} ֏`,
              String(pkg.lessons),
              String(pkg.theoryLessons),
              String(pkg.enrolled),
              pkg.features.join(", ") || "—",
              t(pkg.status === "active" ? "active" : "inactive"),
            ])}
          />
        </DataTableToolbar>
        <AdminTableScroll>
          <table className="w-full text-sm min-w-[48rem]">
            <thead className="bg-muted/40">
              <tr>
                <TableColumnHeaderWithFilter title={t("tableColId")} />
                <TableColumnHeaderWithFilter title={t("name")} />
                <TableColumnHeaderWithFilter title={t("packageColImage")} />
                <TableColumnHeaderWithFilter title={t("adminColPrice")} />
                <TableColumnHeaderWithFilter title={t("adminPackageColPracticalLessons")} />
                <TableColumnHeaderWithFilter title={t("adminPackageColTheoryLessons")} />
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
                      onClick: () => openEdit(pkg),
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
                    <td className="px-4 py-3.5">
                      {pkg.imageUrl ? (
                        <img src={pkg.imageUrl} alt={pkg.name} className="h-10 w-[72px] rounded-md object-cover border border-border bg-muted" />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-foreground whitespace-nowrap">{pkg.price} ֏</td>
                    <td className="px-4 py-3.5 text-foreground whitespace-nowrap">{pkg.lessons}</td>
                    <td className="px-4 py-3.5 text-foreground whitespace-nowrap">{pkg.theoryLessons}</td>
                    <td className="px-4 py-3.5 text-foreground whitespace-nowrap">{pkg.enrolled}</td>
                    <td className="px-4 py-3.5 text-muted-foreground min-w-[240px]">{pkg.features.join(", ") || "—"}</td>
                    <td className="px-4 py-3.5">
                      <Badge
                        className={
                          pkg.status === "active"
                            ? "bg-emerald-100 text-emerald-700 text-xs"
                            : "bg-muted text-muted-foreground text-xs"
                        }
                      >
                        {t(pkg.status === "active" ? "active" : "inactive")}
                      </Badge>
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
                            onClick: () => openEdit(pkg),
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

      <AppModal
        open={!!editPkg}
        onOpenChange={(o) => {
          if (!o) {
            setEditPkg(null);
            setEditFeaturesText("");
          }
        }}
        title={t("packageDialogEditTitle")}
        contentClassName="max-w-md"
        footer={
          editPkg ? (
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setEditPkg(null);
                  setEditFeaturesText("");
                }}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" form={editPkgFormId} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">
                {t("save")}
              </Button>
            </div>
          ) : null
        }
      >
        {editPkg && (
          <form id={editPkgFormId} onSubmit={handleEdit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("name")}</label>
              <Input value={editPkg.name} onChange={(e) => setEditPkg({ ...editPkg, name: e.target.value })} className="h-10" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("packageLabelPriceDram")}</label>
              <Input value={editPkg.price} onChange={(e) => setEditPkg({ ...editPkg, price: e.target.value })} className="h-10" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("packageLabelLessonsCount")}</label>
              <Input type="number" value={editPkg.lessons} onChange={(e) => setEditPkg({ ...editPkg, lessons: +e.target.value })} className="h-10" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("packageLabelTheoryLessonsCount")}</label>
              <Input
                type="number"
                min={0}
                value={editPkg.theoryLessons}
                onChange={(e) => setEditPkg({ ...editPkg, theoryLessons: +e.target.value })}
                className="h-10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("packageLabelStatus")}</label>
              <select
                value={editPkg.status}
                onChange={(e) => setEditPkg({ ...editPkg, status: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="active">{t("active")}</option>
                <option value="inactive">{t("inactive")}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("packageLabelImageUrl")}</label>
              <Input
                value={editPkg.imageUrl ?? ""}
                onChange={(e) => setEditPkg({ ...editPkg, imageUrl: e.target.value || null })}
                placeholder={t("adminExamQuestionsImageUrlPlaceholder")}
                className="h-10"
              />
              <div className="flex flex-wrap gap-2 items-center mt-2">
                <input
                  ref={editPackageImageFileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                  className="sr-only"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    await applyUploadedPackageImage(file, (url) => setEditPkg((p) => (p ? { ...p, imageUrl: url } : p)));
                  }}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => editPackageImageFileRef.current?.click()}>
                  {t("adminExamQuestionsImagePickFile")}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{t("packageImageUrlHint")}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("packageLabelFeaturesLines")}</label>
              <Textarea
                value={editFeaturesText}
                onChange={(e) => setEditFeaturesText(e.target.value)}
                placeholder={t("packageFeaturesPlaceholder")}
                rows={5}
                className="min-h-[120px] resize-y"
              />
            </div>
          </form>
        )}
      </AppModal>

      <AppModal
        open={addOpen}
        onOpenChange={setAddOpen}
        title={t("packageDialogNewTitle")}
        contentClassName="max-w-md"
        footer={
          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" form={addPkgFormId} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">
              {t("addNew")}
            </Button>
          </div>
        }
      >
        <form id={addPkgFormId} onSubmit={handleAdd} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">{t("name")} *</label>
            <Input value={newPkg.name} onChange={(e) => setNewPkg({ ...newPkg, name: e.target.value })} placeholder={t("packagePlaceholderName")} className="h-10" />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">{t("packageLabelPriceDram")} *</label>
            <Input value={newPkg.price} onChange={(e) => setNewPkg({ ...newPkg, price: e.target.value })} placeholder={t("packagePlaceholderPrice")} className="h-10" />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">{t("packageLabelLessonsCount")}</label>
            <Input type="number" value={newPkg.lessons} onChange={(e) => setNewPkg({ ...newPkg, lessons: +e.target.value })} className="h-10" />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">{t("packageLabelTheoryLessonsCount")}</label>
            <Input
              type="number"
              min={0}
              value={newPkg.theoryLessons}
              onChange={(e) => setNewPkg({ ...newPkg, theoryLessons: +e.target.value })}
              className="h-10"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">{t("packageLabelStatus")}</label>
            <select
              value={newPkg.status}
              onChange={(e) => setNewPkg({ ...newPkg, status: e.target.value as "active" | "inactive" })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="active">{t("active")}</option>
              <option value="inactive">{t("inactive")}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">{t("packageLabelImageUrl")}</label>
            <Input
              value={newPkg.imageUrl}
              onChange={(e) => setNewPkg({ ...newPkg, imageUrl: e.target.value })}
              placeholder={t("adminExamQuestionsImageUrlPlaceholder")}
              className="h-10"
            />
            <div className="flex flex-wrap gap-2 items-center mt-2">
              <input
                ref={addPackageImageFileRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                className="sr-only"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  await applyUploadedPackageImage(file, (url) => setNewPkg((p) => ({ ...p, imageUrl: url })));
                }}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => addPackageImageFileRef.current?.click()}>
                {t("adminExamQuestionsImagePickFile")}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t("packageImageUrlHint")}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">{t("packageLabelFeaturesLines")}</label>
            <Textarea
              value={newPkg.featuresText}
              onChange={(e) => setNewPkg({ ...newPkg, featuresText: e.target.value })}
              placeholder={t("packageFeaturesPlaceholder")}
              rows={5}
              className="min-h-[120px] resize-y"
            />
          </div>
        </form>
      </AppModal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title={t("packageDeleteTitle")} description={t("packageDeleteDesc")} confirmLabel={t("delete")} danger />
    </AdminLayout>
  );
}
