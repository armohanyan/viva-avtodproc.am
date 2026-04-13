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
import PanelPageHeader from "src/components/PanelPageHeader";
import MultiSelectDropdown from "src/components/MultiSelectDropdown";
import { Plus, Edit2, Trash2, Calendar, School } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import type { Instructor } from "src/data/instructors";
import { vivaApiJson } from "src/lib/vivaApi";
import type { Branch } from "src/modules/branches";
import { branchNameById, branchOptionLabel, useBranches } from "src/modules/branches";
import type { City } from "src/modules/cities";
import { cityNameById, useCities } from "src/modules/cities";

type InstructorForm = Pick<
  Instructor,
  | "name"
  | "email"
  | "phone"
  | "years"
  | "schedule"
  | "teachesPractical"
  | "teachesTheory"
  | "status"
  | "availableBranchIds"
>;

const createNewInstructorDraft = (): InstructorForm => ({
  name: "",
  email: "",
  phone: "",
  years: 1,
  schedule: "Mon-Fri",
  teachesPractical: true,
  teachesTheory: false,
  status: "active",
  availableBranchIds: [],
});

function instructorServesCity(ins: Instructor, cityId: string, allBranches: readonly Branch[]): boolean {
  return ins.availableBranchIds.some((id) => allBranches.find((b) => b.id === id)?.cityId === cityId);
}

function formatInstructorCities(ins: Instructor, allBranches: readonly Branch[], citiesList: readonly City[]): string {
  const cityIds = new Set<string>();
  for (const id of ins.availableBranchIds) {
    const b = allBranches.find((x) => x.id === id);
    if (b) cityIds.add(b.cityId);
  }
  if (cityIds.size === 0) return "—";
  return [...cityIds].map((cid) => cityNameById(citiesList, cid)).join(", ");
}

function formatInstructorBranches(ins: Instructor, allBranches: readonly Branch[], citiesList: readonly City[]): string {
  if (ins.availableBranchIds.length === 0) return "—";
  return ins.availableBranchIds
    .map((id) => {
      const b = allBranches.find((x) => x.id === id);
      return b ? branchOptionLabel(b, cityNameById(citiesList, b.cityId)) : branchNameById(allBranches, id);
    })
    .join("; ");
}

