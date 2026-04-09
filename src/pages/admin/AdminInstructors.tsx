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
import { useState } from "react";
import { instructors as initialInstructors, type Instructor } from "src/data/instructors";
import {
  ARMENIA_REGIONS,
  YEREVAN_DISTRICTS,
  PRACTICAL_LESSON_TYPES,
  getRegionLabel,
  getYerevanDistrictLabel,
  getLessonTypeLabel,
  type ArmeniaRegion,
  type YerevanDistrict,
  type PracticalLessonType,
} from "src/modules/instructors/instructor-booking";
import { createInstructor, updateInstructor } from "src/modules/instructors/instructor.api";

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
  | "availableRegions"
  | "availableYerevanDistricts"
  | "lessonTypes"
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
  availableRegions: [],
  availableYerevanDistricts: [],
  lessonTypes: [],
});

function renderRegions(regions: ArmeniaRegion[]): string {
  return regions.map(getRegionLabel).join(", ");
}

function renderLessonTypes(types: PracticalLessonType[]): string {
  return types.map(getLessonTypeLabel).join(", ");
}

export default function AdminInstructors() {
  const { t } = useLang();
  const { showToast } = useToast();
  const [instructors, setInstructors] = useState(initialInstructors);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [scheduleFilter, setScheduleFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState<"all" | ArmeniaRegion>("all");
  const [lessonTypeFilter, setLessonTypeFilter] = useState<"all" | PracticalLessonType>("all");
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
    const hay = [
      ins.name,
      ins.email,
      ins.phone,
      ins.schedule,
      ins.status,
      teachingLabels,
      renderRegions(ins.availableRegions),
      renderLessonTypes(ins.lessonTypes),
      String(ins.years),
      String(ins.rating),
    ]
      .join(" ")
      .toLowerCase();
    const matchesSearch = !q || hay.includes(q);
    const matchesStatus = statusFilter === "all" || ins.status === statusFilter;
    const matchesSchedule = scheduleFilter === "all" || ins.schedule === scheduleFilter;
    const matchesRegion = regionFilter === "all" || ins.availableRegions.includes(regionFilter);
    const matchesLessonType = lessonTypeFilter === "all" || ins.lessonTypes.includes(lessonTypeFilter);
    return (
      matchesSearch &&
      matchesStatus &&
      matchesSchedule &&
      matchesRegion &&
      matchesLessonType &&
      teachingFilterMatch(ins)
    );
  });

  const instructorStatusLabel = (s: string) => (s === "active" ? t("active") : t("inactive"));

  const validateInstructor = (ins: InstructorForm) => {
    if (!ins.name || !ins.email) return t("fillRequired");
    if (!ins.teachesPractical && !ins.teachesTheory) return t("instructorTeachingRequired");
    if (ins.availableRegions.length === 0) return t("instructorRegionsRequired");
    if (ins.availableRegions.includes("Yerevan") && (ins.availableYerevanDistricts?.length ?? 0) === 0) {
      return t("instructorYerevanDistrictsRequired");
    }
    if (ins.teachesPractical && ins.lessonTypes.length === 0) return t("instructorLessonTypesRequired");
    return "";
  };

  const handleDelete = () => {
    if (!deleteId) return;
    setInstructors((items) => items.filter((i) => i.id !== deleteId));
    showToast(t("instructorDeleted"), "success");
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editIns) return;

    const error = validateInstructor(editIns);
    if (error) {
      showToast(error, "error");
      return;
    }

    setEditId(null);
    showToast(t("instructorUpdatedToast"), "success");
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateInstructor(newIns);
    if (error) {
      showToast(error, "error");
      return;
    }

    const nextPayload: Omit<Instructor, "id"> = {
      ...newIns,
      rating: 5.0,
      hourlyPrice: 7000,
      location: newIns.availableRegions[0] ?? "Yerevan",
      car: "Toyota Corolla",
      transmission: "Manual",
      imageSrc: "/logo.jpg",
    };

    setInstructors((items) => createInstructor(items, nextPayload));
    setAddOpen(false);
    setNewIns(createNewInstructorDraft());
    showToast(t("instructorAddedToast"), "success");
  };

  const updateEdit = (id: string, patch: Partial<Instructor>) => {
    setInstructors((items) => updateInstructor(items, id, patch));
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
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value as "all" | ArmeniaRegion)}
              className="h-9 rounded-lg border border-input bg-background px-3 text-xs text-foreground min-w-[10rem]"
              aria-label={t("instructorRegionsLabel")}
            >
              <option value="all">{t("filterOptionAll")}</option>
              {ARMENIA_REGIONS.map((region) => (
                <option key={region} value={region}>
                  {getRegionLabel(region)}
                </option>
              ))}
            </select>
            <select
              value={lessonTypeFilter}
              onChange={(e) => setLessonTypeFilter(e.target.value as "all" | PracticalLessonType)}
              className="h-9 rounded-lg border border-input bg-background px-3 text-xs text-foreground min-w-[10rem]"
              aria-label={t("instructorLessonTypesLabel")}
            >
              <option value="all">{t("filterOptionAll")}</option>
              {PRACTICAL_LESSON_TYPES.map((lessonType) => (
                <option key={lessonType} value={lessonType}>
                  {getLessonTypeLabel(lessonType)}
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
                t("instructorRegionsLabel"),
                t("instructorLessonTypesLabel"),
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
                renderRegions(ins.availableRegions),
                renderLessonTypes(ins.lessonTypes) || "-",
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
                  t("instructorRegionsLabel"),
                  t("instructorLessonTypesLabel"),
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
                    <td className="px-4 py-3.5 text-muted-foreground">{renderRegions(ins.availableRegions)}</td>
                    <td className="px-4 py-3.5 text-muted-foreground">{renderLessonTypes(ins.lessonTypes) || "-"}</td>
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
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("instructorRegionsLabel")}</label>
                <MultiSelectDropdown
                  options={ARMENIA_REGIONS.map((region) => ({
                    value: region,
                    label: getRegionLabel(region),
                  }))}
                  value={editIns.availableRegions}
                  onChange={(nextRegions) => {
                    updateEdit(editIns.id, {
                      availableRegions: nextRegions as ArmeniaRegion[],
                      availableYerevanDistricts: nextRegions.includes("Yerevan")
                        ? (editIns.availableYerevanDistricts ?? [])
                        : [],
                    });
                  }}
                  placeholder={t("instructorRegionsLabel")}
                  ariaLabel={t("instructorRegionsLabel")}
                />
              </div>
              {editIns.availableRegions.includes("Yerevan") && (
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">{t("instructorYerevanDistrictsLabel")}</label>
                  <MultiSelectDropdown
                    options={YEREVAN_DISTRICTS.map((district) => ({
                      value: district,
                      label: getYerevanDistrictLabel(district),
                    }))}
                    value={editIns.availableYerevanDistricts ?? []}
                    onChange={(nextDistricts) =>
                      updateEdit(editIns.id, {
                        availableYerevanDistricts: nextDistricts as YerevanDistrict[],
                      })
                    }
                    placeholder={t("instructorYerevanDistrictsLabel")}
                    ariaLabel={t("instructorYerevanDistrictsLabel")}
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("instructorLessonTypesLabel")}</label>
                <MultiSelectDropdown
                  options={PRACTICAL_LESSON_TYPES.map((lessonType) => ({
                    value: lessonType,
                    label: getLessonTypeLabel(lessonType),
                  }))}
                  value={editIns.lessonTypes}
                  onChange={(nextLessonTypes) =>
                    updateEdit(editIns.id, { lessonTypes: nextLessonTypes as PracticalLessonType[] })
                  }
                  placeholder={t("instructorLessonTypesLabel")}
                  ariaLabel={t("instructorLessonTypesLabel")}
                />
              </div>
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
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("instructorRegionsLabel")}</label>
              <MultiSelectDropdown
                options={ARMENIA_REGIONS.map((region) => ({
                  value: region,
                  label: getRegionLabel(region),
                }))}
                value={newIns.availableRegions}
                onChange={(nextRegions) => {
                  setNewIns({
                    ...newIns,
                    availableRegions: nextRegions as ArmeniaRegion[],
                    availableYerevanDistricts: nextRegions.includes("Yerevan")
                      ? (newIns.availableYerevanDistricts ?? [])
                      : [],
                  });
                }}
                placeholder={t("instructorRegionsLabel")}
                ariaLabel={t("instructorRegionsLabel")}
              />
            </div>
            {newIns.availableRegions.includes("Yerevan") && (
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("instructorYerevanDistrictsLabel")}</label>
                <MultiSelectDropdown
                  options={YEREVAN_DISTRICTS.map((district) => ({
                    value: district,
                    label: getYerevanDistrictLabel(district),
                  }))}
                  value={newIns.availableYerevanDistricts ?? []}
                  onChange={(nextDistricts) =>
                    setNewIns({
                      ...newIns,
                      availableYerevanDistricts: nextDistricts as YerevanDistrict[],
                    })
                  }
                  placeholder={t("instructorYerevanDistrictsLabel")}
                  ariaLabel={t("instructorYerevanDistrictsLabel")}
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("instructorLessonTypesLabel")}</label>
              <MultiSelectDropdown
                options={PRACTICAL_LESSON_TYPES.map((lessonType) => ({
                  value: lessonType,
                  label: getLessonTypeLabel(lessonType),
                }))}
                value={newIns.lessonTypes}
                onChange={(nextLessonTypes) =>
                  setNewIns({ ...newIns, lessonTypes: nextLessonTypes as PracticalLessonType[] })
                }
                placeholder={t("instructorLessonTypesLabel")}
                ariaLabel={t("instructorLessonTypesLabel")}
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

      <ConfirmDialog open={deleteId !== null} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title={t("instructorRemoveTitle")} description={t("instructorRemoveDesc")} confirmLabel={t("delete")} danger />
    </AdminLayout>
  );
}
