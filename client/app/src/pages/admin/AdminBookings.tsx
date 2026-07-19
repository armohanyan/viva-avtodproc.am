import AdminLayout from "src/components/AdminLayout";
import AdminTableScroll from "src/components/AdminTableScroll";
import AdminTableRowActions, { AdminTableRowContextMenu } from "src/components/AdminTableRowActions";
import { useLang, type TranslationKey } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { formatCohortSessionTimeLabel, formatShortDateFromIso, todayIsoDate } from "src/lib/adminFormat";
import { Card } from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import { Input } from "src/components/ui/input";
import { Button } from "src/components/ui/button";
import { AppModal } from "src/components/AppModal";
import ConfirmDialog from "src/components/ConfirmDialog";
import DataTableToolbar from "src/components/DataTableToolbar";
import CsvExportButton from "src/components/CsvExportButton";
import XlsxExportButton from "src/components/XlsxExportButton";
import PanelPageHeader from "src/components/PanelPageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "src/components/ui/tabs";
import { Plus, Edit2, Trash2, CalendarRange, CheckCircle2, Ban, FileSpreadsheet } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { type LessonBookingPayload } from "src/components/LessonBookingCalendar";
import type { AdminBookingFlowKind, AdminPackageOption, TheoryCohortOption } from "src/modules/admin/booking/types";
import { theoryGroupSlotPlanFromCohort } from "src/modules/admin/booking/theoryGroupSlotPlan";
import {
  filterTheoryCohortsByBranchId,
  isTheoryCohortBookableStatus,
} from "src/modules/admin/booking/adminTheoryCohort";
import BookingTypeSelector from "src/modules/admin/booking/BookingTypeSelector";
import GroupLessonSelector from "src/modules/admin/booking/GroupLessonSelector";
import PackageSelector from "src/modules/admin/booking/PackageSelector";
import SlotSelector from "src/modules/admin/booking/SlotSelector";
import { useBookingPriceCalculator, type BookingPriceInput } from "src/modules/admin/booking/useBookingPriceCalculator";
import { validateAdminBookingAdd } from "src/modules/admin/booking/useBookingValidation";
import AdminBookingPaymentSection from "src/components/admin/AdminBookingPaymentSection";
import {
  adminPaymentApiPayload,
  adminPaymentFromBooking,
  adminPaymentStateAfterPaidStrChange,
  BOOKING_LIST_PAYMENT_BADGE_CLASS,
  bookingListPaymentLabelKey,
  bookingListPaymentRow,
  defaultAdminBookingPayment,
  paidAmountFromState,
  validateAdminBookingPayment,
  type AdminBookingPaymentState,
  type BookingPaymentFilter,
} from "src/modules/admin/booking/adminBookingPayment";
import {
  bookingsPathForTab,
  bookingsTabFromPath,
  isAdminBookingsPath,
  type AdminBookingsTab,
} from "src/modules/admin/booking/bookingsTabs";
import { absWouterHref } from "src/lib/wouterFullPath";
import { TabCountBadge } from "./inbox/TabCountBadge";
import {
  fetchAdminBookingById,
  normalizeAdminBookingRow,
  type AdminBookingFinanceLink,
  type AdminBookingRow,
} from "src/modules/admin/booking/adminBookings.api";
import { useAdminBookingsList } from "src/modules/admin/booking/useAdminBookingsList";
import {
  bookingExportHeaderLabels,
  bookingExportRowInputs,
  buildBookingExportWorkbook,
  downloadBookingExportXlsx,
} from "src/modules/admin/booking/bookingExportImport";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { useOptionalAdminBranchFilterRevision } from "src/modules/admin/AdminBranchFilterProvider";
import { getAdminBranchFilterId } from "src/modules/admin/adminBranchFilter";
import { formatBookingSlotRangeLabel } from "src/data/studentDemoBookings";
import { branchNameById, useBranches } from "src/modules/branches";
import { allInstructorNames } from "src/modules/admin/adminPeople";
import { useInstructors } from "src/modules/instructors/useInstructors";
import MultiSelectDropdown from "src/components/MultiSelectDropdown";
import AdminStudentPicker from "src/components/admin/AdminStudentPicker";
import type { AdminStudentMini } from "src/modules/admin/useAdminStudents";
import { useAdminStudentsMini } from "src/modules/admin/useAdminStudents";
import {
  PRACTICAL_LESSON_TYPES,
  filterInstructorsServingBranches,
  getLessonTypeLabel,
  withSelectedInstructorByName,
  type PracticalLessonType,
} from "src/modules/instructors/instructor-booking";
import { cn } from "src/lib/utils";
import ExcelBookingImportModal from "src/modules/admin/booking/ExcelBookingImportModal";
import { defaultExamQuestionMeta, loadExamQuestionMeta } from "src/lib/examQuestionMeta";
import {
  type FinanceTx,
  type TxMethod,
  formatAmd,
  methodTKey,
  parseAmdInput,
  toDatetimeLocalValue,
} from "./finance/adminFinanceShared";
import { BOOKING_STATUS_BADGE_CLASS } from "src/constants/booking.constants";
import { toCanonicalBookingStatus } from "src/utils/booking.utils";
import { ApiRequestError } from "src/lib/api";
import {
  parseThemesFromBookingSearch,
  takeStashedAdminBookingIntentQuery,
} from "src/modules/admin/theoryPersonalRequestBooking";

function studentIdMatches(a: string | number, b: string | number): boolean {
  return String(a) === String(b);
}

type OpenAddOptions = {
  studentId?: string;
  branchId?: string;
  flow?: AdminBookingFlowKind;
  instructorUserId?: string;
  instructorName?: string;
  theoryThemeTitles?: string[];
  theoryRequestId?: string;
};

type StudentRow = { id: string; name: string; email?: string; phone?: string; phone2?: string };

type Booking = AdminBookingRow;

type StudentPackageOrderBalance = {
  purchaseId: number;
  packageId: number;
  packageName: string;
  status: string;
  practicalTotal: number;
  practicalUsed: number;
  theoryTotal: number;
  theoryUsed: number;
  personalTheoryTotal?: number;
  personalTheoryUsed?: number;
};

type AddInlineErrors = {
  general: string | null;
  slots: string | null;
  packagePracticalSlots: string | null;
  packageTheorySlots: string | null;
};

const typeColor: Record<string, string> = {
  practical: "bg-blue-100 text-blue-700",
  theory: "bg-purple-100 text-purple-700",
  theory_personal: "bg-amber-100 text-amber-800",
};

const BOOKING_SOURCE_BADGE_CLASS: Record<string, string> = {
  student: "bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-100",
  admin: "bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-100",
  unknown: "bg-muted text-muted-foreground",
};

function bookingSourceLabelKey(source: Booking["createdByType"]): TranslationKey {
  if (source === "admin") return "adminBookingSourceAdmin";
  if (source === "student") return "adminBookingSourceStudent";
  return "adminBookingSourceUnknown";
}

function bookingLessonTypeTKey(type: Booking["type"]): TranslationKey {
  if (type === "theory") return "lessonTypeTheory";
  if (type === "theory_personal") return "lessonTypeTheoryPersonal";
  return "lessonTypePractical";
}

type BookingPaymentFields = {
  method: TxMethod;
  grossStr: string;
  datetimeLocal: string;
};

function financeStatusFromBookingStatus(status: string): FinanceTx["status"] {
  const s = toCanonicalBookingStatus(status);
  if (s === "confirmed") return "completed";
  if (s === "refunded") return "refunded";
  if (s === "cancelled") return "failed";
  return "pending";
}

function defaultPaymentFields(): BookingPaymentFields {
  return {
    method: "cash",
    grossStr: "",
    datetimeLocal: toDatetimeLocalValue(new Date()),
  };
}

function paymentDescriptionLine(b: Pick<Booking, "type" | "dateIso" | "id">): string {
  const typeEn =
    b.type === "theory" ? "Theory" : b.type === "theory_personal" ? "Personal theory" : "Practical";
  return b.id ? `${typeEn} lesson ${b.dateIso} · #${b.id}` : `${typeEn} lesson ${b.dateIso}`;
}

function packagePaymentDescriptionLine(pkgName: string, studentId: string, students: StudentRow[]): string {
  const { name } = studentContact(students, studentId);
  const label = pkgName.trim() || "Package";
  return name.trim() ? `Package: ${label} — ${name.trim()}` : `Package: ${label}`;
}

function studentContact(students: StudentRow[], studentId: string): { name: string; email: string } {
  const s = students.find((x) => studentIdMatches(x.id, studentId));
  return { name: s?.name ?? "", email: (s?.email ?? "").trim() };
}

/** Hour starts from first `time` up to exclusive `endTime` (same as API multi-slot bookings). */
function hourlyStartsFromBookingRange(startTime: string, endTimeExclusive?: string | null): string[] {
  const parse = (t: string): number => {
    const m = /^(\d{1,2}):(\d{2})/.exec(String(t).trim());
    if (!m) return NaN;
    return Number(m[1]) * 60 + Number(m[2]);
  };
  const pad2 = (n: number) => String(n).padStart(2, "0");
  const toLabel = (mins: number) => `${pad2(Math.floor(mins / 60) % 24)}:${pad2(mins % 60)}`;
  const sm = parse(startTime);
  const em =
    endTimeExclusive != null && String(endTimeExclusive).trim() !== ""
      ? parse(String(endTimeExclusive))
      : sm + 60;
  if (!Number.isFinite(sm) || !Number.isFinite(em) || em <= sm) {
    return Number.isFinite(sm) ? [toLabel(sm)] : [];
  }
  const out: string[] = [];
  for (let m = sm; m < em; m += 60) {
    out.push(toLabel(m));
  }
  return out;
}

function padSlotTime(t: string): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(t).trim());
  if (!m) return t;
  return `${String(Number(m[1])).padStart(2, "0")}:${String(Number(m[2])).padStart(2, "0")}`;
}

function sortTimesUniqueAdmin(times: readonly string[]): string[] {
  const set = new Set(times.map((x) => padSlotTime(x)));
  return [...set].sort((a, b) => a.localeCompare(b));
}

function normalizeSlotEntriesFromApi(
  entries: readonly { dateIso: string; time: string }[],
): { dateIso: string; time: string }[] {
  return [...entries]
    .map((e) => ({ dateIso: e.dateIso.slice(0, 10), time: padSlotTime(e.time) }))
    .sort((a, b) => a.dateIso.localeCompare(b.dateIso) || a.time.localeCompare(b.time));
}

function slotPickCount(pick: LessonBookingPayload | null): number {
  if (!pick) return 0;
  const nEntries = pick.slotEntries?.length ?? 0;
  return nEntries > 0 ? nEntries : pick.times.length;
}

function theoryCohortSelectSuffix(c: TheoryCohortOption): string {
  const time = formatCohortSessionTimeLabel(c.sessionStartTime, c.sessionEndTime);
  const pricePart =
    c.priceAmd != null && Number.isFinite(Number(c.priceAmd)) && Number(c.priceAmd) > 0
      ? ` · ${formatAmd(Math.round(Number(c.priceAmd)))}`
      : "";
  const timePart = time ? ` · ${time}` : "";
  return `${pricePart}${timePart}`;
}