export default function AdminInstructors() {
  const { t } = useLang();
  const { showToast } = useToast();
  const { branches } = useBranches();
  const { cities } = useCities();
  const [instructors, setInstructors] = useState<Instructor[]>([]);

  const loadInstructors = useCallback(async () => {
    try {
      const data = await vivaApiJson<Instructor[]>("/instructors");
      setInstructors(Array.isArray(data) ? data : []);
    } catch {
      setInstructors([]);
    }
  }, []);

  useEffect(() => {
    void loadInstructors();
  }, [loadInstructors]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [scheduleFilter, setScheduleFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState<"all" | string>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [teachingFilter, setTeachingFilter] = useState<"all" | "practical_only" | "theory_only" | "both">("all");
  const [newIns, setNewIns] = useState<InstructorForm>(createNewInstructorDraft());

  const editIns = editId ? instructors.find((i) => i.id === editId) ?? null : null;
  const scheduleOptions = Array.from(new Set(instructors.map((i) => i.schedule)));

  const teachingFilterMatch = (ins: Instructor) => {
    if (teachingFilter === "all") return true;
    if (teachingFilter === "practical_only") return ins.teachesPractical && !ins.teachesTheory;
    if (teachingFilter === "theory_only") return ins.teachesTheory && !ins.teachesPractical;
    return ins.teachesPractical && ins.teachesTheory;
  };

  const filteredInstructors = instructors.filter((ins) => {
    const q = search.trim().toLowerCase();
    const teachingLabels = [
      ins.teachesPractical ? t("instructorTeachingPractical") : "",
      ins.teachesTheory ? t("instructorTeachingTheory") : "",
    ]
      .filter(Boolean)
      .join(" ");
    const branchHay = ins.availableBranchIds.map((id) => branchNameById(branches, id)).join(" ");
    const citiesHay = formatInstructorCities(ins, branches, cities);
    const hay = [
      ins.name,
      ins.email,
      ins.phone,
      ins.schedule,
      ins.status,
      teachingLabels,
      citiesHay,
      branchHay,
      String(ins.years),
      String(ins.rating),
    ]
      .join(" ")
      .toLowerCase();
    const matchesSearch = !q || hay.includes(q);
    const matchesStatus = statusFilter === "all" || ins.status === statusFilter;
    const matchesSchedule = scheduleFilter === "all" || ins.schedule === scheduleFilter;
    const matchesCity = cityFilter === "all" || instructorServesCity(ins, cityFilter, branches);
    return (
      matchesSearch &&
      matchesStatus &&
      matchesSchedule &&
      matchesCity &&
      teachingFilterMatch(ins)
    );
  });

  const instructorStatusLabel = (s: string) => (s === "active" ? t("active") : t("inactive"));

  const validateInstructor = (ins: InstructorForm) => {
    if (!ins.name || !ins.email) return t("fillRequired");
    if (!ins.teachesPractical && !ins.teachesTheory) return t("instructorTeachingRequired");
    if (ins.teachesPractical && branches.length > 0) {
      const allowed = new Set(branches.map((b) => b.id));
      const picked = ins.availableBranchIds ?? [];
      if (picked.length === 0 || picked.some((id) => !allowed.has(id))) {
        return t("instructorBranchesRequired");
      }
    }
    return "";
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await vivaApiJson(`/instructors/${encodeURIComponent(deleteId)}`, { method: "DELETE" });
      setDeleteId(null);
      await loadInstructors();
      showToast(t("instructorDeleted"), "success");
    } catch {
      showToast(t("fillRequired"), "error");
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editIns) return;

    const error = validateInstructor(editIns);
    if (error) {
      showToast(error, "error");
      return;
    }

    try {
      await vivaApiJson(`/instructors/${encodeURIComponent(editIns.id)}`, {
        method: "PATCH",
        body: {
          name: editIns.name,
          email: editIns.email,
          phone: editIns.phone,
          years: editIns.years,
          rating: editIns.rating,
          hourlyPrice: editIns.hourlyPrice,
          status: editIns.status,
          schedule: editIns.schedule,
          location: editIns.location,
          car: editIns.car,
          transmission: editIns.transmission,
          imageSrc: editIns.imageSrc,
          availableBranchIds: editIns.availableBranchIds,
          teachesPractical: editIns.teachesPractical,
          teachesTheory: editIns.teachesTheory,
        },
      });
      setEditId(null);
      await loadInstructors();
      showToast(t("instructorUpdatedToast"), "success");
    } catch {
      showToast(t("fillRequired"), "error");
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateInstructor(newIns);
    if (error) {
      showToast(error, "error");
      return;
    }

    const firstCityName =
      newIns.availableBranchIds[0] != null
        ? cityNameById(cities, branches.find((b) => b.id === newIns.availableBranchIds[0])?.cityId ?? "")
        : "";
    const nextPayload: Omit<Instructor, "id"> = {
      ...newIns,
      rating: 5.0,
      hourlyPrice: 7000,
      location: firstCityName || "Yerevan",
      car: "Toyota Corolla",
      transmission: "Manual",
      imageSrc: "/logo.jpg",
    };

    try {
      await vivaApiJson("/instructors", { method: "POST", body: nextPayload });
      setAddOpen(false);
      setNewIns(createNewInstructorDraft());
      await loadInstructors();
      showToast(t("instructorAddedToast"), "success");
    } catch {
      showToast(t("fillRequired"), "error");
    }
  };

  const updateEdit = (id: string, patch: Partial<Instructor>) => {
    setInstructors((items) => items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  };

  return (
    <AdminLayout>
      <PanelPageHeader
        icon={School}
        title={t("instructors")}
        subtitle={t("adminInstructorsPageSubtitle")}
        actions={
          <Button onClick={() => setAddOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
            <Plus className="w-4 h-4" />
            {t("addNew")}
          </Button>
        }
      />

      <div className="rounded-xl border border-border bg-card overflow-hidden min-w-0">
        <DataTableToolbar value={search} onChange={setSearch} placeholder={`${t("search")}...`}>
          <div className="flex flex-wrap gap-2 items-center">
            {["all", "active", "inactive"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s as "all" | "active" | "inactive")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize ${
                  statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "border-input text-muted-foreground hover:border-primary/40"
                }`}
              >
                {s === "all" ? t("filterOptionAll") : t(s as "active" | "inactive")}
              </button>
            ))}
            <select
              value={scheduleFilter}
              onChange={(e) => setScheduleFilter(e.target.value)}
              className="h-9 rounded-lg border border-input bg-background px-3 text-xs text-foreground min-w-[8rem]"
              aria-label={t("filter")}
            >
              <option value="all">{t("filterOptionAll")}</option>
              {scheduleOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value as "all" | string)}
              className="h-9 rounded-lg border border-input bg-background px-3 text-xs text-foreground min-w-[10rem]"
              aria-label={t("instructorCitiesLabel")}
            >
              <option value="all">{t("filterOptionAll")}</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              value={teachingFilter}
              onChange={(e) => setTeachingFilter(e.target.value as typeof teachingFilter)}
              className="h-9 rounded-lg border border-input bg-background px-3 text-xs text-foreground min-w-[10rem]"
              aria-label={t("adminInstructorColTeachingType")}
            >
              <option value="all">{t("instructorFilterTeachingAll")}</option>
              <option value="practical_only">{t("instructorFilterTeachingPracticalOnly")}</option>
              <option value="theory_only">{t("instructorFilterTeachingTheoryOnly")}</option>
              <option value="both">{t("instructorFilterTeachingBoth")}</option>
            </select>
            <CsvExportButton
              filename="admin-instructors.csv"
              headers={[
                t("adminInstructorColInstructor"),
                t("emailAddress"),
                t("adminInstructorColTeachingType"),
                t("instructorCitiesLabel"),
                t("instructorBranchesLabel"),
                t("phone"),
                t("cohortColSchedule"),
                t("adminInstructorColRating"),
                t("adminInstructorColExperience"),
                t("status"),
              ]}
              rows={filteredInstructors.map((ins) => [
                ins.name,
                ins.email,
                [ins.teachesPractical ? t("instructorTeachingPractical") : "", ins.teachesTheory ? t("instructorTeachingTheory") : ""]
                  .filter(Boolean)
                  .join(" + ") || "-",
                formatInstructorCities(ins, branches, cities),
                formatInstructorBranches(ins, branches, cities),
                ins.phone,
                ins.schedule,
                ins.rating.toFixed(1),
                `${ins.years} ${t("adminInstructorYearsShort")}`,
                instructorStatusLabel(ins.status),
              ])}
            />
          </div>
        </DataTableToolbar>
        <AdminTableScroll>
          <table className="w-full text-sm min-w-[64rem]">
            <thead className="bg-muted/40">
              <tr>
                {[
                  t("adminInstructorColInstructor"),
                  t("adminInstructorColTeachingType"),
                  t("instructorCitiesLabel"),
                  t("instructorBranchesLabel"),
                  t("phone"),
                  t("cohortColSchedule"),
                  t("adminInstructorColRating"),
                  t("adminInstructorColExperience"),
                  t("status"),
                  t("actions"),
                ].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredInstructors.map((ins) => (
                <AdminTableRowContextMenu
                  key={ins.id}
                  actions={[
                    {
                      kind: "item",
                      id: "edit",
                      label: t("edit"),
                      icon: Edit2,
                      onClick: () => setEditId(ins.id),
                    },
                    {
                      kind: "item",
                      id: "schedule",
                      label: t("ariaScheduleButton"),
                      ariaLabel: t("ariaScheduleButton"),
                      icon: Calendar,
                      onClick: () => showToast(`${ins.name} - ${t("instructorScheduleSoonToast")}`, "info"),
                    },
                    {
                      kind: "item",
                      id: "delete",
                      label: t("delete"),
                      icon: Trash2,
                      destructive: true,
                      onClick: () => setDeleteId(ins.id),
                    },
                  ]}
                >
                  <tr className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3.5 min-w-[220px]">
                      <p className="font-medium text-foreground">{ins.name}</p>
                      <p className="text-xs text-muted-foreground">{ins.email}</p>
                    </td>
                    <td className="px-4 py-3.5 align-top">
                      <div className="flex flex-wrap gap-1 max-w-[220px]">
                        {ins.teachesPractical && (
                          <Badge variant="secondary" className="text-[10px] font-medium">
                            {t("instructorTeachingPractical")}
                          </Badge>
                        )}
                        {ins.teachesTheory && (
                          <Badge variant="outline" className="text-[10px] font-medium border-primary/30 text-primary">
                            {t("instructorTeachingTheory")}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground max-w-[12rem] text-sm">{formatInstructorCities(ins, branches, cities)}</td>
                    <td className="px-4 py-3.5 text-muted-foreground max-w-[14rem] text-xs leading-snug">
                      {formatInstructorBranches(ins, branches, cities)}
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">{ins.phone}</td>
                    <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">{ins.schedule}</td>
                    <td className="px-4 py-3.5 text-foreground whitespace-nowrap">{ins.rating.toFixed(1)}</td>
                    <td className="px-4 py-3.5 text-foreground whitespace-nowrap">
                      {ins.years} {t("adminInstructorYearsShort")}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge className={`text-xs ${ins.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {instructorStatusLabel(ins.status)}
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
                            onClick: () => setEditId(ins.id),
                          },
                          {
                            kind: "item",
                            id: "schedule",
                            label: t("ariaScheduleButton"),
                            ariaLabel: t("ariaScheduleButton"),
                            icon: Calendar,
                            onClick: () => showToast(`${ins.name} - ${t("instructorScheduleSoonToast")}`, "info"),
                          },
                          {
                            kind: "item",
                            id: "delete",
                            label: t("delete"),
                            icon: Trash2,
                            destructive: true,
                            onClick: () => setDeleteId(ins.id),
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
          {t("panelShowingLabel")} {filteredInstructors.length} / {instructors.length} {t("adminTableInstructorsFooter")}
        </div>
      </div>

      <Dialog open={editId !== null} onOpenChange={() => setEditId(null)}>
        <DialogContent className="max-w-lg max-h-[min(90vh,720px)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("instructorDialogEditTitle")}</DialogTitle>
          </DialogHeader>
          {editIns && (
            <form onSubmit={handleEdit} className="space-y-3 mt-2">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("blogFieldCoverImage")}</label>
                <Input
                  value={editIns.imageSrc}
                  onChange={(e) => updateEdit(editIns.id, { imageSrc: e.target.value })}
                  placeholder="/logo.jpg"
                  className="h-10"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("name")}</label>
                <Input value={editIns.name} onChange={(e) => updateEdit(editIns.id, { name: e.target.value })} className="h-10" />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("emailAddress")}</label>
                <Input value={editIns.email} onChange={(e) => updateEdit(editIns.id, { email: e.target.value })} className="h-10" />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("phoneNumber")}</label>
                <Input value={editIns.phone} onChange={(e) => updateEdit(editIns.id, { phone: e.target.value })} className="h-10" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">{t("labelYearsExperienceShort")}</label>
                  <Input type="number" value={editIns.years} onChange={(e) => updateEdit(editIns.id, { years: +e.target.value || 1 })} className="h-10" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">{t("cohortColSchedule")}</label>
                  <Input value={editIns.schedule} onChange={(e) => updateEdit(editIns.id, { schedule: e.target.value })} className="h-10" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">{t("ratingDisplayLabel")}</label>
                  <Input
                    type="number"
                    step="0.1"
                    min={0}
                    max={5}
                    value={editIns.rating}
                    onChange={(e) => updateEdit(editIns.id, { rating: Math.min(5, Math.max(0, +e.target.value || 0)) })}
                    className="h-10"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">{t("hourlyRateLabel")}</label>
                  <Input
                    type="number"
                    min={0}
                    value={editIns.hourlyPrice}
                    onChange={(e) => updateEdit(editIns.id, { hourlyPrice: +e.target.value || 0 })}
                    className="h-10"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("location")}</label>
                <Input value={editIns.location} onChange={(e) => updateEdit(editIns.id, { location: e.target.value })} className="h-10" />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("carColModel")}</label>
                <Input value={editIns.car} onChange={(e) => updateEdit(editIns.id, { car: e.target.value })} className="h-10" />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("carColTransmission")}</label>
                <select
                  value={editIns.transmission === "Automatic" ? "Automatic" : "Manual"}
                  onChange={(e) => updateEdit(editIns.id, { transmission: e.target.value })}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="Manual">{t("transmissionManual")}</option>
                  <option value="Automatic">{t("transmissionAutomatic")}</option>
                </select>
              </div>
              <div>
                <p className="block text-sm font-medium text-muted-foreground mb-1.5">{t("instructorTeachingFormLabel")}</p>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2.5 cursor-pointer text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={editIns.teachesPractical}
                      onChange={() => updateEdit(editIns.id, { teachesPractical: !editIns.teachesPractical })}
                      className="h-4 w-4 rounded border-input accent-primary"
                    />
                    {t("instructorTeachingPractical")}
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer text-sm text-foreground">
                    <input
                      type="checkbox"
                      checked={editIns.teachesTheory}
                      onChange={() => updateEdit(editIns.id, { teachesTheory: !editIns.teachesTheory })}
                      className="h-4 w-4 rounded border-input accent-primary"
                    />
                    {t("instructorTeachingTheory")}
                  </label>
                </div>
              </div>
              {branches.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">{t("instructorBranchesLabel")}</label>
                  <MultiSelectDropdown
                    options={branches.map((b) => ({
                      value: b.id,
                      label: branchOptionLabel(b, cityNameById(cities, b.cityId)),
                    }))}
                    value={editIns.availableBranchIds ?? []}
                    onChange={(nextIds) =>
                      updateEdit(editIns.id, {
                        availableBranchIds: nextIds as string[],
                      })
                    }
                    placeholder={t("instructorBranchesLabel")}
                    ariaLabel={t("instructorBranchesLabel")}
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("status")}</label>
                <select
                  value={editIns.status}
                  onChange={(e) => updateEdit(editIns.id, { status: e.target.value as "active" | "inactive" })}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="active">{t("active")}</option>
                  <option value="inactive">{t("inactive")}</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setEditId(null)}>
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
            <DialogTitle>{t("instructorDialogAddTitle")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-3 mt-2">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("name")} *</label>
              <Input value={newIns.name} onChange={(e) => setNewIns({ ...newIns, name: e.target.value })} placeholder={t("placeholderFullName")} className="h-10" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("emailAddress")} *</label>
              <Input type="email" value={newIns.email} onChange={(e) => setNewIns({ ...newIns, email: e.target.value })} placeholder="name@vivadrive.am" className="h-10" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("phoneNumber")}</label>
              <Input value={newIns.phone} onChange={(e) => setNewIns({ ...newIns, phone: e.target.value })} placeholder="+374 99 000 000" className="h-10" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("labelYearsExperienceShort")}</label>
                <Input type="number" value={newIns.years} onChange={(e) => setNewIns({ ...newIns, years: +e.target.value || 1 })} className="h-10" />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("cohortColSchedule")}</label>
                <Input value={newIns.schedule} onChange={(e) => setNewIns({ ...newIns, schedule: e.target.value })} className="h-10" />
              </div>
            </div>
            <div>
              <p className="block text-sm font-medium text-muted-foreground mb-1.5">{t("instructorTeachingFormLabel")}</p>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2.5 cursor-pointer text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={newIns.teachesPractical}
                    onChange={() => setNewIns((s) => ({ ...s, teachesPractical: !s.teachesPractical }))}
                    className="h-4 w-4 rounded border-input accent-primary"
                  />
                  {t("instructorTeachingPractical")}
                </label>
                <label className="flex items-center gap-2.5 cursor-pointer text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={newIns.teachesTheory}
                    onChange={() => setNewIns((s) => ({ ...s, teachesTheory: !s.teachesTheory }))}
                    className="h-4 w-4 rounded border-input accent-primary"
                  />
                  {t("instructorTeachingTheory")}
                </label>
              </div>
            </div>
            {branches.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("instructorBranchesLabel")}</label>
                <MultiSelectDropdown
                  options={branches.map((b) => ({
                    value: b.id,
                    label: branchOptionLabel(b, cityNameById(cities, b.cityId)),
                  }))}
                  value={newIns.availableBranchIds ?? []}
                  onChange={(nextIds) =>
                    setNewIns({
                      ...newIns,
                      availableBranchIds: nextIds as string[],
                    })
                  }
                  placeholder={t("instructorBranchesLabel")}
                  ariaLabel={t("instructorBranchesLabel")}
                />
              </div>
            )}
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

      <ConfirmDialog open={deleteId !== null} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title={t("instructorRemoveTitle")} description={t("instructorRemoveDesc")} confirmLabel={t("delete")} danger />
    </AdminLayout>
  );
}
