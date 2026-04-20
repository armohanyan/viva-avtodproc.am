import AdminLayout from "src/components/AdminLayout";
import AdminTableScroll from "src/components/AdminTableScroll";
import AdminTableRowActions, { AdminTableRowContextMenu } from "src/components/AdminTableRowActions";
import { useLang, type Lang, type TranslationKey } from "src/lib/i18n";
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
import MultiSelectDropdown from "src/components/MultiSelectDropdown";
import { Plus, Edit2, Trash2, Calendar, School, ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import type { Instructor } from "src/data/instructors";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import type { Branch } from "src/modules/branches";
import { branchNameById, branchOptionLabel, useBranches } from "src/modules/branches";
import { formatShortDateFromIso, localeForLang, todayIsoDate } from "src/lib/adminFormat";
import { cityNameById, useCities } from "src/modules/cities";
import { useAccount } from "src/modules/accounts";
import {
  deriveInstructorLocationFromBranches,
  formatInstructorBranches,
  formatInstructorCities,
} from "src/modules/instructors/instructorLabels";
import type { ScheduleRuleKind } from "src/modules/instructors/instructorAvailability";

type InstructorForm = Pick<
  Instructor,
  | "name"
  | "email"
  | "phone"
  | "years"
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
  teachesPractical: true,
  teachesTheory: false,
  status: "active",
  availableBranchIds: [],
});

type InstructorScheduleRuleRow = {
  id: string;
  ruleKind: ScheduleRuleKind;
  weekday: number | null;
  dateIso: string | null;
  timeStart: string | null;
  timeEnd: string | null;
  allDay: boolean;
};

const WEEKDAY_KEYS: readonly TranslationKey[] = [
  "instructorDay1",
  "instructorDay2",
  "instructorDay3",
  "instructorDay4",
  "instructorDay5",
  "instructorDay6",
  "instructorDay7",
];

function weekdayLabel(weekday: number, t: (k: TranslationKey) => string): string {
  const key = WEEKDAY_KEYS[weekday - 1];
  return key ? t(key) : String(weekday);
}

function describeAvailabilityBlock(
  b: InstructorScheduleRuleRow,
  t: (k: TranslationKey) => string,
  lang: Lang,
): string {
  const dateLabel = b.dateIso ? formatShortDateFromIso(b.dateIso, lang) : "—";
  switch (b.ruleKind) {
    case "day_off":
      if (b.allDay) return `${t("instructorAvailabilityListDayOff")}: ${dateLabel}`;
      return `${t("instructorAvailabilityListPartialOff")}: ${dateLabel} · ${b.timeStart ?? ""}–${b.timeEnd ?? ""}`;
    case "date_busy":
      return `${t("instructorAvailabilityListTimeOff")}: ${dateLabel} · ${b.timeStart ?? ""}–${b.timeEnd ?? ""}`;
    case "lunch":
      return `${t("instructorAvailabilityListWeekdayLunch")}: ${b.timeStart ?? ""}–${b.timeEnd ?? ""}`;
    case "recurring_busy":
      return `${t("instructorAvailabilityListRecurringBusy")}: ${weekdayLabel(b.weekday ?? 1, t)} · ${b.timeStart ?? ""}–${b.timeEnd ?? ""}`;
    case "work_hours":
      return `${t("instructorAvailabilityListWeeklyWork")}: ${weekdayLabel(b.weekday ?? 1, t)} · ${b.timeStart ?? ""}–${b.timeEnd ?? ""}`;
    default:
      return b.id;
  }
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Match backend: HH:MM only (strips seconds, pads hour). */
function normalizeTimeForApi(raw: string): string {
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?/.exec(raw.trim());
  if (!m) return raw.trim();
  const h = Math.min(23, Math.max(0, Number(m[1])));
  const min = Math.min(59, Math.max(0, Number(m[2])));
  return `${pad2(h)}:${pad2(min)}`;
}

type MonthCell =
  | { key: string; type: "blank" }
  | { key: string; type: "day"; iso: string; day: number };

function buildMonthGridCells(year: number, month1To12: number): MonthCell[] {
  const dim = new Date(year, month1To12, 0).getDate();
  const firstJs = new Date(year, month1To12 - 1, 1).getDay();
  const leading = firstJs === 0 ? 6 : firstJs - 1;
  const cells: MonthCell[] = [];
  for (let i = 0; i < leading; i++) {
    cells.push({ key: `b-${year}-${month1To12}-${i}`, type: "blank" });
  }
  for (let d = 1; d <= dim; d++) {
    const iso = `${year}-${pad2(month1To12)}-${pad2(d)}`;
    cells.push({ key: iso, type: "day", iso, day: d });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ key: `t-${cells.length}`, type: "blank" });
  }
  while (cells.length < 42) {
    cells.push({ key: `p-${cells.length}`, type: "blank" });
  }
  return cells.slice(0, 42);
}