export default function AdminBookings() {
  const branchFilterRevision = useOptionalAdminBranchFilterRevision();
  const editBookingFormId = useId();
  const addBookingFormId = useId();
  const [location, setLocation] = useLocation();
  const activeBookingsTab = bookingsTabFromPath(location);
  const hookBookingSearch = (useSearch() ?? "").replace(/^\?/, "");
  const { t, lang } = useLang();
  const { showToast } = useToast();
  const { branches } = useBranches();
  const { instructors } = useInstructors();
  const instructorNames = useMemo(() => allInstructorNames(instructors), [instructors]);
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<BookingPaymentFilter>("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [lessonTypeFilter, setLessonTypeFilter] = useState("all");
  const [studentFilter, setStudentFilter] = useState("");
  const [instructorFilter, setInstructorFilter] = useState("");
  const [createdByFilter, setCreatedByFilter] = useState<"all" | "student" | "admin">("all");
  const [editBooking, setEditBooking] = useState<Booking | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const importBranchId = useMemo(() => {
    const fromFilter = getAdminBranchFilterId();
    if (fromFilter) return fromFilter;
    return branches[0]?.id != null ? String(branches[0].id) : "";
  }, [branchFilterRevision, branches]);

  const listFilters = useMemo(
    () => ({
      tab: activeBookingsTab,
      search,
      status: statusFilter,
      lessonType: lessonTypeFilter,
      payment: paymentFilter,
      studentUserId: studentFilter,
      instructorUserId: instructorFilter,
      createdByType: createdByFilter,
    }),
    [activeBookingsTab, search, statusFilter, lessonTypeFilter, paymentFilter, studentFilter, instructorFilter, createdByFilter],
  );

  const {
    bookings,
    loading: bookingsLoading,
    error: bookingsError,
    page: bookingsPage,
    pageSize: bookingsPageSize,
    total: bookingsTotal,
    totalPages: bookingsTotalPages,
    debtsCount,
    setPage: setBookingsPage,
    refresh,
    fetchAllBookings,
  } = useAdminBookingsList(listFilters);

  const needsStudentsMini =
    addOpen || !!editBooking || Boolean(studentFilter) || hookBookingSearch.includes("student=");
  const { students: studentsMiniRaw, refresh: refreshStudentsMini } = useAdminStudentsMini({
    enrollmentStatus: "all",
    enabled: needsStudentsMini,
  });
  const studentsMini = useMemo<StudentRow[]>(
    () =>
      studentsMiniRaw.map((s) => ({
        id: s.id,
        name: s.name,
        email: s.email,
        phone: s.phone,
        phone2: s.phone2,
      })),
    [studentsMiniRaw],
  );

  /** Bumped whenever bookings change so instructor busy grids reload. */
  const [busyGridReloadKey, setBusyGridReloadKey] = useState(0);

  useEffect(() => {
    if (bookingsError) showToast(bookingsError, "error");
  }, [bookingsError, showToast]);

  useEffect(() => {
    setBusyGridReloadKey((n) => n + 1);
  }, [bookings]);

  const onBookingsTabChange = useCallback(
    (tab: AdminBookingsTab) => {
      setLocation(absWouterHref(bookingsPathForTab(tab)));
    },
    [setLocation],
  );

  const studentLabel = useCallback(
    (id: string, row?: Pick<Booking, "studentName">) => row?.studentName?.trim() || studentsMini.find((s) => studentIdMatches(s.id, id))?.name || id,
    [studentsMini],
  );

  const bookingExportHeaders = useMemo(
    () => [
      t("tableColId"),
      t("bookingColStudent"),
      t("adminColBranch"),
      t("cohortColInstructor"),
      t("date"),
      t("bookingColTime"),
      t("bookingColType"),
      t("adminBookingsColSource"),
      t("status"),
      t("adminBookingsColPayment"),
      t("adminBookingPaymentTotalPrice"),
      t("adminBookingPaymentPaidAmount"),
      t("adminBookingPaymentRemaining"),
    ],
    [t],
  );

  const buildBookingCsvRows = useCallback(
    (items: Booking[]) =>
      items.map((b) => {
        const pay = bookingListPaymentRow(b);
        return [
          b.id,
          studentLabel(b.studentId, b),
          branchNameById(branches, b.branchId),
          b.instructorName,
          formatShortDateFromIso(b.dateIso, lang),
          formatBookingSlotRangeLabel(b.time, b.endTime),
          t(bookingLessonTypeTKey(b.type)),
          t(bookingSourceLabelKey(b.createdByType ?? "unknown")),
          t(toCanonicalBookingStatus(b.status) as TranslationKey),
          t(bookingListPaymentLabelKey(pay.status)),
          pay.totalAmd > 0 ? String(pay.totalAmd) : "",
          pay.paidAmd > 0 ? String(pay.paidAmd) : "",
          pay.remainingAmd > 0 ? String(pay.remainingAmd) : "",
        ];
      }),
    [branches, lang, studentLabel, t],
  );

  const exportAllBookingsCsv = useCallback(async () => {
    const all = await fetchAllBookings();
    return buildBookingCsvRows(all);
  }, [buildBookingCsvRows, fetchAllBookings]);

  const exportAllBookingsXlsx = useCallback(async () => {
    const all = await fetchAllBookings();
    const headers = bookingExportHeaderLabels(t);
    const rows = bookingExportRowInputs(all, {
      studentLabel,
      branchLabel: (branchId) => branchNameById(branches, branchId),
    });
    const workbook = buildBookingExportWorkbook(headers, rows);
    downloadBookingExportXlsx("admin-bookings.xlsx", workbook);
  }, [branches, fetchAllBookings, studentLabel, t]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [staffCancellationDialog, setStaffCancellationDialog] = useState<
    { kind: "approve" | "reject"; booking: Booking } | null
  >(null);
  const [cancellationStaffBusyId, setCancellationStaffBusyId] = useState<string | null>(null);
  /** Bumps when the add-booking modal opens so slot pickers reset without reacting to branch/instructor draft edits. */
  const [addSlotSessionId, setAddSlotSessionId] = useState(0);
  const [draft, setDraft] = useState<Booking | null>(null);
  const [addInlineErrors, setAddInlineErrors] = useState<AddInlineErrors>({
    general: null,
    slots: null,
    packagePracticalSlots: null,
    packageTheorySlots: null,
  });
  const [bookingModalTab, setBookingModalTab] = useState<"booking" | "payment">("booking");
  const [addBookingPayment, setAddBookingPayment] = useState<AdminBookingPaymentState>(() =>
    defaultAdminBookingPayment(),
  );
  const [editBookingPayment, setEditBookingPayment] = useState<AdminBookingPaymentState>(() =>
    defaultAdminBookingPayment(),
  );
  const [addPaymentErrorKey, setAddPaymentErrorKey] = useState<import("src/lib/i18n").TranslationKey | null>(null);
  const [editPaymentErrorKey, setEditPaymentErrorKey] = useState<import("src/lib/i18n").TranslationKey | null>(null);
  /** Manual finance row id when editing a booking that already has a manual payment. */
  const [editManualTxId, setEditManualTxId] = useState<number | null>(null);
  /** When set, booking has a system-generated payment — show notice instead of form. */
  const [editSystemPayment, setEditSystemPayment] = useState<AdminBookingFinanceLink | null>(null);
  const [slotPick, setSlotPick] = useState<LessonBookingPayload | null>(null);
  const [editSlotPick, setEditSlotPick] = useState<LessonBookingPayload | null>(null);
  const [theoryCohortId, setTheoryCohortId] = useState("");
  const [editTheoryCohortId, setEditTheoryCohortId] = useState("");
  const lastEditSlotInitKey = useRef("");
  const [theoryCohorts, setTheoryCohorts] = useState<TheoryCohortOption[]>([]);
  const [theoryCohortsLoadError, setTheoryCohortsLoadError] = useState(false);
  const [thematicTitles, setThematicTitles] = useState<string[]>(() => defaultExamQuestionMeta().thematicCardTitles);
  const [addPracticalLessonType, setAddPracticalLessonType] = useState<PracticalLessonType | "">("");
  const [editPracticalLessonType, setEditPracticalLessonType] = useState<PracticalLessonType | "">("");
  const [addTheoryThemeTitles, setAddTheoryThemeTitles] = useState<string[]>([]);
  const [editTheoryThemeTitles, setEditTheoryThemeTitles] = useState<string[]>([]);

  const bookableTheoryCohorts = useMemo(
    () => theoryCohorts.filter((c) => isTheoryCohortBookableStatus(c.status)),
    [theoryCohorts],
  );

  const addTheoryCohorts = useMemo(
    () => filterTheoryCohortsByBranchId(bookableTheoryCohorts, draft?.branchId),
    [bookableTheoryCohorts, draft?.branchId],
  );

  const editTheoryCohorts = useMemo(
    () =>
      editBooking?.type === "theory"
        ? filterTheoryCohortsByBranchId(bookableTheoryCohorts, editBooking.branchId)
        : bookableTheoryCohorts,
    [bookableTheoryCohorts, editBooking?.branchId, editBooking?.type],
  );

  const [addFlowKind, setAddFlowKind] = useState<AdminBookingFlowKind>("practical");
  const [addPackageId, setAddPackageId] = useState("");
  const [addPackagePracticalSlotPick, setAddPackagePracticalSlotPick] = useState<LessonBookingPayload | null>(null);
  const [addPackageTheoryInstructorName, setAddPackageTheoryInstructorName] = useState("");
  const [addPackageTheorySlotPick, setAddPackageTheorySlotPick] = useState<LessonBookingPayload | null>(null);
  const [addStudentPackageOrders, setAddStudentPackageOrders] = useState<StudentPackageOrderBalance[]>([]);
  const [addSelectedPackageOrderId, setAddSelectedPackageOrderId] = useState<number | null>(null);
  const [packagesList, setPackagesList] = useState<AdminPackageOption[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [packagesFetchError, setPackagesFetchError] = useState(false);

  const activePracticalInstructors = useMemo(
    () => instructors.filter((i) => i.status === "active" && i.teachesPractical),
    [instructors],
  );

  const activeTheoryInstructors = useMemo(
    () => instructors.filter((i) => i.status === "active" && i.teachesTheory),
    [instructors],
  );

  const practicalInstructorsForAdd = useMemo(() => {
    const branchIds = draft?.branchId ? [draft.branchId] : [];
    const filtered = filterInstructorsServingBranches(activePracticalInstructors, branchIds);
    return withSelectedInstructorByName(filtered, draft?.instructorName, activePracticalInstructors);
  }, [activePracticalInstructors, draft?.branchId, draft?.instructorName]);

  const practicalInstructorsForEdit = useMemo(() => {
    const branchIds = editBooking?.branchId ? [editBooking.branchId] : [];
    const filtered = filterInstructorsServingBranches(activePracticalInstructors, branchIds);
    return withSelectedInstructorByName(filtered, editBooking?.instructorName, activePracticalInstructors);
  }, [activePracticalInstructors, editBooking?.branchId, editBooking?.instructorName]);

  const practicalInstructorsForCalendar = practicalInstructorsForAdd;

  const practicalInstructorsForGrid = useMemo(
    () => withSelectedInstructorByName(activePracticalInstructors, draft?.instructorName, activePracticalInstructors),
    [activePracticalInstructors, draft?.instructorName],
  );

  const theoryInstructorsForGrid = useMemo(
    () => withSelectedInstructorByName(activeTheoryInstructors, draft?.instructorName, activeTheoryInstructors),
    [activeTheoryInstructors, draft?.instructorName],
  );

  const defaultPracticalInstructorName = useMemo(
    () => practicalInstructorsForAdd[0]?.name ?? instructorNames[0] ?? "",
    [practicalInstructorsForAdd, instructorNames],
  );

  const theoryPersonalInstructorsForAdd = useMemo(() => {
    const branchIds = draft?.branchId ? [draft.branchId] : [];
    const filtered = filterInstructorsServingBranches(activeTheoryInstructors, branchIds);
    return withSelectedInstructorByName(filtered, draft?.instructorName, activeTheoryInstructors);
  }, [activeTheoryInstructors, draft?.branchId, draft?.instructorName]);

  const theoryPersonalInstructorsForEdit = useMemo(() => {
    const branchIds = editBooking?.branchId ? [editBooking.branchId] : [];
    const filtered = filterInstructorsServingBranches(activeTheoryInstructors, branchIds);
    return withSelectedInstructorByName(filtered, editBooking?.instructorName, activeTheoryInstructors);
  }, [activeTheoryInstructors, editBooking?.branchId, editBooking?.instructorName]);

  const theoryPersonalInstructorNames = useMemo(
    () => theoryPersonalInstructorsForAdd.map((i) => i.name),
    [theoryPersonalInstructorsForAdd],
  );

  const theoryEditCalendarInstructors = useMemo(() => {
    const base = theoryPersonalInstructorsForEdit;
    if (editBooking?.type !== "theory" || !editTheoryCohortId) return base;
    const c = bookableTheoryCohorts.find((x) => x.id === editTheoryCohortId);
    if (!c) return base;
    const full = instructors.find((i) => i.name === c.instructorName);
    if (full && !base.some((b) => b.id === full.id)) {
      return [...base, full];
    }
    return base;
  }, [editBooking?.type, editTheoryCohortId, bookableTheoryCohorts, instructors, theoryPersonalInstructorsForEdit]);

  const calendarInstructorId = useMemo(() => {
    if (!draft) return "";
    if (draft.type === "practical") {
      const m = instructors.find((i) => i.name === draft.instructorName);
      return m?.id ?? "";
    }
    if (draft.type === "theory" && theoryCohortId) {
      const c = bookableTheoryCohorts.find((x) => x.id === theoryCohortId);
      if (!c) return "";
      const m = instructors.find((i) => i.name === c.instructorName);
      return m?.id ?? "";
    }
    return "";
  }, [draft, instructors, theoryCohortId, bookableTheoryCohorts]);

  const editCalendarInstructorId = useMemo(() => {
    if (!editBooking) return "";
    if (editBooking.type === "practical" || editBooking.type === "theory_personal") {
      const m = instructors.find((i) => i.name === editBooking.instructorName);
      return m?.id ?? "";
    }
    if (editBooking.type === "theory" && editTheoryCohortId) {
      const c = bookableTheoryCohorts.find((x) => x.id === editTheoryCohortId);
      if (!c) return "";
      const m = instructors.find((i) => i.name === c.instructorName);
      return m?.id ?? "";
    }
    return "";
  }, [editBooking, instructors, editTheoryCohortId, bookableTheoryCohorts]);

  const packageTheoryCalendarInstructors = theoryPersonalInstructorsForAdd;

  const packageTheoryCalendarInstructorId = useMemo(() => {
    if (addPackageTheorySlotPick?.instructorUserId) {
      return String(addPackageTheorySlotPick.instructorUserId);
    }
    const name = addPackageTheorySlotPick?.instructor || addPackageTheoryInstructorName || "";
    const m = instructors.find((i) => i.name === name);
    return m?.id ?? packageTheoryCalendarInstructors[0]?.id ?? "";
  }, [addPackageTheorySlotPick, addPackageTheoryInstructorName, instructors, packageTheoryCalendarInstructors]);

  const theoryPersonalCalendarInstructors = theoryPersonalInstructorsForAdd;

  const theoryPersonalCalendarInstructorId = useMemo(() => {
    if (!draft || draft.type !== "theory_personal") return "";
    const m = instructors.find((i) => i.name === draft.instructorName);
    return m?.id ?? "";
  }, [draft, instructors]);

  const packagePracticalCalendarInstructorId = useMemo(() => {
    if (addPackagePracticalSlotPick?.instructorUserId) {
      return String(addPackagePracticalSlotPick.instructorUserId);
    }
    const name = addPackagePracticalSlotPick?.instructor || draft?.instructorName || "";
    const m = instructors.find((i) => i.name === name);
    return m?.id ?? practicalInstructorsForCalendar[0]?.id ?? "";
  }, [addPackagePracticalSlotPick, draft?.instructorName, instructors, practicalInstructorsForCalendar]);

  const needsTheoryCohortsFetch =
    (addOpen && addFlowKind === "theory_group") || editBooking?.type === "theory";
  const needsThematicTitlesFetch =
    (addOpen && addFlowKind === "theory_personal") || editBooking?.type === "theory_personal";

  useEffect(() => {
    if (!needsTheoryCohortsFetch) return;
    let cancelled = false;
    void (async () => {
      try {
        const data = await vivaApiJson<
          {
            id: number;
            name: string;
            startDateIso: string;
            branchId: number;
            instructorName: string;
            status: string;
            sessionStartTime: string | null;
            sessionEndTime: string | null;
            priceAmd?: number | null;
          }[]
        >("/theory-cohorts");
        if (cancelled) return;
        setTheoryCohortsLoadError(false);
        setTheoryCohorts(
          Array.isArray(data)
            ? data.map((c) => ({
                id: String(c.id),
                name: c.name,
                startDateIso: String(c.startDateIso ?? "").slice(0, 10),
                branchId: String(c.branchId),
                instructorName: c.instructorName,
                status: c.status,
                sessionStartTime: c.sessionStartTime ?? null,
                sessionEndTime: c.sessionEndTime ?? null,
                priceAmd: typeof c.priceAmd === "number" && Number.isFinite(c.priceAmd) ? c.priceAmd : null,
              }))
            : [],
        );
      } catch {
        if (!cancelled) {
          setTheoryCohorts([]);
          setTheoryCohortsLoadError(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [needsTheoryCohortsFetch, branchFilterRevision]);

  useEffect(() => {
    if (!addOpen || addFlowKind !== "theory_group" || !theoryCohortId || !draft?.branchId) return;
    const c = bookableTheoryCohorts.find((x) => x.id === theoryCohortId);
    if (c && c.branchId !== draft.branchId) {
      setTheoryCohortId("");
    }
  }, [addOpen, addFlowKind, draft?.branchId, theoryCohortId, bookableTheoryCohorts]);

  useEffect(() => {
    if (!editBooking || editBooking.type !== "theory" || !editTheoryCohortId) return;
    const c = bookableTheoryCohorts.find((x) => x.id === editTheoryCohortId);
    if (c && c.branchId !== editBooking.branchId) {
      setEditTheoryCohortId("");
    }
  }, [editBooking, editTheoryCohortId, bookableTheoryCohorts]);

  useEffect(() => {
    if (!addOpen || !draft?.branchId) return;
    if (addFlowKind === "practical") {
      const stillValid = practicalInstructorsForAdd.some((i) => i.name === draft.instructorName);
      if (stillValid) return;
      const first = practicalInstructorsForAdd[0];
      if (!first) return;
      setDraft((d) => (d ? { ...d, instructorName: first.name } : d));
      setSlotPick(null);
      return;
    }
    if (addFlowKind === "theory_personal") {
      const stillValid = theoryPersonalInstructorsForAdd.some((i) => i.name === draft.instructorName);
      if (stillValid) return;
      const first = theoryPersonalInstructorsForAdd[0];
      if (!first) return;
      setDraft((d) => (d ? { ...d, instructorName: first.name } : d));
      setSlotPick(null);
    }
  }, [
    addOpen,
    addFlowKind,
    draft?.branchId,
    draft?.instructorName,
    practicalInstructorsForAdd,
    theoryPersonalInstructorsForAdd,
  ]);

  useEffect(() => {
    if (!editBooking?.branchId) return;
    if (editBooking.type === "practical") {
      const stillValid = practicalInstructorsForEdit.some((i) => i.name === editBooking.instructorName);
      if (stillValid) return;
      const first = practicalInstructorsForEdit[0];
      if (!first) return;
      setEditBooking({ ...editBooking, instructorName: first.name });
      lastEditSlotInitKey.current = "";
    } else if (editBooking.type === "theory_personal") {
      const stillValid = theoryPersonalInstructorsForEdit.some((i) => i.name === editBooking.instructorName);
      if (stillValid) return;
      const first = theoryPersonalInstructorsForEdit[0];
      if (!first) return;
      setEditBooking({ ...editBooking, instructorName: first.name });
      lastEditSlotInitKey.current = "";
    }
  }, [
    editBooking,
    practicalInstructorsForEdit,
    theoryPersonalInstructorsForEdit,
  ]);

  useEffect(() => {
    if (!needsThematicTitlesFetch) return;
    let cancelled = false;
    void (async () => {
      try {
        const meta = await loadExamQuestionMeta();
        if (cancelled) return;
        setThematicTitles(
          Array.isArray(meta.thematicCardTitles) && meta.thematicCardTitles.length > 0
            ? meta.thematicCardTitles
            : defaultExamQuestionMeta().thematicCardTitles,
        );
      } catch {
        if (!cancelled) setThematicTitles(defaultExamQuestionMeta().thematicCardTitles);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [needsThematicTitlesFetch]);

  useEffect(() => {
    if (!addOpen) return;
    let cancelled = false;
    void (async () => {
      setPackagesLoading(true);
      setPackagesFetchError(false);
      try {
        const data = await vivaApiJson<
          {
            id: number;
            name: string;
            price: string;
            priceAmd?: number;
            lessons: number;
            theoryLessons: number;
            status: string;
          }[]
        >("/packages");
        if (cancelled) return;
        setPackagesList(
          Array.isArray(data)
            ? data.map((p) => ({
                id: String(p.id),
                name: p.name,
                price: p.price,
                priceAmd: typeof p.priceAmd === "number" ? p.priceAmd : undefined,
                lessons: p.lessons,
                theoryLessons: p.theoryLessons ?? 0,
                status: p.status,
              }))
            : [],
        );
      } catch {
        if (!cancelled) {
          setPackagesList([]);
          setPackagesFetchError(true);
        }
      } finally {
        if (!cancelled) setPackagesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [addOpen]);

  useEffect(() => {
    if (!addOpen || addFlowKind !== "package") return;
    const studentId = Number(draft?.studentId ?? 0);
    if (!Number.isFinite(studentId) || studentId <= 0) {
      setAddStudentPackageOrders([]);
      setAddSelectedPackageOrderId(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const data = await vivaApiJson<{ packages?: StudentPackageOrderBalance[] }>(
          `/students/${encodeURIComponent(String(studentId))}/entitlements`,
        );
        if (cancelled) return;
        const rows = Array.isArray(data?.packages) ? data.packages : [];
        setAddStudentPackageOrders(rows);
      } catch {
        if (!cancelled) {
          setAddStudentPackageOrders([]);
          setAddSelectedPackageOrderId(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [addOpen, addFlowKind, draft?.studentId]);

  useEffect(() => {
    if (!editBooking) {
      setEditSlotPick(null);
      lastEditSlotInitKey.current = "";
      return;
    }
    if (editBooking.type !== "practical" && editBooking.type !== "theory" && editBooking.type !== "theory_personal") {
      setEditSlotPick(null);
      lastEditSlotInitKey.current = "";
      return;
    }
    const seKey =
      editBooking.slotEntries && editBooking.slotEntries.length > 0
        ? normalizeSlotEntriesFromApi(editBooking.slotEntries)
            .map((e) => `${e.dateIso}|${e.time}`)
            .join(";")
        : "";
    const key = `${editBooking.id}-${editBooking.type}-${seKey}-${editBooking.time}-${editBooking.endTime ?? ""}`;
    if (lastEditSlotInitKey.current === key) return;
    lastEditSlotInitKey.current = key;
    const inst = instructors.find((i) => i.name === editBooking.instructorName);
    if (editBooking.slotEntries && editBooking.slotEntries.length > 0) {
      const sorted = normalizeSlotEntriesFromApi(editBooking.slotEntries);
      const first = sorted[0];
      const sameDayTimes = sorted.filter((e) => e.dateIso === first.dateIso).map((e) => e.time);
      setEditSlotPick({
        instructorUserId: inst?.id != null ? String(inst.id) : "",
        instructor: editBooking.instructorName,
        dateIso: first.dateIso,
        time: sortTimesUniqueAdmin(sameDayTimes)[0] ?? first.time,
        times: sortTimesUniqueAdmin(sameDayTimes.length > 0 ? sameDayTimes : [first.time]),
        slotEntries: sorted,
      });
      return;
    }
    const times = hourlyStartsFromBookingRange(editBooking.time, editBooking.endTime);
    const slotTimes = times.length > 0 ? times : [editBooking.time];
    setEditSlotPick({
      instructorUserId: inst?.id != null ? String(inst.id) : "",
      instructor: editBooking.instructorName,
      dateIso: editBooking.dateIso,
      time: slotTimes[0] ?? editBooking.time,
      times: slotTimes,
    });
  }, [editBooking, instructors]);

  useEffect(() => {
    if (!editBooking || editBooking.type !== "theory") {
      setEditTheoryCohortId("");
      return;
    }
    const matches = editTheoryCohorts.filter((c) => c.instructorName === editBooking.instructorName);
    const next = matches[0]?.id ?? "";
    setEditTheoryCohortId((prev) => (prev && matches.some((m) => m.id === prev) ? prev : next));
  }, [editBooking, editTheoryCohorts]);

  useEffect(() => {
    if (!editBooking || editBooking.type !== "practical") {
      setEditPracticalLessonType("");
      return;
    }
    setEditPracticalLessonType((prev) => (prev ? prev : "exam"));
  }, [editBooking]);

  useEffect(() => {
    if (!editBooking || editBooking.type !== "theory_personal") {
      setEditTheoryThemeTitles([]);
    }
  }, [editBooking]);

  const openAdd = useCallback(
    (opts?: OpenAddOptions) => {
      const flow: AdminBookingFlowKind = opts?.flow ?? "practical";
      const pickStudent =
        opts?.studentId && studentsMini.some((s) => studentIdMatches(s.id, opts.studentId!))
          ? String(opts.studentId)
          : "";
      const pickBranch =
        opts?.branchId && branches.some((b) => String(b.id) === String(opts.branchId))
          ? String(opts.branchId)
          : opts?.branchId
            ? String(opts.branchId)
            : (branches[0]?.id ?? "");

      const resolveInstructorName = (): string => {
        if (opts?.instructorName?.trim()) return opts.instructorName.trim();
        if (opts?.instructorUserId) {
          const match = instructors.find((i) => String(i.id) === String(opts.instructorUserId));
          if (match?.name) return match.name;
        }
        if (flow === "theory_personal") {
          const branchScoped = filterInstructorsServingBranches(
            instructors.filter((i) => i.status === "active" && i.teachesTheory),
            pickBranch ? [pickBranch] : [],
          );
          return branchScoped[0]?.name ?? "";
        }
        return defaultPracticalInstructorName;
      };

      const lessonType: Booking["type"] =
        flow === "theory_group" ? "theory" : flow === "theory_personal" ? "theory_personal" : "practical";

      const newDraft: Booking = {
        id: "",
        studentId: pickStudent,
        instructorName: resolveInstructorName(),
        dateIso: todayIsoDate(),
        time: "10:00",
        type: lessonType,
        status: "pending",
        branchId: pickBranch,
        meetLink: null,
      };
      setAddFlowKind(flow);
      setAddPackageId("");
      setAddPackagePracticalSlotPick(null);
      setAddPackageTheoryInstructorName("");
      setAddPackageTheorySlotPick(null);
      setAddPracticalLessonType("");
      setAddTheoryThemeTitles(opts?.theoryThemeTitles?.length ? [...opts.theoryThemeTitles] : []);
      setSlotPick(null);
      setTheoryCohortId("");
      pendingTheoryRequestIdRef.current = opts?.theoryRequestId?.trim() ? opts.theoryRequestId.trim() : null;
      setDraft(newDraft);
      setAddBookingPayment(defaultAdminBookingPayment());
      setAddPaymentErrorKey(null);
      setBookingModalTab("booking");
      setAddSlotSessionId((n) => n + 1);
      setAddOpen(true);
    },
    [branches, defaultPracticalInstructorName, instructors, studentsMini],
  );

  const consumedBookingIntentSearch = useRef<string | null>(null);
  const pendingTheoryRequestIdRef = useRef<string | null>(null);

  /** Read intent query from wouter or the browser (needed for `~/admin/bookings?…` navigations). */
  const readBookingIntentSearch = useCallback((): string => {
    if (hookBookingSearch) return hookBookingSearch;
    if (typeof window === "undefined") return "";
    const path = window.location.pathname.replace(/\/$/, "") || "/";
    if (!isAdminBookingsPath(path)) return "";
    return window.location.search.replace(/^\?/, "");
  }, [hookBookingSearch]);

  useEffect(() => {
    const raw = readBookingIntentSearch() || takeStashedAdminBookingIntentQuery();
    const p = new URLSearchParams(raw);
    const wantNew = p.get("new") === "1";
    const studentQ = p.get("student")?.trim() ?? "";
    const branchQ = p.get("branch")?.trim() ?? "";
    const flowQ = p.get("flow")?.trim() as AdminBookingFlowKind | "";
    const instructorQ = p.get("instructor")?.trim() ?? "";
    const instructorNameQ = p.get("instructorName")?.trim() ?? "";
    const themesQ = p.get("themes")?.trim() ?? "";
    const theoryRequestQ = p.get("theoryRequest")?.trim() ?? "";
    const isTheoryPersonalIntent = flowQ === "theory_personal" && Boolean(theoryRequestQ || studentQ);

    if (!wantNew && !studentQ && !isTheoryPersonalIntent) {
      consumedBookingIntentSearch.current = null;
      return;
    }
    if (!raw || consumedBookingIntentSearch.current === raw) return;
    if ((studentQ || isTheoryPersonalIntent) && studentsMini.length === 0) return;
    if (instructorQ && instructors.length === 0) return;

    const studentOk = !studentQ || studentsMini.some((s) => studentIdMatches(s.id, studentQ));
    if (!wantNew && studentQ && studentsMini.length > 0 && !studentOk) {
      consumedBookingIntentSearch.current = raw;
      setLocation(absWouterHref(bookingsPathForTab(activeBookingsTab)), { replace: true });
      return;
    }

    const validStudent = studentQ && studentOk ? studentQ : "";
    const validBranch =
      branchQ && branches.some((b) => String(b.id) === String(branchQ))
        ? String(branchQ)
        : branchQ || "";
    const validFlow =
      flowQ === "practical" || flowQ === "theory_group" || flowQ === "package" || flowQ === "theory_personal"
        ? flowQ
        : undefined;

    consumedBookingIntentSearch.current = raw;
    openAdd({
      ...(validStudent ? { studentId: validStudent } : {}),
      ...(validBranch ? { branchId: validBranch } : {}),
      ...(validFlow ? { flow: validFlow } : {}),
      ...(instructorQ ? { instructorUserId: instructorQ } : {}),
      ...(instructorNameQ ? { instructorName: instructorNameQ } : {}),
      ...(themesQ ? { theoryThemeTitles: parseThemesFromBookingSearch(themesQ) } : {}),
      ...(theoryRequestQ ? { theoryRequestId: theoryRequestQ } : {}),
    });
    setLocation(absWouterHref(bookingsPathForTab(activeBookingsTab)), { replace: true });
  }, [readBookingIntentSearch, location, branches, instructors, openAdd, setLocation, studentsMini, activeBookingsTab]);

  useEffect(() => {
    const raw = readBookingIntentSearch();
    const p = new URLSearchParams(raw);
    const editId = p.get("edit")?.trim() ?? "";
    const deleteIdQ = p.get("delete")?.trim() ?? "";
    if (!editId && !deleteIdQ) return;

    const applyEditRow = (row: Booking) => {
      setBookingModalTab("booking");
      setEditBooking({
        ...row,
        id: String(row.id),
        studentId: String(row.studentId),
        branchId: String(row.branchId),
        status: toCanonicalBookingStatus(row.status),
      });
    };

    const finishIntent = () => {
      setLocation(absWouterHref(bookingsPathForTab(activeBookingsTab)), { replace: true });
    };

    if (editId) {
      const row = bookings.find((b) => String(b.id) === editId);
      if (row) {
        applyEditRow(row);
        finishIntent();
        return;
      }
      if (bookingsLoading) return;
      void (async () => {
        try {
          const fetched = normalizeAdminBookingRow(await fetchAdminBookingById(editId));
          applyEditRow(fetched);
        } catch {
          /* booking may have been removed */
        } finally {
          finishIntent();
        }
      })();
      return;
    }

    if (deleteIdQ) {
      const row = bookings.find((b) => String(b.id) === deleteIdQ);
      if (row) {
        setDeleteId(String(row.id));
        finishIntent();
        return;
      }
      if (bookingsLoading) return;
      void (async () => {
        try {
          const fetched = normalizeAdminBookingRow(await fetchAdminBookingById(deleteIdQ));
          setDeleteId(String(fetched.id));
        } catch {
          /* ignore */
        } finally {
          finishIntent();
        }
      })();
    }
  }, [readBookingIntentSearch, bookings, bookingsLoading, setLocation, activeBookingsTab]);

  const handleAddFlowKindChange = useCallback(
    (flow: AdminBookingFlowKind) => {
      setAddFlowKind(flow);
      setSlotPick(null);
      setTheoryCohortId("");
      setAddPackageId("");
      setAddPackagePracticalSlotPick(null);
      setAddPackageTheoryInstructorName("");
      setAddPackageTheorySlotPick(null);
      if (flow !== "practical") setAddPracticalLessonType("");
      if (flow !== "theory_personal") setAddTheoryThemeTitles([]);
      setDraft((d) => {
        if (!d) return d;
        if (flow === "practical") {
          return {
            ...d,
            type: "practical",
            instructorName: defaultPracticalInstructorName || d.instructorName,
          };
        }
        if (flow === "theory_group") {
          return { ...d, type: "theory" };
        }
        if (flow === "theory_personal") {
          return {
            ...d,
            type: "theory_personal",
            instructorName: theoryPersonalInstructorNames[0] ?? d.instructorName,
          };
        }
        return { ...d, type: "practical" };
      });
    },
    [defaultPracticalInstructorName, theoryPersonalInstructorNames],
  );

  const selectedAddPackage = useMemo(
    () => packagesList.find((p) => p.id === addPackageId) ?? null,
    [packagesList, addPackageId],
  );

  const selectedStudentPackageOrder = useMemo(() => {
    if (addSelectedPackageOrderId == null) return null;
    return addStudentPackageOrders.find((o) => o.purchaseId === addSelectedPackageOrderId) ?? null;
  }, [addStudentPackageOrders, addSelectedPackageOrderId]);

  const packageOrderHasRemainingCredits = useCallback(
    (order: StudentPackageOrderBalance, pkg: AdminPackageOption) => {
      const practicalRemaining = Math.max(0, Number(order.practicalTotal ?? 0) - Number(order.practicalUsed ?? 0));
      const theoryRemaining = Math.max(0, Number(order.theoryTotal ?? 0) - Number(order.theoryUsed ?? 0));
      const needsPractical = Number(pkg.lessons ?? 0) > 0;
      const needsTheory = Number(pkg.theoryLessons ?? 0) > 0;
      return (needsPractical && practicalRemaining > 0) || (needsTheory && theoryRemaining > 0);
    },
    [],
  );

  useEffect(() => {
    if (addFlowKind !== "package" || !selectedAddPackage) {
      setAddSelectedPackageOrderId(null);
      return;
    }
    const packageIdNum = Number(selectedAddPackage.id);
    const candidates = addStudentPackageOrders.filter(
      (o) =>
        o.packageId === packageIdNum &&
        ["active", "paid", "confirmed"].includes(String(o.status ?? "").toLowerCase()) &&
        packageOrderHasRemainingCredits(o, selectedAddPackage),
    );
    if (candidates.length === 0) {
      setAddSelectedPackageOrderId(null);
      return;
    }
    if (addSelectedPackageOrderId != null && candidates.some((c) => c.purchaseId === addSelectedPackageOrderId)) {
      return;
    }
    setAddSelectedPackageOrderId(candidates[0]!.purchaseId);
  }, [addFlowKind, selectedAddPackage, addStudentPackageOrders, addSelectedPackageOrderId, packageOrderHasRemainingCredits]);

  const hasReusableSelectedPackageOrder = useMemo(() => {
    if (!selectedStudentPackageOrder || !selectedAddPackage) return false;
    return packageOrderHasRemainingCredits(selectedStudentPackageOrder, selectedAddPackage);
  }, [selectedStudentPackageOrder, selectedAddPackage, packageOrderHasRemainingCredits]);
  const packageSelectedSlotsCount = useMemo(
    () => slotPickCount(addPackagePracticalSlotPick) + slotPickCount(addPackageTheorySlotPick),
    [addPackagePracticalSlotPick, addPackageTheorySlotPick],
  );

  const packageSelectionStats = useMemo(() => {
    const practicalTotal = Math.max(
      0,
      Number(selectedStudentPackageOrder?.practicalTotal ?? selectedAddPackage?.lessons ?? 0),
    );
    const practicalBooked = Math.max(0, Number(selectedStudentPackageOrder?.practicalUsed ?? 0));
    const theoryTotal = Math.max(
      0,
      Number(selectedStudentPackageOrder?.theoryTotal ?? selectedAddPackage?.theoryLessons ?? 0),
    );
    const theoryBooked = Math.max(0, Number(selectedStudentPackageOrder?.theoryUsed ?? 0));
    const practicalSelected = slotPickCount(addPackagePracticalSlotPick);
    const theorySelected = slotPickCount(addPackageTheorySlotPick);
    const practicalRemainingBefore = Math.max(0, practicalTotal - practicalBooked);
    const theoryRemainingBefore = Math.max(0, theoryTotal - theoryBooked);
    return {
      practical: {
        booked: practicalBooked,
        selected: practicalSelected,
        total: practicalTotal,
        remaining: Math.max(0, practicalRemainingBefore - practicalSelected),
        remainingBeforeSelection: practicalRemainingBefore,
      },
      theory: {
        booked: theoryBooked,
        selected: theorySelected,
        total: theoryTotal,
        remaining: Math.max(0, theoryRemainingBefore - theorySelected),
        remainingBeforeSelection: theoryRemainingBefore,
      },
    };
  }, [selectedAddPackage, selectedStudentPackageOrder, addPackagePracticalSlotPick, addPackageTheorySlotPick]);

  const addPriceInput: BookingPriceInput = useMemo(
    () => ({
      flowKind: addFlowKind,
      instructors,
      instructorName: draft?.instructorName ?? "",
      slotPick,
      theoryCohortId,
      theoryCohorts: addTheoryCohorts,
      selectedPackage: selectedAddPackage,
      packagePracticalSlots: addPackagePracticalSlotPick,
      packageTheorySlots: addPackageTheorySlotPick,
    }),
    [
      addFlowKind,
      instructors,
      draft?.instructorName,
      slotPick,
      theoryCohortId,
      addTheoryCohorts,
      selectedAddPackage,
      addPackagePracticalSlotPick,
      addPackageTheorySlotPick,
    ],
  );

  const addTotalAmd = useBookingPriceCalculator(addPriceInput);
  const addEffectiveTotalAmd = useMemo(() => {
    if (addFlowKind !== "package") return addTotalAmd;
    // Show package price on package selection; switch to zero only when actually scheduling from existing balance.
    return hasReusableSelectedPackageOrder && packageSelectedSlotsCount > 0 ? 0 : addTotalAmd;
  }, [addFlowKind, hasReusableSelectedPackageOrder, packageSelectedSlotsCount, addTotalAmd]);

  const addValidation = useMemo(
    () =>
      validateAdminBookingAdd({
        flowKind: addFlowKind,
        studentId: draft?.studentId ?? "",
        instructorName: draft?.instructorName ?? "",
        slotPick,
        theoryCohortId,
        theoryCohorts: addTheoryCohorts,
        calendarInstructorId:
          addFlowKind === "theory_group"
            ? calendarInstructorId
            : addFlowKind === "theory_personal"
              ? theoryPersonalCalendarInstructorId
              : "",
        selectedPackage: selectedAddPackage,
        packagePracticalSlots: addPackagePracticalSlotPick,
        packageTheorySlots: addPackageTheorySlotPick,
        practicalLessonType: addPracticalLessonType,
        theoryThemeTitles: addTheoryThemeTitles,
      }),
    [
      addFlowKind,
      draft?.studentId,
      draft?.instructorName,
      slotPick,
      theoryCohortId,
      addTheoryCohorts,
      calendarInstructorId,
      theoryPersonalCalendarInstructorId,
      selectedAddPackage,
      addPackagePracticalSlotPick,
      addPackageTheorySlotPick,
      addPracticalLessonType,
      addTheoryThemeTitles,
    ],
  );
  const addValidationKeySet = useMemo(
    () => new Set<TranslationKey>(addValidation.messageKeys),
    [addValidation.messageKeys],
  );
  const addFieldInvalid = useMemo(
    () => ({
      student: addValidationKeySet.has("adminBookingValSelectStudent"),
      practicalLessonType: addFlowKind === "practical" && addValidationKeySet.has("fillRequired"),
      theoryThemes: addFlowKind === "theory_personal" && addValidationKeySet.has("fillRequired"),
      theoryGroup: addValidationKeySet.has("adminBookingValSelectTheoryGroup"),
      slots:
        addValidationKeySet.has("adminBookingValSelectSlots") ||
        addValidationKeySet.has("adminBookingValPackagePracticalCount") ||
        addValidationKeySet.has("adminBookingValPackageTheoryCount"),
    }),
    [addFlowKind, addValidationKeySet],
  );

  const filterSelectClass =
    "w-full h-9 rounded-lg border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring";

  useEffect(() => {
    if (!editBooking) {
      setEditManualTxId(null);
      setEditSystemPayment(null);
      return;
    }
    const manual = editBooking.manualFinanceTx;
    const system = editBooking.systemFinanceTx;
    if (manual) {
      setEditManualTxId(manual.id);
      setEditSystemPayment(null);
      setEditBookingPayment(
        adminPaymentFromBooking(editBooking, {
          method: manual.method as TxMethod,
          createdAt: manual.createdAt,
        }),
      );
    } else if (system) {
      setEditManualTxId(null);
      setEditSystemPayment(system);
      setEditBookingPayment(adminPaymentFromBooking(editBooking));
    } else {
      setEditManualTxId(null);
      setEditSystemPayment(null);
      setEditBookingPayment(adminPaymentFromBooking(editBooking));
    }
    setEditPaymentErrorKey(null);
  }, [editBooking]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await vivaApiJson(`/bookings/${encodeURIComponent(deleteId)}`, { method: "DELETE" });
      setDeleteId(null);
      await refresh();
      showToast(t("bookingCancelledMsg"), "success");
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    }
  };

  const handleStaffCancellationConfirm = async () => {
    const d = staffCancellationDialog;
    if (!d) return;
    const id = String(d.booking.id);
    setCancellationStaffBusyId(id);
    try {
      if (d.kind === "approve") {
        const res = await vivaApiJson<{
          success?: boolean;
          message?: string;
          status?: string;
        }>(`/bookings/${encodeURIComponent(id)}/approve-student-cancellation`, { method: "POST" });
        const msg =
          typeof res?.message === "string" && res.message.trim() ? res.message.trim() : t("adminBookingApproveCancellationToast");
        showToast(msg, "success");
      } else {
        await vivaApiJson(`/bookings/${encodeURIComponent(id)}/reject-student-cancellation`, { method: "POST" });
        showToast(t("adminBookingRejectCancellationToast"), "success");
      }
      await refresh();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
      throw e; // keep ConfirmDialog open on failure
    } finally {
      setCancellationStaffBusyId(null);
    }
  };

  const validatePaymentForSubmit = (
    payment: BookingPaymentFields | AdminBookingPaymentState,
    studentId: string,
    requireAmount: boolean,
  ): boolean => {
    const gross =
      "paidStr" in payment ? paidAmountFromState(payment) : parseAmdInput(payment.grossStr);
    const datetimeLocal = payment.datetimeLocal;
    if (!Number.isFinite(gross) || gross <= 0) {
      if (requireAmount) {
        showToast(t("financeManualErrorAmount"), "error");
        return false;
      }
      return true;
    }
    const created = new Date(datetimeLocal);
    if (Number.isNaN(created.getTime())) {
      showToast(t("financeManualErrorDate"), "error");
      return false;
    }
    const { name } = studentContact(studentsMini, studentId);
    if (!name.trim()) {
      showToast(t("financeManualErrorRequired"), "error");
      return false;
    }
    return true;
  };

  const bookingPaymentToFinanceFields = (state: AdminBookingPaymentState): BookingPaymentFields => ({
    method: state.method,
    grossStr: state.paidStr,
    datetimeLocal: state.datetimeLocal,
  });

  const postManualFinance = async (
    payment: BookingPaymentFields,
    ctx: {
      studentId: string;
      branchId: string;
      bookingIdNum: number | null;
      bookingStatus: string;
      /** Required when no booking is linked (e.g. package enrollment without slots). */
      financeDescription?: string;
    },
  ) => {
    const gross = parseAmdInput(payment.grossStr);
    const created = new Date(payment.datetimeLocal);
    const { name, email } = studentContact(studentsMini, ctx.studentId);
    const bid =
      ctx.bookingIdNum != null && Number.isFinite(ctx.bookingIdNum) && ctx.bookingIdNum > 0 ? ctx.bookingIdNum : null;
    const description = (ctx.financeDescription ?? "").trim();
    await vivaApiJson("/finance/transactions", {
      method: "POST",
      body: {
        createdAt: created.toISOString(),
        customer: name.trim(),
        email: email.trim(),
        branchId: Number(ctx.branchId),
        method: payment.method,
        grossAmd: gross,
        status: financeStatusFromBookingStatus(ctx.bookingStatus),
        source: "manual",
        ...(bid != null ? { bookingId: bid } : {}),
        ...(bid == null && description ? { description } : {}),
      },
    });
  };

  const patchManualFinance = async (
    txId: number,
    payment: BookingPaymentFields,
    ctx: {
      studentId: string;
      branchId: string;
      bookingIdNum: number;
      financeDescription: string;
      bookingStatus: string;
    },
  ) => {
    const gross = parseAmdInput(payment.grossStr);
    const created = new Date(payment.datetimeLocal);
    const { name, email } = studentContact(studentsMini, ctx.studentId);
    await vivaApiJson(`/finance/transactions/${encodeURIComponent(String(txId))}`, {
      method: "PATCH",
      body: {
        customer: name.trim(),
        email: email.trim(),
        description: ctx.financeDescription.trim(),
        branchId: Number(ctx.branchId),
        method: payment.method,
        grossAmd: gross,
        status: financeStatusFromBookingStatus(ctx.bookingStatus),
        createdAt: created.toISOString(),
        bookingId: ctx.bookingIdNum,
      },
    });
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBooking) return;
    if (editBooking.type === "practical" || editBooking.type === "theory" || editBooking.type === "theory_personal") {
      if (editBooking.type === "practical" && !editPracticalLessonType) {
        showToast(t("fillRequired"), "error");
        return;
      }
      if (editBooking.type === "theory_personal" && editTheoryThemeTitles.length === 0) {
        showToast(t("fillRequired"), "error");
        return;
      }
      if (bookingModalTab !== "payment") {
        const hasSlots =
          editSlotPick &&
          ((editSlotPick.slotEntries?.length ?? 0) > 0 || editSlotPick.times.length > 0);
        if (!hasSlots) {
          showToast(t("adminBookingSlotsNotSelected"), "error");
          return;
        }
      }
      if (editBooking.type === "theory" && !editTheoryCohortId.trim()) {
        showToast(t("adminBookingTheoryCohortRequired"), "error");
        return;
      }
    } else if (!editBooking.instructorName || !editBooking.dateIso || !editBooking.time) {
      showToast(t("fillRequired"), "error");
      return;
    }
    const editTotal = editBooking.totalPriceAmd ?? 0;
    const payErr = validateAdminBookingPayment(editBookingPayment, editTotal);
    if (payErr) {
      setBookingModalTab("payment");
      setEditPaymentErrorKey(payErr);
      showToast(t(payErr), "error");
      return;
    }
    setEditPaymentErrorKey(null);

    const paymentOnlySave = bookingModalTab === "payment";

    try {
      const pick = editSlotPick!;
      const useArbitrarySlots =
        (editBooking.type === "practical" || editBooking.type === "theory_personal") &&
        (pick.slotEntries?.length ?? 0) > 0;
      const paymentBody = adminPaymentApiPayload(editBookingPayment, editTotal);
      const body = paymentOnlySave
        ? {
            studentId: editBooking.studentId,
            status: editBooking.status,
            branchId: Number(editBooking.branchId),
            ...paymentBody,
          }
        : editBooking.type === "practical" || editBooking.type === "theory" || editBooking.type === "theory_personal"
          ? {
              studentId: editBooking.studentId,
              branchId: Number(editBooking.branchId),
              status: editBooking.status,
              type: editBooking.type,
              dateIso: pick.dateIso,
              slots: pick.times,
              ...(useArbitrarySlots ? { slotEntries: pick.slotEntries } : {}),
              ...(editBooking.type === "practical" || editBooking.type === "theory_personal"
                ? { instructorName: pick.instructor || editBooking.instructorName }
                : { theoryCohortId: Number(editTheoryCohortId) }),
              ...(editBooking.type === "theory_personal"
                ? { meetLink: editBooking.meetLink?.trim() || null }
                : {}),
              ...paymentBody,
            }
          : {
              studentId: editBooking.studentId,
              instructorName: editBooking.instructorName,
              dateIso: editBooking.dateIso,
              time: editBooking.time,
              type: editBooking.type,
              status: editBooking.status,
              branchId: Number(editBooking.branchId),
              ...paymentBody,
            };
      await vivaApiJson(`/bookings/${encodeURIComponent(editBooking.id)}`, {
        method: "PATCH",
        body,
      });
      const bookingIdNum = Number(editBooking.id);
      const financeDateIso = editSlotPick?.dateIso ?? editBooking.dateIso;
      if (!editSystemPayment) {
        const paid = paidAmountFromState(editBookingPayment);
        if (paid > 0) {
          const financeFields = bookingPaymentToFinanceFields(editBookingPayment);
          const ok = validatePaymentForSubmit(editBookingPayment, editBooking.studentId, true);
          if (!ok) return;
          if (editManualTxId != null) {
            await patchManualFinance(editManualTxId, financeFields, {
              studentId: editBooking.studentId,
              branchId: editBooking.branchId,
              bookingIdNum,
              bookingStatus: editBooking.status,
              financeDescription: paymentDescriptionLine({
                type: editBooking.type,
                dateIso: financeDateIso,
                id: editBooking.id,
              }),
            });
          } else {
            await postManualFinance(financeFields, {
              studentId: editBooking.studentId,
              branchId: editBooking.branchId,
              bookingIdNum,
              bookingStatus: editBooking.status,
            });
          }
        }
      }
      setEditBooking(null);
      lastEditSlotInitKey.current = "";
      setBookingModalTab("booking");
      await refresh();
      showToast(t("bookingUpdatedToast"), "success");
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    const v = addValidation;
    if (!v.ok) {
      setBookingModalTab("booking");
      showToast(t(v.messageKeys[0]), "error");
      return;
    }
    const payErr = validateAdminBookingPayment(addBookingPayment, addEffectiveTotalAmd);
    if (payErr) {
      setBookingModalTab("payment");
      setAddPaymentErrorKey(payErr);
      showToast(t(payErr), "error");
      return;
    }
    setAddPaymentErrorKey(null);
    const addPaid = paidAmountFromState(addBookingPayment);
    if (addPaid > 0) {
      const ok = validatePaymentForSubmit(addBookingPayment, draft.studentId, true);
      if (!ok) return;
    }
    const paymentBody = adminPaymentApiPayload(addBookingPayment, addEffectiveTotalAmd);
    try {
      setAddInlineErrors({
        general: null,
        slots: null,
        packagePracticalSlots: null,
        packageTheorySlots: null,
      });
      if (addFlowKind === "package") {
        const pkg = selectedAddPackage!;
        const studentNum = Number(draft.studentId);
        await vivaApiJson(`/students/${encodeURIComponent(String(studentNum))}`, {
          method: "PATCH",
          body: {
            packageId: Number(pkg.id),
            lessonsTotal: pkg.lessons,
            theoryLessonsTotal: pkg.theoryLessons > 0 ? pkg.theoryLessons : 0,
            branchId: Number(draft.branchId),
          },
        });
        const practicalCount = slotPickCount(addPackagePracticalSlotPick);
        const theoryCount = slotPickCount(addPackageTheorySlotPick);
        const hasSlotsToBook = practicalCount > 0 || theoryCount > 0;
        let anchorBookingId: number | null = null;
        if (hasSlotsToBook) {
          const packageResult = await vivaApiJson<{ bookingIds?: number[] }>("/bookings/package-atomic", {
            method: "POST",
            body: {
              studentId: studentNum,
              packageId: Number(pkg.id),
              branchId: Number(draft.branchId),
              status: draft.status,
              ...(addSelectedPackageOrderId != null ? { packageOrderId: addSelectedPackageOrderId } : {}),
              ...(pkg.lessons > 0 && practicalCount > 0 && addPackagePracticalSlotPick
                ? {
                    practical: {
                      instructorName: addPackagePracticalSlotPick.instructor || draft.instructorName,
                      ...(addPackagePracticalSlotPick.instructorUserId &&
                      Number.isFinite(Number(addPackagePracticalSlotPick.instructorUserId))
                        ? { instructorUserId: Number(addPackagePracticalSlotPick.instructorUserId) }
                        : {}),
                      dateIso: addPackagePracticalSlotPick.dateIso,
                      slots: addPackagePracticalSlotPick.times,
                      ...(addPackagePracticalSlotPick.slotEntries && addPackagePracticalSlotPick.slotEntries.length > 0
                        ? { slotEntries: addPackagePracticalSlotPick.slotEntries }
                        : {}),
                    },
                  }
                : {}),
              ...(pkg.theoryLessons > 0 && theoryCount > 0 && addPackageTheorySlotPick
                ? {
                    theoryPersonal: {
                      instructorName:
                        addPackageTheorySlotPick.instructor || addPackageTheoryInstructorName || draft.instructorName,
                      ...(addPackageTheorySlotPick.instructorUserId &&
                      Number.isFinite(Number(addPackageTheorySlotPick.instructorUserId))
                        ? { instructorUserId: Number(addPackageTheorySlotPick.instructorUserId) }
                        : {}),
                      dateIso: addPackageTheorySlotPick.dateIso,
                      slots: addPackageTheorySlotPick.times,
                      ...(addPackageTheorySlotPick.slotEntries && addPackageTheorySlotPick.slotEntries.length > 0
                        ? { slotEntries: addPackageTheorySlotPick.slotEntries }
                        : {}),
                    },
                  }
                : {}),
            },
          });
          const bookingIds = Array.isArray(packageResult?.bookingIds) ? packageResult.bookingIds : [];
          anchorBookingId = bookingIds.length > 0 ? Number(bookingIds[0]) : null;
        }
        if (addPaid > 0) {
          await postManualFinance(bookingPaymentToFinanceFields(addBookingPayment), {
            studentId: draft.studentId,
            branchId: draft.branchId,
            bookingIdNum: anchorBookingId,
            bookingStatus: draft.status,
            financeDescription: packagePaymentDescriptionLine(pkg.name, draft.studentId, studentsMini),
          });
        }
      } else {
        const theoryCohort = addTheoryCohorts.find((x) => x.id === theoryCohortId);
        const theoryPlan =
          draft.type === "theory" && theoryCohort ? theoryGroupSlotPlanFromCohort(theoryCohort) : null;
        const pick = slotPick!;
        const arbitrary =
          (addFlowKind === "practical" || addFlowKind === "theory_personal") &&
          pick.slotEntries &&
          pick.slotEntries.length > 0
            ? { slotEntries: pick.slotEntries }
            : {};
        const body =
          addFlowKind === "theory_personal"
            ? {
                studentId: Number(draft.studentId),
                ...(pick.instructorUserId && Number.isFinite(Number(pick.instructorUserId))
                  ? { instructorUserId: Number(pick.instructorUserId) }
                  : {}),
                instructorName: pick.instructor || draft.instructorName,
                dateIso: pick.dateIso,
                type: "theory_personal" as const,
                status: draft.status,
                branchId: Number(draft.branchId),
                slots: pick.times,
                meetLink: draft.meetLink?.trim() || null,
                ...arbitrary,
                ...paymentBody,
              }
            : {
                studentId: Number(draft.studentId),
                branchId: Number(draft.branchId),
                status: draft.status,
                type: draft.type,
                dateIso: theoryPlan ? theoryPlan.dateIso : pick.dateIso,
                slots: theoryPlan ? theoryPlan.times : pick.times,
                ...(draft.type === "practical"
                  ? {
                      instructorName: pick.instructor || draft.instructorName,
                      ...(pick.instructorUserId && Number.isFinite(Number(pick.instructorUserId))
                        ? { instructorUserId: Number(pick.instructorUserId) }
                        : {}),
                    }
                  : { theoryCohortId: Number(theoryCohortId) }),
                ...(!theoryPlan ? arbitrary : {}),
                ...paymentBody,
              };
        const created = await vivaApiJson<{ id: number }>("/bookings", {
          method: "POST",
          body,
        });
        const bookingIdNum = Number(created.id);
        if (addPaid > 0 && Number.isFinite(bookingIdNum) && bookingIdNum > 0) {
          await postManualFinance(bookingPaymentToFinanceFields(addBookingPayment), {
            studentId: draft.studentId,
            branchId: draft.branchId,
            bookingIdNum,
            bookingStatus: draft.status,
          });
        }
        const theoryRequestId = pendingTheoryRequestIdRef.current;
        if (
          addFlowKind === "theory_personal" &&
          theoryRequestId &&
          Number.isFinite(bookingIdNum) &&
          bookingIdNum > 0
        ) {
          try {
            await vivaApiJson(`/personal-theory-lesson-requests/${theoryRequestId}/link-booking`, {
              method: "POST",
              body: { bookingId: bookingIdNum },
            });
          } catch (linkErr) {
            showToast(getApiErrorMessage(linkErr), "error");
          }
        }
      }
      pendingTheoryRequestIdRef.current = null;
      setAddOpen(false);
      setDraft(null);
      setBookingModalTab("booking");
      await refresh();
      showToast(t("bookingCreatedToast"), "success");
    } catch (err) {
      const ui = getApiErrorMessage(err);
      const raw = err instanceof ApiRequestError ? String(err.message ?? "").toLowerCase() : "";
      if (addFlowKind === "package") {
        if (raw.includes("practical") && raw.includes("slot")) {
          setAddInlineErrors({ general: null, slots: null, packagePracticalSlots: ui, packageTheorySlots: null });
        } else if ((raw.includes("theory_personal") || raw.includes("theory")) && raw.includes("slot")) {
          setAddInlineErrors({ general: null, slots: null, packagePracticalSlots: null, packageTheorySlots: ui });
        } else if (raw.includes("slot")) {
          setAddInlineErrors({ general: null, slots: null, packagePracticalSlots: ui, packageTheorySlots: ui });
        } else {
          setAddInlineErrors({ general: ui, slots: null, packagePracticalSlots: null, packageTheorySlots: null });
        }
      } else if (raw.includes("slot")) {
        setAddInlineErrors({ general: null, slots: ui, packagePracticalSlots: null, packageTheorySlots: null });
      } else {
        setAddInlineErrors({ general: ui, slots: null, packagePracticalSlots: null, packageTheorySlots: null });
      }
      showToast(ui, "error");
    }
  };

  useEffect(() => {
    if (!addOpen) return;
    setAddBookingPayment((prev) => {
      const next = adminPaymentStateAfterPaidStrChange(prev, prev.paidStr, addEffectiveTotalAmd);
      if (
        next.status === prev.status &&
        next.paidStr === prev.paidStr &&
        next.paymentReminderDate === prev.paymentReminderDate
      ) {
        return prev;
      }
      return next;
    });
  }, [addOpen, addEffectiveTotalAmd]);

  useEffect(() => {
    if (!editBooking) return;
    const editTotal = editBooking.totalPriceAmd ?? 0;
    setEditBookingPayment((prev) => adminPaymentStateAfterPaidStrChange(prev, prev.paidStr, editTotal));
  }, [editBooking?.id, editBooking?.totalPriceAmd]);

  const onBookingModalTabChange = useCallback(
    (v: string, mode: "add" | "edit") => {
      if (v === "payment") {
        if (mode === "add") {
          setAddBookingPayment((prev) =>
            adminPaymentStateAfterPaidStrChange(prev, prev.paidStr, addEffectiveTotalAmd),
          );
        } else {
          const editTotal = editBooking?.totalPriceAmd ?? 0;
          setEditBookingPayment((prev) => adminPaymentStateAfterPaidStrChange(prev, prev.paidStr, editTotal));
        }
      }
      setBookingModalTab(v as "booking" | "payment");
    },
    [addEffectiveTotalAmd, editBooking?.totalPriceAmd],
  );

  return (
    <AdminLayout>
      <PanelPageHeader
        icon={CalendarRange}
        title={t("bookings")}
        subtitle={t(activeBookingsTab === "debts" ? "adminBookingsDebtsPageSubtitle" : "adminBookingsPageSubtitle")}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
              <FileSpreadsheet className="w-4 h-4" />
              {t("adminBookingsImportFromExcel")}
            </Button>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2" onClick={() => openAdd()}>
              <Plus className="w-4 h-4" />
              {t("addNew")}
            </Button>
          </div>
        }
      />

      <Tabs
        value={activeBookingsTab}
        onValueChange={(v) => onBookingsTabChange(v as AdminBookingsTab)}
        className="space-y-4"
      >
        <TabsList className="flex flex-wrap h-auto gap-1 w-full sm:w-auto">
          <TabsTrigger value="all" className="px-3">
            {t("bookings")}
          </TabsTrigger>
          <TabsTrigger value="debts" className="px-3">
            {t("adminBookingsDebtsTab")}
            <TabCountBadge count={debtsCount} />
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeBookingsTab} className="mt-0">
      <Card className="border-border overflow-hidden min-w-0">
        <div className="p-4 space-y-3 border-b border-border">
          <DataTableToolbar value={search} onChange={setSearch} placeholder={`${t("search")}…`} className="p-0 border-0">
            <XlsxExportButton
              onExport={exportAllBookingsXlsx}
              exportRowCount={bookingsTotal}
              disabled={bookingsLoading}
            />
            <CsvExportButton
              filename="admin-bookings.csv"
              headers={bookingExportHeaders}
              getRowsForExportAsync={exportAllBookingsCsv}
              exportRowCount={bookingsTotal}
              disabled={bookingsLoading}
            />
          </DataTableToolbar>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                {t("adminBookingsFilterSource")}
              </label>
              <select
                value={createdByFilter}
                onChange={(e) => setCreatedByFilter(e.target.value as "all" | "student" | "admin")}
                className={filterSelectClass}
                aria-label={t("adminBookingsFilterSource")}
              >
                <option value="all">{t("accountsFilterAll")}</option>
                <option value="student">{t("adminBookingsFilterSourceStudent")}</option>
                <option value="admin">{t("adminBookingsFilterSourceAdmin")}</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                {t("adminClassScheduleFiltersLessonType")}
              </label>
              <select
                value={lessonTypeFilter}
                onChange={(e) => setLessonTypeFilter(e.target.value)}
                className={filterSelectClass}
                aria-label={t("filterByType")}
              >
                <option value="all">{t("adminBookingsFilterAllTypes")}</option>
                <option value="practical">{t("lessonTypePractical")}</option>
                <option value="theory">{t("lessonTypeTheory")}</option>
                <option value="theory_personal">{t("lessonTypeTheoryPersonal")}</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                {t("adminClassScheduleFiltersStatus")}
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={filterSelectClass}
                aria-label={t("filterByStatus")}
              >
                <option value="all">{t("accountsFilterAll")}</option>
                <option value="confirmed">{t("confirmed")}</option>
                <option value="pending">{t("pending")}</option>
                <option value="pending_student_cancel">{t("statusFilterCancellationPending")}</option>
                <option value="cancelled">{t("cancelled")}</option>
                <option value="refunded">{t("refunded")}</option>
              </select>
            </div>
            {activeBookingsTab === "all" ? (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  {t("filterByPaymentStatus")}
                </label>
                <select
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value as BookingPaymentFilter)}
                  className={filterSelectClass}
                  aria-label={t("filterByPaymentStatus")}
                >
                  <option value="all">{t("accountsFilterAll")}</option>
                  <option value="paid">{t("adminBookingPaymentStatusPaid")}</option>
                  <option value="partial">{t("adminBookingPaymentStatusPartial")}</option>
                  <option value="unpaid">{t("adminBookingPaymentStatusUnpaid")}</option>
                  <option value="outstanding">{t("adminBookingsFilterPaymentOutstanding")}</option>
                </select>
              </div>
            ) : null}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                {t("adminClassScheduleFiltersStudent")}
              </label>
              <select
                value={studentFilter}
                onChange={(e) => setStudentFilter(e.target.value)}
                className={filterSelectClass}
                aria-label={t("adminClassScheduleFiltersStudent")}
              >
                <option value="">{t("accountsFilterAll")}</option>
                {studentsMini.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                {t("adminClassScheduleFiltersInstructor")}
              </label>
              <select
                value={instructorFilter}
                onChange={(e) => setInstructorFilter(e.target.value)}
                className={filterSelectClass}
                aria-label={t("adminClassScheduleFiltersInstructor")}
              >
                <option value="">{t("accountsFilterAll")}</option>
                {instructors.map((ins) => (
                  <option key={ins.id} value={String(ins.id)}>
                    {ins.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <AdminTableScroll>
          <table className="w-full text-sm min-w-[74rem]">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium whitespace-nowrap">{t("tableColId")}</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">{t("bookingColStudent")}</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">{t("adminColBranch")}</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">{t("cohortColInstructor")}</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">{t("date")}</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">{t("bookingColTime")}</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">{t("bookingColType")}</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">{t("adminBookingsColSource")}</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">{t("status")}</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">{t("adminBookingsColPayment")}</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap text-right">{t("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {bookingsLoading ? (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center text-muted-foreground">
                    {t("loading")}…
                  </td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center text-muted-foreground">
                    {t(activeBookingsTab === "debts" ? "adminBookingsEmptyDebts" : "adminBookingsEmptyFiltered")}
                  </td>
                </tr>
              ) : null}
              {bookings.map((b) => (
                <AdminTableRowContextMenu
                  key={b.id}
                  actions={[
                    {
                      kind: "item",
                      id: "edit",
                      label: t("edit"),
                      icon: Edit2,
                      onClick: () => {
                        setBookingModalTab("booking");
                        setEditBooking({ ...b, status: toCanonicalBookingStatus(b.status) });
                      },
                    },
                    ...(b.cancellationRequestedAt
                      ? [
                          {
                            kind: "item" as const,
                            id: "approve-cancel",
                            label: t("adminBookingApproveCancellation"),
                            icon: CheckCircle2,
                            onClick: () => setStaffCancellationDialog({ kind: "approve", booking: b }),
                          },
                          {
                            kind: "item" as const,
                            id: "reject-cancel",
                            label: t("adminBookingRejectCancellation"),
                            icon: Ban,
                            destructive: true,
                            onClick: () => setStaffCancellationDialog({ kind: "reject", booking: b }),
                          },
                        ]
                      : []),
                    {
                      kind: "item",
                      id: "delete",
                      label: t("delete"),
                      icon: Trash2,
                      destructive: true,
                      onClick: () => setDeleteId(b.id),
                    },
                  ]}
                >
                  <tr className="hover:bg-muted/30">
                    <td className="px-4 py-3.5 text-muted-foreground text-xs font-mono whitespace-nowrap">{b.id}</td>
                    <td className="px-4 py-3.5 font-medium text-foreground whitespace-nowrap">{studentLabel(b.studentId, b)}</td>
                    <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap max-w-[10rem] truncate" title={branchNameById(branches, b.branchId)}>
                      {branchNameById(branches, b.branchId)}
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">{b.instructorName}</td>
                    <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">{formatShortDateFromIso(b.dateIso, lang)}</td>
                    <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap tabular-nums">
                      {formatBookingSlotRangeLabel(b.time, b.endTime)}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge className={`text-xs ${typeColor[b.type] ?? typeColor.practical}`}>{t(bookingLessonTypeTKey(b.type))}</Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge
                        className={`text-xs ${BOOKING_SOURCE_BADGE_CLASS[b.createdByType ?? "unknown"] ?? BOOKING_SOURCE_BADGE_CLASS.unknown}`}
                      >
                        {t(bookingSourceLabelKey(b.createdByType ?? "unknown"))}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col gap-1.5 items-start">
                        <Badge
                          className={`text-xs ${BOOKING_STATUS_BADGE_CLASS[toCanonicalBookingStatus(b.status)] ?? BOOKING_STATUS_BADGE_CLASS.pending}`}
                        >
                          {t(toCanonicalBookingStatus(b.status) as TranslationKey)}
                        </Badge>
                        {b.cancellationRequestedAt ? (
                          <Badge className="text-xs bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-100">
                            {t("adminBookingCancellationBadge")}
                          </Badge>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {(() => {
                        const pay = bookingListPaymentRow(b);
                        if (pay.status === "na") {
                          return <span className="text-xs text-muted-foreground">—</span>;
                        }
                        return (
                          <div className="flex flex-col gap-1 items-start min-w-[7.5rem]">
                            <Badge className={`text-xs ${BOOKING_LIST_PAYMENT_BADGE_CLASS[pay.status]}`}>
                              {t(bookingListPaymentLabelKey(pay.status))}
                            </Badge>
                            {pay.totalAmd > 0 ? (
                              <div className="text-xs text-muted-foreground tabular-nums leading-snug">
                                <span className="text-foreground">{formatAmd(pay.paidAmd)}</span>
                                <span className="mx-0.5">/</span>
                                <span>{formatAmd(pay.totalAmd)}</span>
                                {pay.remainingAmd > 0 ? (
                                  <div className="text-amber-700 font-medium">
                                    {t("adminBookingPaymentRemaining")}: {formatAmd(pay.remainingAmd)}
                                  </div>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col items-end gap-2">
                        {b.cancellationRequestedAt ? (
                          <div className="flex flex-wrap justify-end gap-1.5">
                            <Button
                              type="button"
                              size="sm"
                              className="h-8 text-xs"
                              disabled={cancellationStaffBusyId === String(b.id)}
                              onClick={() => setStaffCancellationDialog({ kind: "approve", booking: b })}
                            >
                              {t("adminBookingApproveCancellation")}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs"
                              disabled={cancellationStaffBusyId === String(b.id)}
                              onClick={() => setStaffCancellationDialog({ kind: "reject", booking: b })}
                            >
                              {t("adminBookingRejectCancellation")}
                            </Button>
                          </div>
                        ) : null}
                        <AdminTableRowActions
                          toolbarOnly
                          actions={[
                            {
                              kind: "item",
                              id: "edit",
                              label: t("edit"),
                              icon: Edit2,
                              onClick: () => {
                                setBookingModalTab("booking");
                                setEditBooking({ ...b, status: toCanonicalBookingStatus(b.status) });
                              },
                            },
                            ...(b.cancellationRequestedAt
                              ? ([
                                  {
                                    kind: "item" as const,
                                    id: "approve-cancel",
                                    label: t("adminBookingApproveCancellation"),
                                    icon: CheckCircle2,
                                    onClick: () => setStaffCancellationDialog({ kind: "approve", booking: b }),
                                  },
                                  {
                                    kind: "item" as const,
                                    id: "reject-cancel",
                                    label: t("adminBookingRejectCancellation"),
                                    icon: Ban,
                                    destructive: true,
                                    onClick: () => setStaffCancellationDialog({ kind: "reject", booking: b }),
                                  },
                                ] as const)
                              : []),
                            {
                              kind: "item",
                              id: "delete",
                              label: t("delete"),
                              icon: Trash2,
                              destructive: true,
                              onClick: () => setDeleteId(b.id),
                            },
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                </AdminTableRowContextMenu>
              ))}
            </tbody>
          </table>
        </AdminTableScroll>
        <div className="px-4 py-3 border-t border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {t("panelShowingLabel")}{" "}
            {bookingsTotal === 0
              ? "0"
              : `${(bookingsPage - 1) * bookingsPageSize + 1}-${Math.min(bookingsTotal, bookingsPage * bookingsPageSize)}`}{" "}
            / {bookingsTotal} {t("bookings")}
          </p>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={bookingsPage <= 1 || bookingsLoading}
              onClick={() => setBookingsPage((p) => Math.max(1, p - 1))}
            >
              ‹
            </Button>
            <span className="text-xs text-muted-foreground px-2">
              {bookingsPage} / {bookingsTotalPages}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={bookingsPage >= bookingsTotalPages || bookingsLoading}
              onClick={() => setBookingsPage((p) => Math.min(bookingsTotalPages, p + 1))}
            >
              ›
            </Button>
          </div>
        </div>
      </Card>
        </TabsContent>
      </Tabs>

      <AppModal
        open={!!editBooking}
        onOpenChange={(o) => {
          if (!o) {
            setEditBooking(null);
            setEditSlotPick(null);
            setEditPracticalLessonType("");
            setEditTheoryThemeTitles([]);
            lastEditSlotInitKey.current = "";
            setBookingModalTab("booking");
          }
        }}
        title={t("bookingDialogEditTitle")}
        contentClassName={
          editBooking &&
          (editBooking.type === "practical" || editBooking.type === "theory" || editBooking.type === "theory_personal")
            ? "w-full max-w-[min(100vw-2rem,90rem)] sm:max-w-[min(100vw-2rem,90rem)] h-[min(94vh,980px)]"
            : "w-full max-w-[calc(100%-2rem)] sm:max-w-3xl h-[min(92vh,900px)]"
        }
        footer={
          editBooking ? (
            <div className="flex gap-2 sm:gap-3 flex-1 min-w-0 w-full">
              <Button
                type="button"
                variant="outline"
                className="flex-1 min-w-0"
                onClick={() => {
                  setEditBooking(null);
                  setEditSlotPick(null);
                  setEditPracticalLessonType("");
                  setEditTheoryThemeTitles([]);
                  lastEditSlotInitKey.current = "";
                }}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" form={editBookingFormId} className="flex-1 min-w-0 bg-primary hover:bg-primary/90 text-primary-foreground">
                {t("save")}
              </Button>
            </div>
          ) : null
        }
      >
        {editBooking && (
          <form id={editBookingFormId} onSubmit={handleEdit} className="space-y-4">
            <Tabs value={bookingModalTab} onValueChange={(v) => onBookingModalTabChange(v, "edit")}>
              <TabsList className="grid w-full grid-cols-2 h-11">
                <TabsTrigger value="booking" className="text-sm">
                  {t("adminBookingModalTabBooking")}
                </TabsTrigger>
                <TabsTrigger value="payment" className="text-sm">
                  {t("adminBookingModalTabPayment")}
                </TabsTrigger>
              </TabsList>
              <TabsContent
                value="booking"
                forceMount
                className="mt-4 space-y-3 data-[state=inactive]:hidden"
              >
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">{t("bookingColStudent")}</label>
                  <AdminStudentPicker
                    students={studentsMini.map<AdminStudentMini>((s) => ({
                      id: s.id,
                      name: s.name,
                      email: s.email ?? "",
                      phone: s.phone ?? "",
                      phone2: s.phone2 ?? "",
                    }))}
                    value={editBooking.studentId}
                    onChange={(s) => {
                      if (!s) return;
                      setEditBooking({ ...editBooking, studentId: s.id });
                    }}
                    branchIdForNewStudent={editBooking.branchId}
                    onStudentCreated={(s) => {
                      void refreshStudentsMini();
                      setStudentNames((prev) => ({ ...prev, [s.id]: s.name }));
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">{t("bookingColType")}</label>
                  <select
                    value={editBooking.type}
                    onChange={(e) => {
                      const type = e.target.value as Booking["type"];
                      const next: Booking = { ...editBooking, type };
                      lastEditSlotInitKey.current = "";
                      if (type !== "theory") setEditTheoryCohortId("");
                      if (type === "practical") {
                        next.instructorName = defaultPracticalInstructorName || next.instructorName;
                      }
                      if (type === "theory_personal") {
                        next.instructorName = theoryPersonalInstructorNames[0] ?? next.instructorName;
                      }
                      setEditBooking(next);
                    }}
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="practical">{t("lessonTypePractical")}</option>
                    <option value="theory">{t("lessonTypeTheory")}</option>
                    <option value="theory_personal">{t("lessonTypeTheoryPersonal")}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">{t("status")}</label>
                  <select
                    value={editBooking.status}
                    onChange={(e) => setEditBooking({ ...editBooking, status: e.target.value })}
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="confirmed">{t("confirmed")}</option>
                    <option value="pending">{t("pending")}</option>
                    <option value="cancelled">{t("cancelled")}</option>
                    <option value="refunded">{t("refunded")}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">{t("adminSelectBranch")}</label>
                  <select
                    value={editBooking.branchId}
                    onChange={(e) => setEditBooking({ ...editBooking, branchId: e.target.value })}
                    disabled={editBooking.type === "theory" && !!editTheoryCohortId}
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                  >
                    {branches.map((br) => (
                      <option key={br.id} value={br.id}>
                        {br.name}
                      </option>
                    ))}
                  </select>
                </div>
                {editBooking.type === "theory" ? (
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">{t("adminBookingTheoryCohortLabel")}</label>
                    <select
                      value={editTheoryCohortId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setEditTheoryCohortId(id);
                        setEditSlotPick(null);
                        lastEditSlotInitKey.current = "";
                        const c = editTheoryCohorts.find((x) => x.id === id);
                        if (c) {
                          setEditBooking((eb) =>
                            eb
                              ? {
                                  ...eb,
                                  branchId: c.branchId,
                                  instructorName: c.instructorName,
                                }
                              : eb,
                          );
                        }
                      }}
                      className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">{t("adminBookingTheoryCohortPlaceholder")}</option>
                      {editTheoryCohorts.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} — {c.instructorName}
                          {theoryCohortSelectSuffix(c)}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
                {editBooking.type === "practical" ? (
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">{t("bookingStepLessonType")}</label>
                    <select
                      value={editPracticalLessonType}
                      onChange={(e) => setEditPracticalLessonType(e.target.value as PracticalLessonType | "")}
                      className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">{t("bookingSelectLessonTypePlaceholder")}</option>
                      {PRACTICAL_LESSON_TYPES.map((value) => (
                        <option key={value} value={value}>
                          {getLessonTypeLabel(value)}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
                {editBooking.type === "practical" ? (
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">{t("cohortColInstructor")}</label>
                    <select
                      value={editBooking.instructorName}
                      onChange={(e) => {
                        setEditBooking({ ...editBooking, instructorName: e.target.value });
                        lastEditSlotInitKey.current = "";
                      }}
                      className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {practicalInstructorsForEdit.map((ins) => (
                        <option key={ins.id} value={ins.name}>
                          {ins.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
                {editBooking.type === "theory_personal" ? (
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">{t("cohortLabelMeetLink")}</label>
                    <Input
                      value={editBooking.meetLink ?? ""}
                      onChange={(e) => setEditBooking({ ...editBooking, meetLink: e.target.value })}
                      placeholder={t("cohortPlaceholderMeetLink")}
                      className="h-10"
                    />
                  </div>
                ) : null}
                {editBooking.type === "theory_personal" ? (
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">{t("examTestsTopicsHeading")}</label>
                    <MultiSelectDropdown
                      options={thematicTitles.map((title) => ({ value: title, label: title }))}
                      value={editTheoryThemeTitles}
                      onChange={(next) => setEditTheoryThemeTitles(next as string[])}
                      placeholder={t("examTestsTopicsHeading")}
                      ariaLabel={t("examTestsTopicsHeading")}
                    />
                  </div>
                ) : null}
                {editBooking.type === "theory_personal" ? (
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1">{t("cohortColInstructor")}</label>
                    <select
                      value={editBooking.instructorName}
                      onChange={(e) => {
                        setEditBooking({ ...editBooking, instructorName: e.target.value });
                        lastEditSlotInitKey.current = "";
                      }}
                      className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {theoryPersonalInstructorsForEdit.map((ins) => (
                        <option key={ins.id} value={ins.name}>
                          {ins.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
                {editBooking.type === "practical" || editBooking.type === "theory" || editBooking.type === "theory_personal" ? (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <p className="text-sm text-muted-foreground">{t("bookingColTime")}</p>
                    {editSlotPick && (editSlotPick.slotEntries?.length ?? 0) > 0 ? (
                      <div className="rounded-lg border border-border bg-muted/20 px-3 py-2">
                        <ul className="space-y-1 text-sm text-foreground">
                          {editSlotPick.slotEntries!.map((entry, idx) => (
                            <li key={`${entry.dateIso}-${entry.time}-${idx}`}>
                              {formatShortDateFromIso(entry.dateIso, lang)} · {entry.time}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : editSlotPick && editSlotPick.times.length > 0 ? (
                      <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm text-foreground">
                        {formatShortDateFromIso(editSlotPick.dateIso, lang)} · {editSlotPick.times.join(", ")}
                      </div>
                    ) : (
                      <p className="text-xs text-amber-600 dark:text-amber-500">{t("adminBookingSlotsNotSelected")}</p>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">{t("date")}</label>
                      <Input
                        type="date"
                        value={editBooking.dateIso}
                        onChange={(e) => {
                          const dateIso = e.target.value;
                          const next = { ...editBooking, dateIso };
                          setEditBooking(next);
                        }}
                        className="h-10"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">{t("bookingColTime")}</label>
                      <Input
                        type="time"
                        value={editBooking.time}
                        onChange={(e) => setEditBooking({ ...editBooking, time: e.target.value })}
                        className="h-10"
                        step={60}
                      />
                    </div>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="payment" forceMount className="mt-4 data-[state=inactive]:hidden">
                {editSystemPayment ? (
                  <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-foreground">
                    <p>{t("adminBookingPaymentSystemLinked")}</p>
                    <p className="text-xs text-muted-foreground mt-2 tabular-nums">
                      {formatAmd(editSystemPayment.grossAmd)} · {t(methodTKey(editSystemPayment.method as TxMethod))}
                    </p>
                  </div>
                ) : (
                  <AdminBookingPaymentSection
                    totalPriceAmd={editBooking.totalPriceAmd ?? 0}
                    value={editBookingPayment}
                    onChange={setEditBookingPayment}
                    errorKey={editPaymentErrorKey}
                  />
                )}
              </TabsContent>
            </Tabs>
          </form>
        )}
      </AppModal>

      <AppModal
        open={addOpen}
        onOpenChange={(o) => {
          setAddOpen(o);
          if (!o) {
            pendingTheoryRequestIdRef.current = null;
            setDraft(null);
            setBookingModalTab("booking");
            setAddFlowKind("practical");
            setAddPackageId("");
            setAddPackagePracticalSlotPick(null);
            setAddPackageTheoryInstructorName("");
            setAddPackageTheorySlotPick(null);
            setAddPracticalLessonType("");
            setAddTheoryThemeTitles([]);
            setAddInlineErrors({ general: null, slots: null, packagePracticalSlots: null, packageTheorySlots: null });
          }
        }}
        title={t("bookingDialogAddTitle")}
        contentClassName={
          draft
            ? "w-full max-w-[min(100vw-2rem,90rem)] sm:max-w-[min(100vw-2rem,90rem)] h-[min(94vh,980px)]"
            : "w-full max-w-[calc(100%-2rem)] sm:max-w-3xl h-[min(92vh,900px)]"
        }
        footer={
          draft ? (
            <div className="flex gap-3 w-full">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" form={addBookingFormId} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">
                {t("addNew")}
              </Button>
            </div>
          ) : null
        }
      >
        {draft && (
          <form id={addBookingFormId} onSubmit={handleAdd} className="space-y-4">
            <Tabs value={bookingModalTab} onValueChange={(v) => onBookingModalTabChange(v, "add")}>
              <TabsList className="grid w-full grid-cols-2 h-11">
                <TabsTrigger value="booking" className="text-sm">
                  {t("adminBookingModalTabBooking")}
                </TabsTrigger>
                <TabsTrigger value="payment" className="text-sm">
                  {t("adminBookingModalTabPayment")}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="booking" forceMount className="mt-4 data-[state=inactive]:hidden">
                <div className="space-y-3 min-w-0">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">{t("bookingColStudent")}</label>
                      <AdminStudentPicker
                        students={studentsMini.map<AdminStudentMini>((s) => ({
                          id: s.id,
                          name: s.name,
                          email: s.email ?? "",
                          phone: s.phone ?? "",
                          phone2: s.phone2 ?? "",
                        }))}
                        value={draft.studentId}
                        onChange={(s) => {
                          if (!s) return;
                          setDraft({ ...draft, studentId: s.id });
                        }}
                        branchIdForNewStudent={draft.branchId}
                        invalid={addFieldInvalid.student}
                        onStudentCreated={(s) => {
                          void refreshStudentsMini();
                          setStudentNames((prev) => ({ ...prev, [s.id]: s.name }));
                        }}
                      />
                      {addFieldInvalid.student ? (
                        <p className="mt-1 text-xs text-red-600">{t("adminBookingValSelectStudent")}</p>
                      ) : null}
                    </div>
                    <BookingTypeSelector
                      value={addFlowKind}
                      onChange={handleAddFlowKindChange}
                      label={t("bookingColType")}
                      t={t}
                    />
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">{t("status")}</label>
                      <select
                        value={draft.status}
                        onChange={(e) => setDraft({ ...draft, status: e.target.value })}
                        className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="confirmed">{t("confirmed")}</option>
                        <option value="pending">{t("pending")}</option>
                        <option value="cancelled">{t("cancelled")}</option>
                        <option value="refunded">{t("refunded")}</option>
                      </select>
                    </div>
                    {theoryCohortsLoadError ? (
                      <p className="text-xs text-amber-600 dark:text-amber-500">{t("couldNotLoadData")}</p>
                    ) : null}
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">{t("adminSelectBranch")}</label>
                      <select
                        value={draft.branchId}
                        onChange={(e) => setDraft({ ...draft, branchId: e.target.value })}
                        disabled={
                          addFlowKind === "theory_group" && !!theoryCohortId
                        }
                        className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                      >
                        {branches.map((br) => (
                          <option key={br.id} value={br.id}>
                            {br.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    {addInlineErrors.general ? (
                      <p className="text-xs text-red-600">{addInlineErrors.general}</p>
                    ) : null}

                    {addFlowKind === "theory_group" ? (
                      <div>
                        <GroupLessonSelector
                          label={t("adminBookingTheoryCohortLabel")}
                          placeholderKey="adminBookingTheoryCohortPlaceholder"
                          cohorts={addTheoryCohorts}
                          valueId={theoryCohortId}
                          onChangeId={(id) => {
                            setTheoryCohortId(id);
                            setSlotPick(null);
                            const c = addTheoryCohorts.find((x) => x.id === id);
                            if (c) {
                              const plan = theoryGroupSlotPlanFromCohort(c);
                              setDraft((d) =>
                                d
                                  ? {
                                      ...d,
                                      branchId: c.branchId,
                                      instructorName: c.instructorName,
                                      ...(plan
                                        ? { dateIso: plan.dateIso, time: plan.times[0] ?? d.time }
                                        : {}),
                                    }
                                  : d,
                              );
                            }
                          }}
                          formatOptionSuffix={(c) => theoryCohortSelectSuffix(c)}
                          t={t}
                        />
                        {addFieldInvalid.theoryGroup ? (
                          <p className="mt-1 text-xs text-red-600">{t("adminBookingValSelectTheoryGroup")}</p>
                        ) : null}
                      </div>
                    ) : null}

                    {addFlowKind === "practical" ? (
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                          {t("bookingStepLessonType")}
                        </label>
                        <select
                          value={addPracticalLessonType}
                          onChange={(e) => setAddPracticalLessonType(e.target.value as PracticalLessonType | "")}
                          className={cn(
                            "w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring",
                            addFieldInvalid.practicalLessonType && "border-red-500 focus:ring-red-500",
                          )}
                        >
                          <option value="">{t("bookingSelectLessonTypePlaceholder")}</option>
                          {PRACTICAL_LESSON_TYPES.map((value) => (
                            <option key={value} value={value}>
                              {getLessonTypeLabel(value)}
                            </option>
                          ))}
                        </select>
                        {addFieldInvalid.practicalLessonType ? (
                          <p className="mt-1 text-xs text-red-600">{t("fillRequired")}</p>
                        ) : null}
                      </div>
                    ) : null}
                    {addFlowKind === "theory_personal" ? (
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">{t("cohortLabelMeetLink")}</label>
                        <Input
                          value={draft.meetLink ?? ""}
                          onChange={(e) => setDraft({ ...draft, meetLink: e.target.value })}
                          placeholder={t("cohortPlaceholderMeetLink")}
                          className="h-10"
                        />
                      </div>
                    ) : null}

                    {addFlowKind === "theory_personal" ? (
                      <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">
                          {t("examTestsTopicsHeading")}
                        </label>
                        <MultiSelectDropdown
                          options={thematicTitles.map((title) => ({ value: title, label: title }))}
                          value={addTheoryThemeTitles}
                          onChange={(next) => setAddTheoryThemeTitles(next as string[])}
                          placeholder={t("examTestsTopicsHeading")}
                          ariaLabel={t("examTestsTopicsHeading")}
                        />
                        {addFieldInvalid.theoryThemes ? (
                          <p className="mt-1 text-xs text-red-600">{t("fillRequired")}</p>
                        ) : null}
                      </div>
                    ) : null}

                    {addFlowKind === "package" ? (
                      <>
                        <PackageSelector
                          label={t("packages")}
                          packages={packagesList.filter((p) => String(p.status).toLowerCase() === "active")}
                          valueId={addPackageId}
                          onChangeId={(id) => {
                            setAddPackageId(id);
                            setAddPackagePracticalSlotPick(null);
                            setAddPackageTheoryInstructorName("");
                            setAddPackageTheorySlotPick(null);
                            setAddInlineErrors({ general: null, slots: null, packagePracticalSlots: null, packageTheorySlots: null });
                          }}
                          loading={packagesLoading}
                          error={packagesFetchError}
                          emptyHintKey="adminBookingPackagesEmpty"
                          t={t}
                        />
                        {selectedAddPackage ? (
                          <>
                          <p className="text-sm text-muted-foreground">{t("adminBookingPackageSlotsOptionalHint")}</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {selectedAddPackage.lessons > 0 ? (
                              <Card className="border-border p-3">
                                <p className="text-xs text-muted-foreground">{t("lessonTypePractical")}</p>
                                <p className="text-sm font-semibold text-foreground">
                                  {packageSelectionStats.practical.selected} / {packageSelectionStats.practical.total}{" "}
                                  {t("selected")}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {t("booked")}: {packageSelectionStats.practical.booked}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {t("dashboardProgressPracticalRemaining")}: {packageSelectionStats.practical.remaining}
                                </p>
                              </Card>
                            ) : null}
                            {selectedAddPackage.theoryLessons > 0 ? (
                              <Card className="border-border p-3">
                                <p className="text-xs text-muted-foreground">{t("lessonTypeTheoryPersonal")}</p>
                                <p className="text-sm font-semibold text-foreground">
                                  {packageSelectionStats.theory.selected} / {packageSelectionStats.theory.total}{" "}
                                  {t("selected")}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {t("booked")}: {packageSelectionStats.theory.booked}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {t("dashboardLessonsTheoryCredits")}: {packageSelectionStats.theory.remaining}
                                </p>
                              </Card>
                            ) : null}
                          </div>
                          </>
                        ) : null}
                        {selectedAddPackage && selectedAddPackage.lessons > 0 ? (
                          <>
                            <p className="text-sm font-semibold text-foreground">Գործնական դասեր</p>
                            <SlotSelector
                              slotSource="practical"
                              hint={t("adminBookingPackagePracticalSlotsHint").replace(
                                /%n/g,
                                String(selectedAddPackage.lessons),
                              )}
                              selectedInstructorId={packagePracticalCalendarInstructorId}
                              instructors={practicalInstructorsForGrid}
                              onInstructorChange={(id, opts) => {
                                const ins = instructors.find((i) => i.id === id);
                                if (ins) {
                                  setDraft((d) => (d ? { ...d, instructorName: ins.name } : d));
                                  if (!opts?.fromGridPick) {
                                    setAddPackagePracticalSlotPick(null);
                                    setAddInlineErrors((prev) => ({ ...prev, packagePracticalSlots: null }));
                                  }
                                }
                              }}
                              onBranchPicked={(bid, opts) => {
                                setDraft((d) => (d ? { ...d, branchId: bid } : d));
                                if (!opts?.fromGridPick) setAddPackagePracticalSlotPick(null);
                              }}
                              branchId={draft.branchId}
                              studentName={studentLabel(draft.studentId)}
                              showInstructorPicker
                              onBookingConfirmed={(p) => {
                                setAddPackagePracticalSlotPick(p);
                                setAddInlineErrors((prev) => ({ ...prev, packagePracticalSlots: null }));
                              }}
                              onAdminSelectionCleared={() => {
                                setAddPackagePracticalSlotPick(null);
                                setAddInlineErrors((prev) => ({ ...prev, packagePracticalSlots: null }));
                              }}
                              calendarKey={`add-pkg-prac-${addSlotSessionId}-${addPackageId}`}
                              maxSelectableSlots={packageSelectionStats.practical.remainingBeforeSelection}
                              maxSelectableSlotsErrorKey="adminBookingValPackagePracticalCount"
                              reloadKey={busyGridReloadKey}
                              t={t}
                            />
                            {addInlineErrors.packagePracticalSlots ? (
                              <p className="mt-1 text-xs text-red-600">{addInlineErrors.packagePracticalSlots}</p>
                            ) : null}
                          </>
                        ) : null}
                        {selectedAddPackage && selectedAddPackage.theoryLessons > 0 ? (
                          <>
                            <p className="text-sm font-semibold text-foreground">Տեսական անհատական դասեր</p>
                            <SlotSelector
                              hint="Կարող եք ժամերը ընտրել հիմա կամ ավելի ուշ"
                              selectedInstructorId={packageTheoryCalendarInstructorId}
                              instructors={theoryInstructorsForGrid}
                              onInstructorChange={(id, opts) => {
                                const ins = instructors.find((i) => i.id === id);
                                if (ins) {
                                  setAddPackageTheoryInstructorName(ins.name);
                                  if (!opts?.fromGridPick) {
                                    setAddPackageTheorySlotPick(null);
                                    setAddInlineErrors((prev) => ({ ...prev, packageTheorySlots: null }));
                                  }
                                }
                              }}
                              onBranchPicked={(bid, opts) => {
                                setDraft((d) => (d ? { ...d, branchId: bid } : d));
                                if (!opts?.fromGridPick) setAddPackageTheorySlotPick(null);
                              }}
                              branchId={draft.branchId}
                              studentName={studentLabel(draft.studentId)}
                              showInstructorPicker
                              onBookingConfirmed={(p) => {
                                setAddPackageTheorySlotPick(p);
                                setAddInlineErrors((prev) => ({ ...prev, packageTheorySlots: null }));
                              }}
                              onAdminSelectionCleared={() => {
                                setAddPackageTheorySlotPick(null);
                                setAddInlineErrors((prev) => ({ ...prev, packageTheorySlots: null }));
                              }}
                              calendarKey={`add-pkg-th-${addSlotSessionId}-${addPackageId}`}
                              maxSelectableSlots={packageSelectionStats.theory.remainingBeforeSelection}
                              maxSelectableSlotsErrorKey="adminBookingValPackageTheoryCount"
                              reloadKey={busyGridReloadKey}
                              t={t}
                            />
                            {addInlineErrors.packageTheorySlots ? (
                              <p className="mt-1 text-xs text-red-600">{addInlineErrors.packageTheorySlots}</p>
                            ) : null}
                          </>
                        ) : null}
                      </>
                    ) : null}

                    {addFlowKind === "practical" ? (
                      <div>
                        <SlotSelector
                          slotSource="practical"
                          selectedInstructorId={calendarInstructorId}
                          instructors={practicalInstructorsForGrid}
                          onInstructorChange={(id, opts) => {
                            const ins = instructors.find((i) => i.id === id);
                            if (ins) {
                              setDraft((d) => (d ? { ...d, instructorName: ins.name } : d));
                              if (!opts?.fromGridPick) {
                                setSlotPick(null);
                                setAddInlineErrors((prev) => ({ ...prev, slots: null }));
                              }
                            }
                          }}
                          onBranchPicked={(bid, opts) => {
                            setDraft((d) => (d ? { ...d, branchId: bid } : d));
                            if (!opts?.fromGridPick) setSlotPick(null);
                          }}
                          branchId={draft.branchId}
                          studentName={studentLabel(draft.studentId)}
                          showInstructorPicker
                          onBookingConfirmed={(payload) => {
                            setSlotPick(payload);
                            setDraft((d) => {
                              if (!d) return d;
                              const next: Booking = {
                                ...d,
                                dateIso: payload.dateIso,
                                time: payload.time,
                                instructorName: payload.instructor || d.instructorName,
                              };
                              return next;
                            });
                          }}
                          onAdminSelectionCleared={() => {
                            setSlotPick(null);
                            setAddInlineErrors((prev) => ({ ...prev, slots: null }));
                          }}
                          calendarKey={`add-practical-${addSlotSessionId}`}
                          reloadKey={busyGridReloadKey}
                          t={t}
                        />
                        {addInlineErrors.slots ? (
                          <p className="mt-1 text-xs text-red-600">{addInlineErrors.slots}</p>
                        ) : null}
                        {addFieldInvalid.slots ? (
                          <p className="mt-1 text-xs text-red-600">{t("adminBookingValSelectSlots")}</p>
                        ) : null}
                      </div>
                    ) : null}

                    {addFlowKind === "theory_personal" ? (
                      <div>
                        <SlotSelector
                          selectedInstructorId={theoryPersonalCalendarInstructorId}
                          instructors={theoryInstructorsForGrid}
                          onInstructorChange={(id, opts) => {
                            const ins = instructors.find((i) => i.id === id);
                            if (ins) {
                              setDraft((d) => (d ? { ...d, instructorName: ins.name } : d));
                              if (!opts?.fromGridPick) {
                                setSlotPick(null);
                                setAddInlineErrors((prev) => ({ ...prev, slots: null }));
                              }
                            }
                          }}
                          onBranchPicked={(bid, opts) => {
                            setDraft((d) => (d ? { ...d, branchId: bid } : d));
                            if (!opts?.fromGridPick) setSlotPick(null);
                          }}
                          branchId={draft.branchId}
                          studentName={studentLabel(draft.studentId)}
                          showInstructorPicker
                          onBookingConfirmed={(payload) => {
                            setSlotPick(payload);
                            setDraft((d) => {
                              if (!d) return d;
                              const next: Booking = {
                                ...d,
                                dateIso: payload.dateIso,
                                time: payload.time,
                                instructorName: payload.instructor || d.instructorName,
                              };
                              return next;
                            });
                          }}
                          onAdminSelectionCleared={() => {
                            setSlotPick(null);
                            setAddInlineErrors((prev) => ({ ...prev, slots: null }));
                          }}
                          calendarKey={`add-personal-${addSlotSessionId}`}
                          reloadKey={busyGridReloadKey}
                          t={t}
                        />
                        {addInlineErrors.slots ? (
                          <p className="mt-1 text-xs text-red-600">{addInlineErrors.slots}</p>
                        ) : null}
                        {addFieldInvalid.slots ? (
                          <p className="mt-1 text-xs text-red-600">{t("adminBookingValSelectSlots")}</p>
                        ) : null}
                      </div>
                    ) : null}

                </div>
              </TabsContent>
              <TabsContent value="payment" forceMount className="mt-4 data-[state=inactive]:hidden">
                <AdminBookingPaymentSection
                  totalPriceAmd={addEffectiveTotalAmd}
                  value={addBookingPayment}
                  onChange={setAddBookingPayment}
                  errorKey={addPaymentErrorKey}
                />
              </TabsContent>
            </Tabs>
          </form>
        )}
      </AppModal>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title={t("bookingCancelTitle")}
        description={t("bookingCancelDesc")}
        confirmLabel={t("delete")}
        danger
      />

      <ConfirmDialog
        open={staffCancellationDialog !== null}
        onClose={() => setStaffCancellationDialog(null)}
        onConfirm={handleStaffCancellationConfirm}
        title={
          staffCancellationDialog?.kind === "approve"
            ? t("adminBookingApproveCancellationTitle")
            : t("adminBookingRejectCancellationTitle")
        }
        description={
          staffCancellationDialog?.kind === "approve"
            ? t("adminBookingApproveCancellationDesc")
            : t("adminBookingRejectCancellationDesc")
        }
        confirmLabel={
          staffCancellationDialog?.kind === "approve"
            ? t("adminBookingApproveCancellation")
            : t("adminBookingRejectCancellation")
        }
        danger={staffCancellationDialog?.kind === "reject"}
      />

      <ExcelBookingImportModal
        open={importOpen}
        onOpenChange={setImportOpen}
        branches={branches}
        instructors={instructors}
        defaultBranchId={importBranchId}
        onImported={() => void refresh()}
      />
    </AdminLayout>
  );
}
