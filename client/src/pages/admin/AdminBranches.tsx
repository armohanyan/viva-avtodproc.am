import AdminLayout from "src/components/AdminLayout";
import AdminTableScroll from "src/components/AdminTableScroll";
import AdminTableRowActions, { AdminTableRowContextMenu } from "src/components/AdminTableRowActions";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import { AppModal } from "src/components/AppModal";
import ConfirmDialog from "src/components/ConfirmDialog";
import DataTableToolbar from "src/components/DataTableToolbar";
import CsvExportButton from "src/components/CsvExportButton";
import PanelPageHeader from "src/components/PanelPageHeader";
import { Plus, Edit2, Trash2, MapPin, Building2 } from "lucide-react";
import { useId, useMemo, useState } from "react";
import type { Branch } from "src/modules/branches";
import { useBranches } from "src/modules/branches";
import type { City } from "src/modules/cities";
import { cityNameById, DEFAULT_PRIMARY_CITY_ID, useCities } from "src/modules/cities";

export default function AdminBranches() {
  const editCityFormId = useId();
  const addCityListFormId = useId();
  const editBranchFormId = useId();
  const addBranchFormId = useId();
  const cityQuickAddFormId = useId();
  const { t } = useLang();
  const { showToast } = useToast();
  const { branches, addBranch, updateBranch, removeBranch } = useBranches();
  const { cities, addCity, updateCity, removeCity } = useCities();

  const [branchSearch, setBranchSearch] = useState("");
  const [deleteBranchId, setDeleteBranchId] = useState<string | null>(null);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [addBranchOpen, setAddBranchOpen] = useState(false);
  const [newBranch, setNewBranch] = useState({
    name: "",
    cityId: DEFAULT_PRIMARY_CITY_ID,
    mapUrl: "",
    phone: "",
    email: "",
    workHours: "",
  });

  const [citySearch, setCitySearch] = useState("");
  const [deleteCityId, setDeleteCityId] = useState<string | null>(null);
  const [editCity, setEditCity] = useState<City | null>(null);
  const [cityListAddOpen, setCityListAddOpen] = useState(false);
  const [newCityName, setNewCityName] = useState("");

  const [cityQuickAddOpen, setCityQuickAddOpen] = useState(false);
  const [cityQuickAddName, setCityQuickAddName] = useState("");
  const [cityQuickAddFor, setCityQuickAddFor] = useState<"edit" | "new">("new");

  const filteredCities = useMemo(() => {
    const q = citySearch.trim().toLowerCase();
    return cities.filter((c) => {
      const hay = [c.name, c.id].join(" ").toLowerCase();
      return !q || hay.includes(q);
    });
  }, [cities, citySearch]);

  const filteredBranches = useMemo(() => {
    const q = branchSearch.trim().toLowerCase();
    return branches.filter((b) => {
      const cityLabel = cityNameById(cities, b.cityId);
      const hay = [b.name, b.cityId, cityLabel, b.mapUrl, b.phone, b.email, b.workHours].filter(Boolean).join(" ").toLowerCase();
      return !q || hay.includes(q);
    });
  }, [branches, cities, branchSearch]);

  const handleDeleteBranch = async () => {
    if (!deleteBranchId) return;
    if (branches.length <= 1) {
      showToast(t("branchDeleteNeedOneToast"), "error");
      setDeleteBranchId(null);
      return;
    }
    try {
      await removeBranch(deleteBranchId);
      setDeleteBranchId(null);
      showToast(t("branchDeletedToast"), "success");
    } catch {
      showToast(t("fillRequired"), "error");
    }
  };

  const handleDeleteCity = async () => {
    if (!deleteCityId) return;
    if (branches.some((b) => b.cityId === deleteCityId)) {
      showToast(t("cityDeleteBlockedByBranchesToast"), "error");
      setDeleteCityId(null);
      return;
    }
    if (cities.length <= 1) {
      showToast(t("cityDeleteNeedOneToast"), "error");
      setDeleteCityId(null);
      return;
    }
    try {
      await removeCity(deleteCityId);
      setDeleteCityId(null);
      showToast(t("cityDeletedToast"), "success");
    } catch {
      showToast(t("fillRequired"), "error");
    }
  };

  const handleEditBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBranch) return;
    if (!editBranch.name.trim() || !editBranch.mapUrl.trim()) {
      showToast(t("fillRequired"), "error");
      return;
    }
    if (!cities.some((c) => c.id === editBranch.cityId)) {
      showToast(t("branchCityInvalidToast"), "error");
      return;
    }
    try {
      await updateBranch(editBranch.id, {
        name: editBranch.name.trim(),
        cityId: editBranch.cityId,
        mapUrl: editBranch.mapUrl.trim(),
        phone: editBranch.phone?.trim() || undefined,
        email: editBranch.email?.trim() || undefined,
        workHours: editBranch.workHours?.trim() || undefined,
      });
      setEditBranch(null);
      showToast(t("branchUpdatedToast"), "success");
    } catch {
      showToast(t("fillRequired"), "error");
    }
  };

  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranch.name.trim() || !newBranch.mapUrl.trim()) {
      showToast(t("fillRequired"), "error");
      return;
    }
    if (!cities.some((c) => c.id === newBranch.cityId)) {
      showToast(t("branchCityInvalidToast"), "error");
      return;
    }
    try {
      await addBranch({
        name: newBranch.name.trim(),
        cityId: newBranch.cityId,
        mapUrl: newBranch.mapUrl.trim(),
        phone: newBranch.phone.trim() || undefined,
        email: newBranch.email.trim() || undefined,
        workHours: newBranch.workHours.trim() || undefined,
      });
      setAddBranchOpen(false);
      setNewBranch({
        name: "",
        cityId: cities[0]?.id ?? DEFAULT_PRIMARY_CITY_ID,
        mapUrl: "",
        phone: "",
        email: "",
        workHours: "",
      });
      showToast(t("branchCreatedToast"), "success");
    } catch {
      showToast(t("fillRequired"), "error");
    }
  };

  const handleEditCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCity) return;
    if (!editCity.name.trim()) {
      showToast(t("fillRequired"), "error");
      return;
    }
    try {
      await updateCity(editCity.id, { name: editCity.name.trim() });
      setEditCity(null);
      showToast(t("cityUpdatedToast"), "success");
    } catch {
      showToast(t("fillRequired"), "error");
    }
  };

  const handleAddCityFromList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCityName.trim()) {
      showToast(t("fillRequired"), "error");
      return;
    }
    try {
      await addCity({ name: newCityName.trim() });
      setCityListAddOpen(false);
      setNewCityName("");
      showToast(t("cityCreatedToast"), "success");
    } catch {
      showToast(t("fillRequired"), "error");
    }
  };

  const handleQuickAddCity = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = cityQuickAddName.trim();
    if (!name) {
      showToast(t("fillRequired"), "error");
      return;
    }
    try {
      const newId = await addCity({ name });
      if (cityQuickAddFor === "edit" && editBranch) {
        setEditBranch({ ...editBranch, cityId: newId });
      } else {
        setNewBranch((b) => ({ ...b, cityId: newId }));
      }
      setCityQuickAddOpen(false);
      setCityQuickAddName("");
      showToast(t("cityCreatedToast"), "success");
    } catch {
      showToast(t("fillRequired"), "error");
    }
  };

  const cityFieldFooter = (which: "edit" | "new") => (
    <p className="text-xs text-muted-foreground mt-1.5">
      <button
        type="button"
        className="text-primary font-medium hover:underline"
        onClick={() => {
          setCityQuickAddFor(which);
          setCityQuickAddOpen(true);
        }}
      >
        {t("branchQuickAddCityLink")}
      </button>
    </p>
  );

  return (
    <AdminLayout>
      <PanelPageHeader icon={MapPin} title={t("adminSidebarBranches")} subtitle={t("adminBranchesPageSubtitle")} />

      <div className="rounded-xl border border-border bg-card overflow-hidden min-w-0 mb-8">
        <div className="px-4 py-3 border-b border-border bg-muted/30 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="w-4 h-4 text-primary shrink-0" />
            <h3 className="text-sm font-semibold text-foreground">{t("adminBranchesCitiesSectionTitle")}</h3>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => setCityListAddOpen(true)}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shrink-0 sm:w-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            {t("cityNewTitle")}
          </Button>
        </div>
        <DataTableToolbar value={citySearch} onChange={setCitySearch} placeholder={`${t("search")}…`}>
          <CsvExportButton
            filename="admin-cities.csv"
            headers={[t("name"), t("cityIdCol")]}
            rows={filteredCities.map((c) => [c.name, c.id])}
          />
        </DataTableToolbar>
        <AdminTableScroll>
          <table className="w-full text-sm min-w-[32rem]">
            <thead className="bg-muted/40">
              <tr>
                {[t("name"), t("cityIdCol"), t("actions")].map((h) => (
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
              {filteredCities.map((c) => (
                <AdminTableRowContextMenu
                  key={c.id}
                  actions={[
                    {
                      kind: "item",
                      id: "edit",
                      label: t("edit"),
                      icon: Edit2,
                      onClick: () => setEditCity({ ...c }),
                    },
                    {
                      kind: "item",
                      id: "delete",
                      label: t("delete"),
                      icon: Trash2,
                      destructive: true,
                      onClick: () => setDeleteCityId(c.id),
                    },
                  ]}
                >
                  <tr className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3.5 font-medium text-foreground min-w-[200px]">
                      <span className="inline-flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                        {c.name}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground font-mono">{c.id}</td>
                    <td className="px-4 py-3.5">
                      <AdminTableRowActions
                        toolbarOnly
                        actions={[
                          {
                            kind: "item",
                            id: "edit",
                            label: t("edit"),
                            icon: Edit2,
                            onClick: () => setEditCity({ ...c }),
                          },
                          {
                            kind: "item",
                            id: "delete",
                            label: t("delete"),
                            icon: Trash2,
                            destructive: true,
                            onClick: () => setDeleteCityId(c.id),
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
          {filteredCities.length} / {cities.length}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden min-w-0">
        <div className="px-4 py-3 border-b border-border bg-muted/30 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <MapPin className="w-4 h-4 text-primary shrink-0" />
            <h3 className="text-sm font-semibold text-foreground">{t("adminBranchesBranchesSectionTitle")}</h3>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => setAddBranchOpen(true)}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shrink-0 sm:w-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            {t("branchNewTitle")}
          </Button>
        </div>
        <DataTableToolbar value={branchSearch} onChange={setBranchSearch} placeholder={`${t("search")}…`}>
          <CsvExportButton
            filename="admin-branches.csv"
            headers={[
              t("branchAddressLabel"),
              t("branchCityLabel"),
              t("phone"),
              t("email"),
              t("workHours"),
              t("branchMapEmbedUrl"),
            ]}
            rows={filteredBranches.map((b) => [
              b.name,
              cityNameById(cities, b.cityId),
              b.phone ?? "—",
              b.email ?? "—",
              b.workHours ?? "—",
              b.mapUrl,
            ])}
          />
        </DataTableToolbar>
        <AdminTableScroll>
          <table className="w-full text-sm min-w-[48rem]">
            <thead className="bg-muted/40">
              <tr>
                {[t("branchAddressLabel"), t("branchCityLabel"), t("phone"), t("email"), t("workHours"), t("branchMapEmbedUrl"), t("actions")].map((h) => (
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
              {filteredBranches.map((b) => (
                <AdminTableRowContextMenu
                  key={b.id}
                  actions={[
                    {
                      kind: "item",
                      id: "edit",
                      label: t("edit"),
                      icon: Edit2,
                      onClick: () => setEditBranch({ ...b }),
                    },
                    {
                      kind: "item",
                      id: "delete",
                      label: t("delete"),
                      icon: Trash2,
                      destructive: true,
                      onClick: () => setDeleteBranchId(b.id),
                    },
                  ]}
                >
                  <tr className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3.5 font-medium text-foreground min-w-[200px]">
                      <span className="inline-flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                        {b.name}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap max-w-[10rem] truncate">
                      {cityNameById(cities, b.cityId)}
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap max-w-[10rem] truncate">{b.phone ?? "—"}</td>
                    <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap max-w-[12rem] truncate">{b.email ?? "—"}</td>
                    <td className="px-4 py-3.5 text-muted-foreground max-w-[14rem] truncate">{b.workHours ?? "—"}</td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground font-mono max-w-[180px] truncate" title={b.mapUrl}>
                      {b.mapUrl}
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
                            onClick: () => setEditBranch({ ...b }),
                          },
                          {
                            kind: "item",
                            id: "delete",
                            label: t("delete"),
                            icon: Trash2,
                            destructive: true,
                            onClick: () => setDeleteBranchId(b.id),
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
          {filteredBranches.length} / {branches.length}
        </div>
      </div>

      <AppModal
        open={!!editCity}
        onOpenChange={(o) => !o && setEditCity(null)}
        title={t("cityEditTitle")}
        contentClassName="max-w-md max-h-[90vh]"
        footer={
          editCity ? (
            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setEditCity(null)}>
                {t("cancel")}
              </Button>
              <Button type="submit" form={editCityFormId} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">
                {t("save")}
              </Button>
            </div>
          ) : null
        }
      >
        {editCity && (
          <form id={editCityFormId} onSubmit={handleEditCity} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("name")} *</label>
              <Input value={editCity.name} onChange={(e) => setEditCity({ ...editCity, name: e.target.value })} className="h-10" />
            </div>
            <p className="text-xs text-muted-foreground">{t("cityIdReadonlyHint")}</p>
          </form>
        )}
      </AppModal>

      <AppModal
        open={cityListAddOpen}
        onOpenChange={setCityListAddOpen}
        title={t("cityNewTitle")}
        contentClassName="max-w-md"
        footer={
          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setCityListAddOpen(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" form={addCityListFormId} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">
              {t("addNew")}
            </Button>
          </div>
        }
      >
        <form id={addCityListFormId} onSubmit={handleAddCityFromList} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">{t("name")} *</label>
            <Input
              value={newCityName}
              onChange={(e) => setNewCityName(e.target.value)}
              className="h-10"
              placeholder={t("cityNamePlaceholder")}
            />
          </div>
        </form>
      </AppModal>

      <AppModal
        open={!!editBranch}
        onOpenChange={(o) => !o && setEditBranch(null)}
        title={t("branchEditTitle")}
        contentClassName="max-w-md max-h-[min(90vh,720px)]"
        footer={
          editBranch ? (
            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setEditBranch(null)}>
                {t("cancel")}
              </Button>
              <Button type="submit" form={editBranchFormId} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">
                {t("save")}
              </Button>
            </div>
          ) : null
        }
      >
        {editBranch && (
          <form id={editBranchFormId} onSubmit={handleEditBranch} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("branchCityLabel")} *</label>
                <select
                  value={editBranch.cityId}
                  onChange={(e) => setEditBranch({ ...editBranch, cityId: e.target.value })}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {cityFieldFooter("edit")}
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("branchAddressLabel")} *</label>
                <Input
                  value={editBranch.name}
                  onChange={(e) => setEditBranch({ ...editBranch, name: e.target.value })}
                  className="h-10"
                  placeholder={t("branchAddressPlaceholder")}
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
          </form>
        )}
      </AppModal>

      <AppModal
        open={addBranchOpen}
        onOpenChange={setAddBranchOpen}
        title={t("branchNewTitle")}
        contentClassName="max-w-md max-h-[min(90vh,720px)]"
        footer={
          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setAddBranchOpen(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" form={addBranchFormId} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">
              {t("addNew")}
            </Button>
          </div>
        }
      >
        <form id={addBranchFormId} onSubmit={handleAddBranch} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("branchCityLabel")} *</label>
              <select
                value={newBranch.cityId}
                onChange={(e) => setNewBranch({ ...newBranch, cityId: e.target.value })}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {cityFieldFooter("new")}
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("branchAddressLabel")} *</label>
              <Input
                value={newBranch.name}
                onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
                className="h-10"
                placeholder={t("branchAddressPlaceholder")}
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
              <Input value={newBranch.phone} onChange={(e) => setNewBranch({ ...newBranch, phone: e.target.value })} className="h-10" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("email")}</label>
              <Input value={newBranch.email} onChange={(e) => setNewBranch({ ...newBranch, email: e.target.value })} className="h-10" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("workHours")}</label>
              <Input value={newBranch.workHours} onChange={(e) => setNewBranch({ ...newBranch, workHours: e.target.value })} className="h-10" />
            </div>
        </form>
      </AppModal>

      <AppModal
        open={cityQuickAddOpen}
        onOpenChange={setCityQuickAddOpen}
        title={t("cityQuickAddTitle")}
        contentClassName="max-w-sm"
        footer={
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setCityQuickAddOpen(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" form={cityQuickAddFormId} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">
              {t("addNew")}
            </Button>
          </div>
        }
      >
        <form id={cityQuickAddFormId} onSubmit={handleQuickAddCity} className="space-y-3">
          <p className="text-xs text-muted-foreground">{t("cityQuickAddHint")}</p>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">{t("name")} *</label>
            <Input
              value={cityQuickAddName}
              onChange={(e) => setCityQuickAddName(e.target.value)}
              className="h-10"
              placeholder={t("cityNamePlaceholder")}
              autoFocus
            />
          </div>
        </form>
      </AppModal>

      <ConfirmDialog
        open={!!deleteBranchId}
        onClose={() => setDeleteBranchId(null)}
        onConfirm={handleDeleteBranch}
        title={t("branchDeleteConfirmTitle")}
        description={t("branchDeleteConfirmDesc")}
        confirmLabel={t("delete")}
        danger
      />

      <ConfirmDialog
        open={!!deleteCityId}
        onClose={() => setDeleteCityId(null)}
        onConfirm={handleDeleteCity}
        title={t("cityDeleteConfirmTitle")}
        description={t("cityDeleteConfirmDesc")}
        confirmLabel={t("delete")}
        danger
      />
    </AdminLayout>
  );
}