function weekDayShortHeaders(locale: string): string[] {
  const base = new Date(2024, 0, 1);
  const headers: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    headers.push(d.toLocaleDateString(locale, { weekday: "short" }));
  }
  return headers;
}

export default function AdminInstructors() {
  const editInstructorFormId = useId();
  const addInstructorFormId = useId();
  const { t, lang } = useLang();
  const { showToast } = useToast();
  const { user } = useAccount();
  const isSuperAdmin = user?.accountType === "super_admin";
  const { branches } = useBranches();
  const { cities } = useCities();
  const [instructors, setInstructors] = useState<Instructor[]>([]);

  const loadInstructors = useCallback(async () => {
    try {
      const data = await vivaApiJson<Instructor[]>("/instructors");
      setInstructors(
        Array.isArray(data)
          ? data.map((i) => ({
              ...i,
              id: String(i.id),
              studentRatingCount: typeof i.studentRatingCount === "number" ? i.studentRatingCount : 0,
              /** API uses numeric ids; branch options and validation use strings (see useBranches). */
              availableBranchIds: (i.availableBranchIds ?? []).map(String),
            }))
          : [],
      );
    } catch {
      setInstructors([]);
    }
  }, []);

  useEffect(() => {
    void loadInstructors();
  }, [loadInstructors]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [cityFilter, setCityFilter] = useState<"all" | string>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [teachingFilter, setTeachingFilter] = useState<"all" | "practical_only" | "theory_only" | "both">("all");
  const [newIns, setNewIns] = useState<InstructorForm>(createNewInstructorDraft());
  const [availabilityInstructorId, setAvailabilityInstructorId] = useState<string | null>(null);
  const [availabilityBlocks, setAvailabilityBlocks] = useState<InstructorScheduleRuleRow[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(() => new Date().getMonth() + 1);
  const [selectedCalendarDays, setSelectedCalendarDays] = useState<string[]>([]);
  const [dayOffScope, setDayOffScope] = useState<"full_day" | "time_window">("full_day");
  const [offWindowStart, setOffWindowStart] = useState("14:00");
  const [offWindowEnd, setOffWindowEnd] = useState("15:00");
  const [weeklyBreakStart, setWeeklyBreakStart] = useState("14:00");
  const [weeklyBreakEnd, setWeeklyBreakEnd] = useState("15:00");

  const editIns = editId ? instructors.find((i) => i.id === editId) ?? null : null;
  const availabilityInstructor = availabilityInstructorId
    ? instructors.find((i) => i.id === availabilityInstructorId) ?? null
    : null;

  const loadAvailabilityBlocks = useCallback(async (instructorId: string) => {
    setAvailabilityLoading(true);
    try {
      const data = await vivaApiJson<InstructorScheduleRuleRow[]>(
        `/instructors/${encodeURIComponent(instructorId)}/availability-blocks`,
      );
      setAvailabilityBlocks(Array.isArray(data) ? data : []);
    } catch (e) {
      setAvailabilityBlocks([]);
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setAvailabilityLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (availabilityInstructorId) {
      const d = new Date();
      setCalendarYear(d.getFullYear());
      setCalendarMonth(d.getMonth() + 1);
      setSelectedCalendarDays([]);
      setDayOffScope("full_day");
      setOffWindowStart("14:00");
      setOffWindowEnd("15:00");
      setWeeklyBreakStart("14:00");
      setWeeklyBreakEnd("15:00");
    }
  }, [availabilityInstructorId]);

  useEffect(() => {
    if (!availabilityInstructorId) {
      setAvailabilityBlocks([]);
      return;
    }
    void loadAvailabilityBlocks(availabilityInstructorId);
  }, [availabilityInstructorId, loadAvailabilityBlocks]);

  const calLocale = useMemo(() => localeForLang(lang), [lang]);
  const monthGridCells = useMemo(() => buildMonthGridCells(calendarYear, calendarMonth), [calendarYear, calendarMonth]);
  const weekdayHdrs = useMemo(() => weekDayShortHeaders(calLocale), [calLocale]);
  const calendarMonthLabel = useMemo(
    () => new Date(calendarYear, calendarMonth - 1, 1).toLocaleDateString(calLocale, { month: "long", year: "numeric" }),
    [calendarYear, calendarMonth, calLocale],
  );

  const gotoPrevMonth = () => {
    if (calendarMonth <= 1) {
      setCalendarYear((y) => y - 1);
      setCalendarMonth(12);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  };

  const gotoNextMonth = () => {
    if (calendarMonth >= 12) {
      setCalendarYear((y) => y + 1);
      setCalendarMonth(1);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  };

  const toggleCalendarDaySelection = (iso: string) => {
    setSelectedCalendarDays((prev) => (prev.includes(iso) ? prev.filter((x) => x !== iso) : [...prev, iso]));
  };

  const applyCalendarDayOffs = async () => {
    if (!availabilityInstructorId) return;
    if (selectedCalendarDays.length === 0) {
      showToast(t("instructorAvailabilityPickDaysHint"), "error");
      return;
    }
    const offStart = normalizeTimeForApi(offWindowStart);
    const offEnd = normalizeTimeForApi(offWindowEnd);
    if (dayOffScope === "time_window" && offStart >= offEnd) {
      showToast(t("instructorAvailabilityTimeOrderHint"), "error");
      return;
    }
    const bodies =
      dayOffScope === "full_day"
        ? selectedCalendarDays.map((dateIso) => ({ ruleKind: "day_off" as const, dateIso, allDay: true }))
        : selectedCalendarDays.map((dateIso) => ({
            ruleKind: "day_off" as const,
            dateIso,
            allDay: false,
            timeStart: offStart,
            timeEnd: offEnd,
          }));
    try {
      await Promise.all(
        bodies.map((body) =>
          vivaApiJson(`/instructors/${encodeURIComponent(availabilityInstructorId)}/availability-blocks`, {
            method: "POST",
            body,
          }),
        ),
      );
      showToast(t("instructorAvailabilityDaysSavedToast").replace("{count}", String(selectedCalendarDays.length)), "success");
      setSelectedCalendarDays([]);
      await loadAvailabilityBlocks(availabilityInstructorId);
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    }
  };

  const applyWeeklyBreakPattern = async () => {
    if (!availabilityInstructorId) return;
    const lunchStart = normalizeTimeForApi(weeklyBreakStart);
    const lunchEnd = normalizeTimeForApi(weeklyBreakEnd);
    if (lunchStart >= lunchEnd) {
      showToast(t("instructorAvailabilityTimeOrderHint"), "error");
      return;
    }
    try {
      await vivaApiJson(`/instructors/${encodeURIComponent(availabilityInstructorId)}/availability-blocks`, {
        method: "POST",
        body: {
          ruleKind: "lunch",
          timeStart: lunchStart,
          timeEnd: lunchEnd,
        },
      });
      showToast(t("instructorAvailabilityWeeklySavedToast"), "success");
      await loadAvailabilityBlocks(availabilityInstructorId);
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    }
  };

  const deleteAvailabilityBlock = async (blockId: string) => {
    if (!availabilityInstructorId) return;
    try {
      await vivaApiJson(`/instructors/${encodeURIComponent(availabilityInstructorId)}/availability-blocks/${encodeURIComponent(blockId)}`, {
        method: "DELETE",
      });
      showToast(t("instructorAvailabilityRemoved"), "success");
      await loadAvailabilityBlocks(availabilityInstructorId);
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    }
  };
  const teachingFilterMatch = useCallback((ins: Instructor) => {
    if (teachingFilter === "all") return true;
    if (teachingFilter === "practical_only") return ins.teachesPractical && !ins.teachesTheory;
    if (teachingFilter === "theory_only") return ins.teachesTheory && !ins.teachesPractical;
    return ins.teachesPractical && ins.teachesTheory;
  }, [teachingFilter]);

  /** Precompute searchable text once per data change (not on every search keystroke). */
  const instructorSearchPrep = useMemo(() => {
    return instructors.map((ins) => {
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
        ins.status,
        teachingLabels,
        citiesHay,
        branchHay,
        ins.imageSrc,
        String(ins.years),
        String(ins.rating),
      ]
        .join(" ")
        .toLowerCase();
      const cityIds = new Set<string>();
      for (const bid of ins.availableBranchIds) {
        const b = branches.find((x) => String(x.id) === String(bid));
        if (b) cityIds.add(String(b.cityId));
      }
      return { ins, hay, cityIds };
    });
  }, [instructors, branches, cities, t]);

  const filteredInstructors = useMemo(() => {
    const q = search.trim().toLowerCase();
    const wantCity = String(cityFilter);
    return instructorSearchPrep
      .filter(({ ins, hay, cityIds }) => {
        const matchesSearch = !q || hay.includes(q);
        const matchesStatus = statusFilter === "all" || ins.status === statusFilter;
        const matchesCity = cityFilter === "all" || cityIds.has(wantCity);
        return matchesSearch && matchesStatus && matchesCity && teachingFilterMatch(ins);
      })
      .map((row) => row.ins);
  }, [instructorSearchPrep, search, statusFilter, cityFilter, teachingFilterMatch]);

  const instructorStatusLabel = useCallback((s: string) => (s === "active" ? t("active") : t("inactive")), [t]);

  const getInstructorCsvRows = useCallback((): string[][] => {
    return filteredInstructors.map((ins) => [
      ins.imageSrc,
      ins.name,
      ins.email,
      [ins.teachesPractical ? t("instructorTeachingPractical") : "", ins.teachesTheory ? t("instructorTeachingTheory") : ""]
        .filter(Boolean)
        .join(" + ") || "-",
      formatInstructorCities(ins, branches, cities),
      formatInstructorBranches(ins, branches, cities),
      ins.phone,
      ins.rating.toFixed(1),
      `${ins.years} ${t("adminInstructorYearsShort")}`,
      instructorStatusLabel(ins.status),
    ]);
  }, [filteredInstructors, t, branches, cities, instructorStatusLabel]);

  const validateInstructor = (ins: InstructorForm) => {
    if (!ins.name || !ins.email) return t("fillRequired");
    if (!ins.teachesPractical && !ins.teachesTheory) return t("instructorTeachingRequired");
    if (ins.teachesPractical && branches.length > 0 && isSuperAdmin) {
      const allowed = new Set(branches.map((b) => String(b.id)));
      const picked = (ins.availableBranchIds ?? []).map(String);
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
      const body: Record<string, unknown> = {
        name: editIns.name,
        email: editIns.email,
        phone: editIns.phone,
        years: editIns.years,
        hourlyPrice: editIns.hourlyPrice,
        status: editIns.status,
        location: deriveInstructorLocationFromBranches(editIns.availableBranchIds, branches, cities, "Yerevan"),
        car: editIns.car,
        transmission: editIns.transmission,
        imageSrc: editIns.imageSrc,
        teachesPractical: editIns.teachesPractical,
        teachesTheory: editIns.teachesTheory,
      };
      if (isSuperAdmin) {
        body.availableBranchIds = editIns.availableBranchIds;
      }
      await vivaApiJson(`/instructors/${encodeURIComponent(editIns.id)}`, {
        method: "PATCH",
        body,
      });
      setEditId(null);
      await loadInstructors();
      showToast(t("instructorUpdatedToast"), "success");
    } catch (e) {
      showToast(getApiErrorMessage(e) || t("fillRequired"), "error");
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateInstructor(newIns);
    if (error) {
      showToast(error, "error");
      return;
    }

    const branchIdsForCreate = isSuperAdmin ? newIns.availableBranchIds : [];
    const nextPayload: Omit<Instructor, "id" | "rating" | "studentRatingCount"> = {
      ...newIns,
      availableBranchIds: branchIdsForCreate,
      hourlyPrice: 7000,
      location: deriveInstructorLocationFromBranches(branchIdsForCreate, branches, cities, "Yerevan"),
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
    } catch (e) {
      showToast(getApiErrorMessage(e) || t("fillRequired"), "error");
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
        actions={
          <Button onClick={() => setAddOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
            <Plus className="w-4 h-4" />
            {t("addNew")}
          </Button>
        }
      />

      <div className="rounded-xl border border-border bg-card overflow-hidden min-w-0">
        <DataTableToolbar value={search} onChange={setSearch} placeholder={`${t("search")}...`}>
          <CsvExportButton
            filename="admin-instructors.csv"
            headers={[
              t("adminInstructorColPhoto"),
              t("adminInstructorColInstructor"),
              t("emailAddress"),
              t("adminInstructorColTeachingType"),
              t("instructorCitiesLabel"),
              t("instructorBranchesLabel"),
              t("phone"),
              t("adminInstructorColRating"),
              t("adminInstructorColExperience"),
              t("status"),
            ]}
            getRowsForExport={getInstructorCsvRows}
            exportRowCount={filteredInstructors.length}
          />
        </DataTableToolbar>
        <AdminTableScroll>
          <table className="w-full text-sm min-w-[62rem]">
            <thead className="bg-muted/40">
              <tr>
                <TableColumnHeaderWithFilter title={t("adminInstructorColPhoto")} />
                <TableColumnHeaderWithFilter title={t("adminInstructorColInstructor")} />
                <TableColumnHeaderWithFilter
                  title={t("adminInstructorColTeachingType")}
                  filter={
                    <TableColumnFilter
                      value={teachingFilter}
                      onChange={(v) => setTeachingFilter(v as typeof teachingFilter)}
                      ariaLabel={t("adminInstructorColTeachingType")}
                      options={[
                        { value: "all", label: t("filterOptionAll") },
                        { value: "practical_only", label: t("instructorFilterTeachingPracticalOnly") },
                        { value: "theory_only", label: t("instructorFilterTeachingTheoryOnly") },
                        { value: "both", label: t("instructorFilterTeachingBoth") },
                      ]}
                    />
                  }
                />
                <TableColumnHeaderWithFilter
                  title={t("instructorCitiesLabel")}
                  filter={
                    <TableColumnFilter
                      value={cityFilter}
                      onChange={(v) => setCityFilter(v as "all" | string)}
                      ariaLabel={t("instructorCitiesLabel")}
                      options={[
                        { value: "all", label: t("filterOptionAll") },
                        ...cities.map((c) => ({ value: c.id, label: c.name })),
                      ]}
                    />
                  }
                />
                <TableColumnHeaderWithFilter title={t("instructorBranchesLabel")} />
                <TableColumnHeaderWithFilter title={t("phone")} />
                <TableColumnHeaderWithFilter title={t("adminInstructorColRating")} />
                <TableColumnHeaderWithFilter title={t("adminInstructorColExperience")} />
                <TableColumnHeaderWithFilter
                  title={t("status")}
                  filter={
                    <TableColumnFilter
                      value={statusFilter}
                      onChange={(v) => setStatusFilter(v as "all" | "active" | "inactive")}
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
              {filteredInstructors.map((ins) => {
                const branchesLabel = formatInstructorBranches(ins, branches, cities);
                return (
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
                      onClick: () => setAvailabilityInstructorId(ins.id),
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
                    <td className="px-4 py-3.5 w-14 align-middle">
                      <img
                        src={ins.imageSrc}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover border border-border bg-muted shrink-0"
                      />
                    </td>
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
                    <td className="px-4 py-3.5 text-muted-foreground max-w-[14rem] text-xs align-top">
                      <div
                        className="leading-snug line-clamp-2 break-words"
                        title={branchesLabel !== "—" ? branchesLabel : undefined}
                      >
                        {branchesLabel}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">{ins.phone}</td>
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
                            onClick: () => setAvailabilityInstructorId(ins.id),
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
                );
              })}
            </tbody>
          </table>
        </AdminTableScroll>
        <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
          {t("panelShowingLabel")} {filteredInstructors.length} / {instructors.length} {t("adminTableInstructorsFooter")}
        </div>
      </div>

      <AppModal
        open={editId !== null}
        onOpenChange={(o) => !o && setEditId(null)}
        title={t("instructorDialogEditTitle")}
        contentClassName="max-w-lg max-h-[min(90vh,720px)]"
        footer={
          editIns ? (
            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setEditId(null)}>
                {t("cancel")}
              </Button>
              <Button type="submit" form={editInstructorFormId} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">
                {t("save")}
              </Button>
            </div>
          ) : null
        }
      >
        {editIns && (
          <form id={editInstructorFormId} onSubmit={handleEdit} className="space-y-3">
              <div>
                <div className="flex items-center gap-4">
                  <img
                    src={editIns.imageSrc}
                    alt=""
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border border-border bg-muted shrink-0"
                    onError={(e) => {
                      e.currentTarget.src = "/logo.jpg";
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <label className="block text-sm font-medium text-muted-foreground mb-1" htmlFor={`${editInstructorFormId}-name`}>
                      {t("name")}
                    </label>
                    <Input
                      id={`${editInstructorFormId}-name`}
                      value={editIns.name}
                      onChange={(e) => updateEdit(editIns.id, { name: e.target.value })}
                      className="h-10"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("emailAddress")}</label>
                <Input value={editIns.email} onChange={(e) => updateEdit(editIns.id, { email: e.target.value })} className="h-10" />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("phoneNumber")}</label>
                <Input value={editIns.phone} onChange={(e) => updateEdit(editIns.id, { phone: e.target.value })} className="h-10" />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("labelYearsExperienceShort")}</label>
                <Input type="number" value={editIns.years} onChange={(e) => updateEdit(editIns.id, { years: +e.target.value || 1 })} className="h-10" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">{t("ratingDisplayLabel")}</label>
                  <Input readOnly value={editIns.rating.toFixed(1)} className="h-10 bg-muted/40" />
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                    {editIns.studentRatingCount && editIns.studentRatingCount > 0
                      ? t("instructorRatingFromStudentsHint")
                      : t("instructorRatingDefaultUntilRatedHint")}
                  </p>
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
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("instructorCitiesLabel")}</label>
                <p className="text-sm text-foreground min-h-[2.5rem] px-3 py-2 rounded-lg border border-input bg-muted/30">
                  {formatInstructorCities(editIns, branches, cities)}
                </p>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{t("instructorLocationDerivedHint")}</p>
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
                    disabled={!isSuperAdmin}
                  />
                  {!isSuperAdmin ? (
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{t("instructorBranchesSuperAdminOnly")}</p>
                  ) : null}
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
          </form>
        )}
      </AppModal>

      <AppModal
        open={addOpen}
        onOpenChange={setAddOpen}
        title={t("instructorDialogAddTitle")}
        contentClassName="max-w-md max-h-[min(90vh,720px)]"
        footer={
          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" form={addInstructorFormId} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">
              {t("addNew")}
            </Button>
          </div>
        }
      >
        <form id={addInstructorFormId} onSubmit={handleAdd} className="space-y-3">
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
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">{t("labelYearsExperienceShort")}</label>
              <Input type="number" value={newIns.years} onChange={(e) => setNewIns({ ...newIns, years: +e.target.value || 1 })} className="h-10" />
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
                  disabled={!isSuperAdmin}
                />
                {!isSuperAdmin ? (
                  <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{t("instructorBranchesSuperAdminOnly")}</p>
                ) : null}
              </div>
            )}
        </form>
      </AppModal>

      <AppModal
        open={availabilityInstructorId !== null}
        onOpenChange={(open) => {
          if (!open) setAvailabilityInstructorId(null);
        }}
        title={t("instructorAvailabilityDialogTitle")}
        titleClassName="text-balance pr-8"
        contentClassName="sm:max-w-4xl max-h-[min(94vh,900px)]"
      >
        {availabilityInstructor && (
          <div className="space-y-4">
              {availabilityLoading ? (
                <p className="text-sm text-muted-foreground">{t("loading")}</p>
              ) : (
                <>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2">{t("instructorAvailabilityActiveRules")}</h4>
                    {availabilityBlocks.length === 0 ? (
                      <p className="text-xs text-muted-foreground">{t("instructorAvailabilityEmpty")}</p>
                    ) : (
                      <ul className="space-y-0 border border-border rounded-lg divide-y divide-border overflow-hidden">
                        {availabilityBlocks.map((b) => (
                          <li key={b.id} className="flex items-start justify-between gap-2 px-3 py-2.5 text-sm bg-card">
                            <span className="text-foreground leading-snug">{describeAvailabilityBlock(b, t, lang)}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="shrink-0 h-8 text-destructive hover:text-destructive"
                              onClick={() => void deleteAvailabilityBlock(b.id)}
                            >
                              {t("delete")}
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="space-y-4 border-t border-border pt-4">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">{t("instructorAvailabilitySectionCalendarTitle")}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{t("instructorAvailabilitySectionCalendarHelp")}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-card p-2.5">
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={gotoPrevMonth}
                          aria-label={t("instructorAvailabilityPrevMonth")}
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                        </Button>
                        <span className="text-xs font-medium text-foreground text-center flex-1 leading-tight px-0.5">{calendarMonthLabel}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={gotoNextMonth}
                          aria-label={t("instructorAvailabilityNextMonth")}
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-7 gap-px text-[9px] font-medium uppercase tracking-wide text-muted-foreground text-center mb-0.5 leading-none">
                        {weekdayHdrs.map((h, i) => (
                          <div key={i} className="py-0.5 truncate min-w-0" title={h}>
                            {h}
                          </div>
                        ))}
                      </div>
                      <div className="grid w-full grid-cols-7 gap-px">
                        {monthGridCells.map((cell) => {
                          if (cell.type === "blank") {
                            return <div key={cell.key} className="h-[1.85rem] min-w-0" />;
                          }
                          const past = cell.iso < todayIsoDate();
                          const sel = selectedCalendarDays.includes(cell.iso);
                          return (
                            <button
                              key={cell.key}
                              type="button"
                              disabled={past}
                              title={past ? t("instructorAvailabilityPastDay") : cell.iso}
                              onClick={() => toggleCalendarDaySelection(cell.iso)}
                              className={[
                                "h-[1.85rem] w-full min-w-0 rounded-sm text-[11px] font-medium leading-none transition-colors",
                                past ? "text-muted-foreground/40 cursor-not-allowed" : "text-foreground hover:bg-muted",
                                sel ? "bg-primary text-primary-foreground hover:bg-primary/90" : "",
                              ].join(" ")}
                            >
                              {cell.day}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
                        <p className="text-xs text-muted-foreground">
                          {t("instructorAvailabilitySelectedCount").replace("{count}", String(selectedCalendarDays.length))}
                        </p>
                        {selectedCalendarDays.length > 0 && (
                          <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setSelectedCalendarDays([])}>
                            {t("instructorAvailabilityClearSelection")}
                          </Button>
                        )}
                      </div>
                      <fieldset className="mt-3 space-y-2">
                        <legend className="sr-only">{t("instructorAvailabilityScopeLegend")}</legend>
                        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                          <input
                            type="radio"
                            name="dayOffScope"
                            checked={dayOffScope === "full_day"}
                            onChange={() => setDayOffScope("full_day")}
                            className="h-4 w-4 border-input accent-primary"
                          />
                          {t("instructorAvailabilityScopeFullDay")}
                        </label>
                        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                          <input
                            type="radio"
                            name="dayOffScope"
                            checked={dayOffScope === "time_window"}
                            onChange={() => setDayOffScope("time_window")}
                            className="h-4 w-4 border-input accent-primary"
                          />
                          {t("instructorAvailabilityScopeTimeWindow")}
                        </label>
                      </fieldset>
                      {dayOffScope === "time_window" && (
                        <div className="grid grid-cols-2 gap-3 mt-3">
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">{t("instructorAvailabilityFrom")}</label>
                            <Input type="time" step={60} value={offWindowStart} onChange={(e) => setOffWindowStart(e.target.value)} className="h-10" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">{t("instructorAvailabilityTo")}</label>
                            <Input type="time" step={60} value={offWindowEnd} onChange={(e) => setOffWindowEnd(e.target.value)} className="h-10" />
                          </div>
                        </div>
                      )}
                      <Button
                        type="button"
                        className="w-full mt-4 bg-primary hover:bg-primary/90 text-primary-foreground"
                        onClick={() => void applyCalendarDayOffs()}
                      >
                        {t("instructorAvailabilitySaveDays")}
                      </Button>
                    </div>

                    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">{t("instructorAvailabilitySectionWeeklyTitle")}</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">{t("instructorAvailabilityFrom")}</label>
                          <Input type="time" step={60} value={weeklyBreakStart} onChange={(e) => setWeeklyBreakStart(e.target.value)} className="h-10" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">{t("instructorAvailabilityTo")}</label>
                          <Input type="time" step={60} value={weeklyBreakEnd} onChange={(e) => setWeeklyBreakEnd(e.target.value)} className="h-10" />
                        </div>
                      </div>
                      <Button type="button" variant="secondary" className="w-full" onClick={() => void applyWeeklyBreakPattern()}>
                        {t("instructorAvailabilitySaveWeekly")}
                      </Button>
                    </div>
                  </div>
                </>
              )}
          </div>
        )}
      </AppModal>

      <ConfirmDialog open={deleteId !== null} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title={t("instructorRemoveTitle")} description={t("instructorRemoveDesc")} confirmLabel={t("delete")} danger />
    </AdminLayout>
  );
}
