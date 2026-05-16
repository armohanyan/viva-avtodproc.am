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
import TableColumnFilter, { TableColumnHeaderWithFilter } from "src/components/TableColumnFilter";
import PanelPageHeader from "src/components/PanelPageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "src/components/ui/tabs";
import { Plus, Edit2, Trash2, CalendarRange, CheckCircle2, Ban } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { type LessonBookingPayload } from "src/components/LessonBookingCalendar";
import type { AdminBookingFlowKind, AdminPackageOption, TheoryCohortOption } from "src/modules/admin/booking/types";
import { theoryGroupSlotPlanFromCohort } from "src/modules/admin/booking/theoryGroupSlotPlan";
import { isTheoryCohortBookableStatus } from "src/modules/admin/booking/adminTheoryCohort";
import BookingTypeSelector from "src/modules/admin/booking/BookingTypeSelector";
import InstructorSelector from "src/modules/admin/booking/InstructorSelector";
import GroupLessonSelector from "src/modules/admin/booking/GroupLessonSelector";
import PackageSelector from "src/modules/admin/booking/PackageSelector";
import SlotSelector from "src/modules/admin/booking/SlotSelector";
import CheckoutSummary, { type CheckoutSummaryLines } from "src/modules/admin/booking/CheckoutSummary";
import { useBookingPriceCalculator, type BookingPriceInput } from "src/modules/admin/booking/useBookingPriceCalculator";
import { validateAdminBookingAdd } from "src/modules/admin/booking/useBookingValidation";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { useOptionalAdminBranchFilterRevision } from "src/modules/admin/AdminBranchFilterProvider";
import { formatBookingSlotRangeLabel } from "src/data/studentDemoBookings";
import { branchNameById, useBranches } from "src/modules/branches";
import { allInstructorNames } from "src/modules/admin/adminPeople";
import { useInstructors } from "src/modules/instructors/useInstructors";
import MultiSelectDropdown from "src/components/MultiSelectDropdown";
import {
  PRACTICAL_LESSON_TYPES,
  getLessonTypeLabel,
  type PracticalLessonType,
} from "src/modules/instructors/instructor-booking";
import { cn } from "src/lib/utils";
import { defaultExamQuestionMeta, loadExamQuestionMeta } from "src/lib/examQuestionMeta";
import {
  type FinanceTx,
  type TxMethod,
  channelTKey,
  formatAmd,
  methodTKey,
  parseAmdInput,
  toDatetimeLocalValue,
} from "./finance/adminFinanceShared";
import { BOOKING_STATUS_BADGE_CLASS } from "src/constants/booking.constants";
import { toCanonicalBookingStatus } from "src/utils/booking.utils";
import { ApiRequestError } from "src/lib/api";

type StudentRow = { id: string; name: string; email?: string };

type Booking = {
  id: string;
  studentId: string;
  instructorName: string;
  dateIso: string;
  time: string;
  endTime?: string | null;
  /** Present when the server stored multiple `booking_slots` rows (multi-day / non-consecutive). */
  slotEntries?: { dateIso: string; time: string }[];
  totalPriceAmd?: number | null;
  type: "practical" | "theory" | "theory_personal";
  status: string;
  branchId: string;
  cancellationRequestedAt?: string | null;
  meetLink?: string | null;
};

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

function studentContact(students: StudentRow[], studentId: string): { name: string; email: string } {
  const s = students.find((x) => x.id === studentId);
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

function slotPickSummaryLine(pick: LessonBookingPayload | null): string | null {
  if (!pick) return null;
  if (pick.slotEntries && pick.slotEntries.length > 0) {
    return pick.slotEntries.map((e) => `${e.dateIso} ${e.time}`).join(" · ");
  }
  if (pick.times.length > 0) return `${pick.dateIso} · ${pick.times.join(", ")}`;
  return null;
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
  const [, setLocation] = useLocation();
  /** Wouter may include a leading `?`; strip so `URLSearchParams` parses keys correctly. */
  const bookingIntentSearch = (useSearch() ?? "").replace(/^\?/, "");
  const { t, lang } = useLang();
  const { showToast } = useToast();
  const { branches } = useBranches();
  const { instructors } = useInstructors();
  const instructorNames = useMemo(() => allInstructorNames(instructors), [instructors]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [studentNames, setStudentNames] = useState<Record<string, string>>({});
  const [studentsMini, setStudentsMini] = useState<StudentRow[]>([]);
  const [financeTxs, setFinanceTxs] = useState<FinanceTx[]>([]);

  const studentLabel = useCallback((id: string) => studentNames[id] ?? id, [studentNames]);

  const refresh = useCallback(async () => {
    try {
      const [bk, st, fin] = await Promise.all([
        vivaApiJson<Booking[]>("/bookings"),
        vivaApiJson<StudentRow[]>("/students"),
        vivaApiJson<FinanceTx[]>("/finance/transactions"),
      ]);
      setBookings(Array.isArray(bk) ? bk : []);
      const m: Record<string, string> = {};
      if (Array.isArray(st)) {
        setStudentsMini(st.map((r) => ({ id: r.id, name: r.name, email: r.email })));
        for (const r of st) m[r.id] = r.name;
      } else {
        setStudentsMini([]);
      }
      setStudentNames(m);
      setFinanceTxs(
        Array.isArray(fin) ? fin.map((tx) => ({ ...tx, bookingId: tx.bookingId ?? null })) : [],
      );
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    }
  }, [showToast]);

  useEffect(() => {
    void refresh();
  }, [refresh, branchFilterRevision]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [lessonTypeFilter, setLessonTypeFilter] = useState<"all" | "practical" | "theory" | "theory_personal">("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [staffCancellationDialog, setStaffCancellationDialog] = useState<
    { kind: "approve" | "reject"; booking: Booking } | null
  >(null);
  const [cancellationStaffBusyId, setCancellationStaffBusyId] = useState<string | null>(null);
  const [editBooking, setEditBooking] = useState<Booking | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState<Booking | null>(null);
  const [addInlineErrors, setAddInlineErrors] = useState<AddInlineErrors>({
    general: null,
    slots: null,
    packagePracticalSlots: null,
    packageTheorySlots: null,
  });
  const [bookingModalTab, setBookingModalTab] = useState<"booking" | "payment">("booking");
  const [addPayment, setAddPayment] = useState<BookingPaymentFields>(() => defaultPaymentFields());
  const [editPayment, setEditPayment] = useState<BookingPaymentFields>(() => defaultPaymentFields());
  /** Manual finance row id when editing a booking that already has a manual payment. */
  const [editManualTxId, setEditManualTxId] = useState<number | null>(null);
  /** When set, booking has a system-generated payment — show notice instead of form. */
  const [editSystemPayment, setEditSystemPayment] = useState<FinanceTx | null>(null);
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

  const practicalInstructorsForCalendar = useMemo(
    () => instructors.filter((i) => i.status === "active" && i.teachesPractical),
    [instructors],
  );

  const defaultPracticalInstructorName = useMemo(
    () => instructors.find((i) => i.status === "active" && i.teachesPractical)?.name ?? instructorNames[0] ?? "",
    [instructors, instructorNames],
  );

  const theoryPersonalInstructorNames = useMemo(
    () =>
      instructors.filter((i) => i.status === "active" && i.teachesTheory).map((i) => i.name),
    [instructors],
  );

  const theoryEditCalendarInstructors = useMemo(() => {
    const base = instructors.filter((i) => i.status === "active" && i.teachesTheory);
    if (editBooking?.type !== "theory" || !editTheoryCohortId) return base;
    const c = bookableTheoryCohorts.find((x) => x.id === editTheoryCohortId);
    if (!c) return base;
    const full = instructors.find((i) => i.name === c.instructorName);
    if (full && !base.some((b) => b.id === full.id)) {
      return [...base, full];
    }
    return base;
  }, [editBooking?.type, editTheoryCohortId, bookableTheoryCohorts, instructors]);

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

  const packageTheoryCalendarInstructors = useMemo(
    () => instructors.filter((i) => i.status === "active" && i.teachesTheory),
    [instructors],
  );

  const packageTheoryCalendarInstructorId = useMemo(() => {
    if (addPackageTheorySlotPick?.instructorUserId) {
      return String(addPackageTheorySlotPick.instructorUserId);
    }
    const name = addPackageTheorySlotPick?.instructor || addPackageTheoryInstructorName || "";
    const m = instructors.find((i) => i.name === name);
    return m?.id ?? packageTheoryCalendarInstructors[0]?.id ?? "";
  }, [addPackageTheorySlotPick, addPackageTheoryInstructorName, instructors, packageTheoryCalendarInstructors]);

  const theoryPersonalCalendarInstructors = useMemo(
    () => instructors.filter((i) => i.status === "active" && i.teachesTheory),
    [instructors],
  );

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

  useEffect(() => {
    if (!addOpen && !editBooking) return;
    let cancelled = false;
    void (async () => {
      try {
        const data = await vivaApiJson<
          {
            id: number;
            name: string;
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
  }, [addOpen, editBooking]);

  useEffect(() => {
    if (!addOpen && !editBooking) return;
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
  }, [addOpen, editBooking]);

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
    const matches = bookableTheoryCohorts.filter(
      (c) => c.branchId === editBooking.branchId && c.instructorName === editBooking.instructorName,
    );
    const next = matches[0]?.id ?? "";
    setEditTheoryCohortId((prev) => (prev && matches.some((m) => m.id === prev) ? prev : next));
  }, [editBooking, bookableTheoryCohorts]);

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
    (opts?: { studentId?: string; branchId?: string }) => {
      const pickStudent =
        opts?.studentId && studentsMini.some((s) => s.id === opts.studentId)
          ? opts.studentId
          : (studentsMini[0]?.id ?? "");
      const pickBranch =
        opts?.branchId && branches.some((b) => b.id === opts.branchId)
          ? opts.branchId
          : (branches[0]?.id ?? "");
      const newDraft: Booking = {
        id: "",
        studentId: pickStudent,
        instructorName: defaultPracticalInstructorName,
        dateIso: todayIsoDate(),
        time: "10:00",
        type: "practical",
        status: "confirmed",
        branchId: pickBranch,
        meetLink: null,
      };
      setAddFlowKind("practical");
      setAddPackageId("");
      setAddPackagePracticalSlotPick(null);
      setAddPackageTheoryInstructorName("");
      setAddPackageTheorySlotPick(null);
      setAddPracticalLessonType("");
      setAddTheoryThemeTitles([]);
      setSlotPick(null);
      setTheoryCohortId("");
      setDraft(newDraft);
      setAddPayment(defaultPaymentFields());
      setBookingModalTab("booking");
      setAddOpen(true);
    },
    [branches, defaultPracticalInstructorName, studentsMini],
  );

  const consumedBookingIntentSearch = useRef<string | null>(null);

  useEffect(() => {
    const raw = bookingIntentSearch || "";
    const p = new URLSearchParams(raw);
    const wantNew = p.get("new") === "1";
    const studentQ = p.get("student")?.trim() ?? "";
    const branchQ = p.get("branch")?.trim() ?? "";

    if (!wantNew && !studentQ) {
      consumedBookingIntentSearch.current = null;
      return;
    }
    if (consumedBookingIntentSearch.current === raw) return;
    if (studentQ && studentsMini.length === 0) return;

    const studentOk = !studentQ || studentsMini.some((s) => s.id === studentQ);
    if (!wantNew && studentQ && studentsMini.length > 0 && !studentOk) {
      consumedBookingIntentSearch.current = raw;
      setLocation("/admin/bookings", { replace: true });
      return;
    }

    const validStudent = studentQ && studentOk ? studentQ : "";
    const validBranch = branchQ && branches.some((b) => b.id === branchQ) ? branchQ : "";

    consumedBookingIntentSearch.current = raw;
    openAdd(
      validStudent
        ? { studentId: validStudent, ...(validBranch ? { branchId: validBranch } : {}) }
        : undefined,
    );
    setLocation("/admin/bookings", { replace: true });
  }, [bookingIntentSearch, branches, openAdd, setLocation, studentsMini]);

  useEffect(() => {
    const raw = bookingIntentSearch || "";
    const p = new URLSearchParams(raw);
    const editId = p.get("edit")?.trim() ?? "";
    const deleteIdQ = p.get("delete")?.trim() ?? "";
    if (!editId && !deleteIdQ) return;
    if (bookings.length === 0) return;
    if (editId) {
      const row = bookings.find((b) => String(b.id) === editId);
      if (row) {
        setBookingModalTab("booking");
        setEditBooking({ ...row, status: toCanonicalBookingStatus(row.status) });
      }
      setLocation("/admin/bookings", { replace: true });
      return;
    }
    if (deleteIdQ) {
      const row = bookings.find((b) => String(b.id) === deleteIdQ);
      if (row) {
        setDeleteId(String(row.id));
      }
      setLocation("/admin/bookings", { replace: true });
    }
  }, [bookingIntentSearch, bookings, setLocation]);

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
      theoryCohorts: bookableTheoryCohorts,
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
      bookableTheoryCohorts,
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
        theoryCohorts: bookableTheoryCohorts,
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
      bookableTheoryCohorts,
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

  const addCheckoutLines: CheckoutSummaryLines | null = useMemo(() => {
    if (!draft) return null;
    if (addFlowKind === "practical") {
      const lessonLabel = addPracticalLessonType ? getLessonTypeLabel(addPracticalLessonType) : "";
      return {
        typeLabel: t("lessonTypePractical"),
        detailLines: [lessonLabel, draft.instructorName].filter(Boolean),
        slotsLine: slotPickSummaryLine(slotPick),
      };
    }
    if (addFlowKind === "theory_group") {
      const c = bookableTheoryCohorts.find((x) => x.id === theoryCohortId);
      const plan = c ? theoryGroupSlotPlanFromCohort(c) : null;
      const details: string[] = [];
      if (c) details.push(`${c.name} — ${c.instructorName}`);
      if (c && c.priceAmd != null && Number.isFinite(Number(c.priceAmd)) && Number(c.priceAmd) >= 0) {
        details.push(`${t("cohortGroupPriceAmdLabel")}: ${formatAmd(Math.round(Number(c.priceAmd)))}`);
      } else if (c && plan && plan.times.length > 0) {
        const ins = instructors.find((i) => i.name === c.instructorName);
        const hourly = ins && Number.isFinite(ins.hourlyPrice) ? ins.hourlyPrice : 0;
        if (hourly > 0) {
          details.push(
            `${t("lessonPrice")}: ${formatAmd(Math.round(hourly))} / ${t("perHour")} · ${plan.times.length} ${t("bookingHoursUnit")}`,
          );
        }
      }
      return {
        typeLabel: t("adminBookingFlowTheoryGroup"),
        detailLines: details.length ? details : ["—"],
        slotsLine: plan ? `${plan.dateIso} · ${plan.times.join(", ")}` : null,
      };
    }
    if (addFlowKind === "theory_personal") {
      const themesLine = addTheoryThemeTitles.length > 0 ? addTheoryThemeTitles.join(", ") : "";
      return {
        typeLabel: t("lessonTypeTheoryPersonal"),
        detailLines: [draft.instructorName, themesLine].filter(Boolean),
        slotsLine: slotPickSummaryLine(slotPick),
      };
    }
    const pkg = selectedAddPackage;
    const lines: string[] = [];
    if (pkg) lines.push(pkg.name);
    if (pkg && pkg.lessons > 0) {
      lines.push(
        `${t("lessonTypePractical")}: ${packageSelectionStats.practical.selected}/${packageSelectionStats.practical.total} ${t("selected")}`,
      );
    }
    if (pkg && pkg.lessons > 0 && addPackagePracticalSlotPick) {
      lines.push(
        `${t("lessonTypePractical")}: ${addPackagePracticalSlotPick.instructor} · ${addPackagePracticalSlotPick.dateIso} · ${addPackagePracticalSlotPick.times.join(", ")}`,
      );
    }
    if (pkg && pkg.theoryLessons > 0) {
      lines.push(
        `${t("lessonTypeTheoryPersonal")}: ${packageSelectionStats.theory.selected}/${packageSelectionStats.theory.total} ${t("selected")}`,
      );
      if (addPackageTheorySlotPick && addPackageTheorySlotPick.times.length > 0) {
        lines.push(`${addPackageTheorySlotPick.dateIso} · ${addPackageTheorySlotPick.times.join(", ")}`);
      }
    }
    return {
      typeLabel: t("adminBookingFlowPackage"),
      detailLines: lines.length ? lines : ["—"],
      slotsLine: null,
    };
  }, [
    draft,
    addFlowKind,
    t,
    slotPick,
    theoryCohortId,
    bookableTheoryCohorts,
    instructors,
    selectedAddPackage,
    addPackagePracticalSlotPick,
    addPackageTheorySlotPick,
    addPracticalLessonType,
    addTheoryThemeTitles,
    packageSelectionStats.practical.selected,
    packageSelectionStats.practical.total,
    packageSelectionStats.theory.selected,
    packageSelectionStats.theory.total,
  ]);

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      const q = search.trim().toLowerCase();
      const branchLabel = branchNameById(branches, b.branchId);
      const stu = studentLabel(b.studentId);
      const dateLabel = formatShortDateFromIso(b.dateIso, lang);
      const timeLabel = formatBookingSlotRangeLabel(b.time, b.endTime);
      const hay = [b.id, stu, b.instructorName, dateLabel, timeLabel, b.time, b.type, b.status, branchLabel].join(" ").toLowerCase();
      const matchSearch = !q || hay.includes(q);
      const canon = toCanonicalBookingStatus(b.status);
      const matchStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "pending_student_cancel"
            ? Boolean(b.cancellationRequestedAt)
            : statusFilter === "pending"
              ? canon === "pending" || canon === "pending_payment"
              : canon === statusFilter;
      const matchLessonType = lessonTypeFilter === "all" || b.type === lessonTypeFilter;
      return matchSearch && matchStatus && matchLessonType;
    });
  }, [bookings, search, statusFilter, lessonTypeFilter, branches, lang, studentLabel]);

  useEffect(() => {
    if (!editBooking) {
      setEditManualTxId(null);
      setEditSystemPayment(null);
      return;
    }
    const bid = String(editBooking.id);
    const linked = financeTxs.filter((tx) => tx.bookingId === bid);
    const manual = linked.find((x) => x.source === "manual");
    const system = linked.find((x) => x.source === "system");
    if (manual) {
      setEditManualTxId(manual.id);
      setEditSystemPayment(null);
      setEditPayment({
        method: manual.method,
        grossStr: String(manual.grossAmd),
        datetimeLocal: toDatetimeLocalValue(new Date(manual.createdAt)),
      });
    } else if (system) {
      setEditManualTxId(null);
      setEditSystemPayment(system);
      const gross =
        editBooking.totalPriceAmd != null && editBooking.totalPriceAmd > 0 ? String(editBooking.totalPriceAmd) : "";
      setEditPayment({
        ...defaultPaymentFields(),
        grossStr: gross,
      });
    } else {
      setEditManualTxId(null);
      setEditSystemPayment(null);
      const gross =
        editBooking.totalPriceAmd != null && editBooking.totalPriceAmd > 0 ? String(editBooking.totalPriceAmd) : "";
      setEditPayment({
        ...defaultPaymentFields(),
        grossStr: gross,
      });
    }
  }, [editBooking, financeTxs]);

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
    payment: BookingPaymentFields,
    studentId: string,
    requireAmount: boolean,
  ): boolean => {
    const gross = parseAmdInput(payment.grossStr);
    if (!Number.isFinite(gross) || gross <= 0) {
      if (requireAmount) {
        showToast(t("financeManualErrorAmount"), "error");
        return false;
      }
      return true;
    }
    const created = new Date(payment.datetimeLocal);
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

  const postManualFinance = async (
    payment: BookingPaymentFields,
    ctx: { studentId: string; branchId: string; bookingIdNum: number | null; bookingStatus: string },
  ) => {
    const gross = parseAmdInput(payment.grossStr);
    const created = new Date(payment.datetimeLocal);
    const { name, email } = studentContact(studentsMini, ctx.studentId);
    const bid =
      ctx.bookingIdNum != null && Number.isFinite(ctx.bookingIdNum) && ctx.bookingIdNum > 0 ? ctx.bookingIdNum : null;
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
        bookingId: bid,
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
      const hasSlots =
        editSlotPick &&
        ((editSlotPick.slotEntries?.length ?? 0) > 0 || editSlotPick.times.length > 0);
      if (!hasSlots) {
        showToast(t("adminBookingSlotsNotSelected"), "error");
        return;
      }
      if (editBooking.type === "theory" && !editTheoryCohortId.trim()) {
        showToast(t("adminBookingTheoryCohortRequired"), "error");
        return;
      }
    } else if (!editBooking.instructorName || !editBooking.dateIso || !editBooking.time) {
      showToast(t("fillRequired"), "error");
      return;
    }
    try {
      const pick = editSlotPick!;
      const useArbitrarySlots =
        (editBooking.type === "practical" || editBooking.type === "theory_personal") &&
        (pick.slotEntries?.length ?? 0) > 0;
      const body =
        editBooking.type === "practical" || editBooking.type === "theory" || editBooking.type === "theory_personal"
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
            }
          : {
              studentId: editBooking.studentId,
              instructorName: editBooking.instructorName,
              dateIso: editBooking.dateIso,
              time: editBooking.time,
              type: editBooking.type,
              status: editBooking.status,
              branchId: Number(editBooking.branchId),
            };
      await vivaApiJson(`/bookings/${encodeURIComponent(editBooking.id)}`, {
        method: "PATCH",
        body,
      });
      const bookingIdNum = Number(editBooking.id);
      const financeDateIso = editSlotPick?.dateIso ?? editBooking.dateIso;
      if (!editSystemPayment) {
        const gross = parseAmdInput(editPayment.grossStr);
        const wantsNewOrUpdate = editManualTxId != null || (Number.isFinite(gross) && gross > 0);
        if (wantsNewOrUpdate) {
          const ok = validatePaymentForSubmit(editPayment, editBooking.studentId, editManualTxId != null);
          if (!ok) return;
          if (editManualTxId != null) {
            await patchManualFinance(editManualTxId, editPayment, {
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
            await postManualFinance(editPayment, {
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
    const gross = parseAmdInput(addPayment.grossStr);
    const wantsPayment = Number.isFinite(gross) && gross > 0;
    if (wantsPayment) {
      const ok = validatePaymentForSubmit(addPayment, draft.studentId, true);
      if (!ok) return;
    }
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
        const anchorBookingId = bookingIds.length > 0 ? Number(bookingIds[0]) : null;
        if (wantsPayment) {
          await postManualFinance(addPayment, {
            studentId: draft.studentId,
            branchId: draft.branchId,
            bookingIdNum: anchorBookingId,
            bookingStatus: draft.status,
          });
        }
      } else {
        const theoryCohort = bookableTheoryCohorts.find((x) => x.id === theoryCohortId);
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
              };
        const created = await vivaApiJson<{ id: number }>("/bookings", {
          method: "POST",
          body,
        });
        const bookingIdNum = Number(created.id);
        if (wantsPayment && Number.isFinite(bookingIdNum) && bookingIdNum > 0) {
          await postManualFinance(addPayment, {
            studentId: draft.studentId,
            branchId: draft.branchId,
            bookingIdNum,
            bookingStatus: draft.status,
          });
        }
      }
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

  const handleAddCheckoutContinue = useCallback(() => {
    const amt = addEffectiveTotalAmd;
    setAddPayment((p) => ({
      ...p,
      grossStr: amt > 0 ? String(amt) : p.grossStr,
    }));
    setBookingModalTab("payment");
  }, [addEffectiveTotalAmd]);

  const renderPaymentFields = (
    payment: BookingPaymentFields,
    setPayment: React.Dispatch<React.SetStateAction<BookingPaymentFields>>,
  ) => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-muted-foreground mb-1">{t("financeColMethod")}</label>
          <select
            value={payment.method}
            onChange={(e) => setPayment((p) => ({ ...p, method: e.target.value as TxMethod }))}
            className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="cash">{t("financeMethodCash")}</option>
            <option value="card">{t("financeMethodCard")}</option>
            <option value="transfer">{t("financeMethodTransfer")}</option>
            <option value="idram">{t("financeMethodIdram")}</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">{t("financeManualTxGrossLabel")}</label>
          <Input
            inputMode="decimal"
            value={payment.grossStr}
            onChange={(e) => setPayment((p) => ({ ...p, grossStr: e.target.value }))}
            className="h-10 tabular-nums"
            placeholder="55000"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">{t("financeColDateTime")}</label>
          <Input
            type="datetime-local"
            value={payment.datetimeLocal}
            onChange={(e) => setPayment((p) => ({ ...p, datetimeLocal: e.target.value }))}
            className="h-10"
          />
        </div>
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <PanelPageHeader
        icon={CalendarRange}
        title={t("bookings")}
        subtitle={t("adminBookingsPageSubtitle")}
        actions={
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2" onClick={() => openAdd()}>
            <Plus className="w-4 h-4" />
            {t("addNew")}
          </Button>
        }
      />

      <Card className="border-border overflow-hidden min-w-0">
        <DataTableToolbar value={search} onChange={setSearch} placeholder={`${t("search")}…`}>
          <CsvExportButton
            filename="admin-bookings.csv"
            headers={[
              t("tableColId"),
              t("bookingColStudent"),
              t("adminColBranch"),
              t("cohortColInstructor"),
              t("date"),
              t("bookingColTime"),
              t("bookingColType"),
              t("status"),
            ]}
            rows={filtered.map((b) => [
              b.id,
              studentLabel(b.studentId),
              branchNameById(branches, b.branchId),
              b.instructorName,
              formatShortDateFromIso(b.dateIso, lang),
              formatBookingSlotRangeLabel(b.time, b.endTime),
              t(bookingLessonTypeTKey(b.type)),
              t(toCanonicalBookingStatus(b.status) as TranslationKey),
            ])}
          />
        </DataTableToolbar>

        <AdminTableScroll>
          <table className="w-full text-sm min-w-[56rem]">
            <thead className="bg-muted/40">
              <tr>
                <TableColumnHeaderWithFilter title={t("tableColId")} />
                <TableColumnHeaderWithFilter title={t("bookingColStudent")} />
                <TableColumnHeaderWithFilter title={t("adminColBranch")} />
                <TableColumnHeaderWithFilter title={t("cohortColInstructor")} />
                <TableColumnHeaderWithFilter title={t("date")} />
                <TableColumnHeaderWithFilter title={t("bookingColTime")} />
                <TableColumnHeaderWithFilter
                  title={t("bookingColType")}
                  filter={
                    <TableColumnFilter
                      value={lessonTypeFilter}
                      onChange={(v) => setLessonTypeFilter(v as "all" | "practical" | "theory" | "theory_personal")}
                      ariaLabel={t("filterByType")}
                      options={[
                        { value: "all", label: t("filterOptionAll") },
                        { value: "practical", label: t("lessonTypePractical") },
                        { value: "theory", label: t("lessonTypeTheory") },
                        { value: "theory_personal", label: t("lessonTypeTheoryPersonal") },
                      ]}
                    />
                  }
                />
                <TableColumnHeaderWithFilter
                  title={t("status")}
                  filter={
                    <TableColumnFilter
                      value={statusFilter}
                      onChange={setStatusFilter}
                      ariaLabel={t("filterByStatus")}
                      options={[
                        { value: "all", label: t("filterOptionAll") },
                        { value: "pending_student_cancel", label: t("statusFilterCancellationPending") },
                        { value: "confirmed", label: t("confirmed") },
                        { value: "pending", label: t("pending") },
                        { value: "cancelled", label: t("cancelled") },
                        { value: "refunded", label: t("refunded") },
                      ]}
                    />
                  }
                />
                <TableColumnHeaderWithFilter title={t("actions")} align="end" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((b, i) => (
                <AdminTableRowContextMenu
                  key={i}
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
                    <td className="px-4 py-3.5 font-medium text-foreground whitespace-nowrap">{studentLabel(b.studentId)}</td>
                    <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap max-w-[10rem] truncate" title={branchNameById(branches, b.branchId)}>
                      {branchNameById(branches, b.branchId)}
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">{b.instructorName}</td>
                    <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">{formatShortDateFromIso(b.dateIso, lang)}</td>
                    <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">
                      <span className="block">{formatBookingSlotRangeLabel(b.time, b.endTime)}</span>
                      {b.totalPriceAmd != null && b.totalPriceAmd > 0 ? (
                        <span className="text-xs text-muted-foreground/80">{b.totalPriceAmd.toLocaleString()} ֏</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge className={`text-xs ${typeColor[b.type] ?? typeColor.practical}`}>{t(bookingLessonTypeTKey(b.type))}</Badge>
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
        <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
          {t("panelShowingLabel")} {filtered.length} / {bookings.length} {t("bookings")}
        </div>
      </Card>

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
            <Tabs value={bookingModalTab} onValueChange={(v) => setBookingModalTab(v as "booking" | "payment")}>
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
                  <select
                    value={editBooking.studentId}
                    onChange={(e) => setEditBooking({ ...editBooking, studentId: e.target.value })}
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {studentsMini.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
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
                        const c = bookableTheoryCohorts.find((x) => x.id === id);
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
                      {bookableTheoryCohorts.map((c) => (
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
                      {practicalInstructorsForCalendar.map((ins) => (
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
                      {theoryPersonalInstructorNames.map((name) => (
                        <option key={name} value={name}>
                          {name}
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
                      {formatAmd(editSystemPayment.grossAmd)} · {t(channelTKey(editSystemPayment.channel))} ·{" "}
                      {t(methodTKey(editSystemPayment.method))}
                    </p>
                  </div>
                ) : (
                  renderPaymentFields(editPayment, setEditPayment)
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
            <Tabs value={bookingModalTab} onValueChange={(v) => setBookingModalTab(v as "booking" | "payment")}>
              <TabsList className="grid w-full grid-cols-2 h-11">
                <TabsTrigger value="booking" className="text-sm">
                  {t("adminBookingModalTabBooking")}
                </TabsTrigger>
                <TabsTrigger value="payment" className="text-sm">
                  {t("adminBookingModalTabPayment")}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="booking" forceMount className="mt-4 data-[state=inactive]:hidden">
                <div className="grid lg:grid-cols-[minmax(0,1fr)_min(280px,100%)] gap-6 items-start">
                  <div className="space-y-3 min-w-0">
                    <div>
                      <label className="block text-sm font-medium text-muted-foreground mb-1">{t("bookingColStudent")}</label>
                      <select
                        value={draft.studentId}
                        onChange={(e) => setDraft({ ...draft, studentId: e.target.value })}
                        className={cn(
                          "w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring",
                          addFieldInvalid.student && "border-red-500 focus:ring-red-500",
                        )}
                      >
                        {studentsMini.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
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
                          cohorts={bookableTheoryCohorts}
                          valueId={theoryCohortId}
                          onChangeId={(id) => {
                            setTheoryCohortId(id);
                            setSlotPick(null);
                            const c = bookableTheoryCohorts.find((x) => x.id === id);
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
                    {addFlowKind === "practical" ? (
                      <InstructorSelector
                        label={t("cohortColInstructor")}
                        instructors={practicalInstructorsForCalendar}
                        valueName={draft.instructorName}
                        onChangeName={(name) => {
                          setDraft({ ...draft, instructorName: name });
                          setSlotPick(null);
                        }}
                      />
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

                    {addFlowKind === "theory_personal" ? (
                      <InstructorSelector
                        label={t("cohortColInstructor")}
                        instructors={theoryPersonalCalendarInstructors}
                        valueName={draft.instructorName}
                        onChangeName={(name) => {
                          setDraft({ ...draft, instructorName: name });
                          setSlotPick(null);
                        }}
                      />
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
                        ) : null}
                        {selectedAddPackage && selectedAddPackage.lessons > 0 ? (
                          <>
                            <p className="text-sm font-semibold text-foreground">Գործնական դասեր</p>
                            <SlotSelector
                              hint={t("adminBookingPackagePracticalSlotsHint").replace(
                                /%n/g,
                                String(selectedAddPackage.lessons),
                              )}
                              selectedInstructorId={packagePracticalCalendarInstructorId}
                              instructors={practicalInstructorsForCalendar}
                              onInstructorChange={(id) => {
                                const ins = instructors.find((i) => i.id === id);
                                if (ins) {
                                  setDraft((d) => (d ? { ...d, instructorName: ins.name } : d));
                                  setAddPackagePracticalSlotPick(null);
                                  setAddInlineErrors((prev) => ({ ...prev, packagePracticalSlots: null }));
                                }
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
                              calendarKey={`add-pkg-prac-${draft.instructorName}-${draft.branchId}-${addPackageId}`}
                              maxSelectableSlots={packageSelectionStats.practical.remainingBeforeSelection}
                              maxSelectableSlotsErrorKey="adminBookingValPackagePracticalCount"
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
                              instructors={packageTheoryCalendarInstructors}
                              onInstructorChange={(id) => {
                                const ins = instructors.find((i) => i.id === id);
                                if (ins) {
                                  setAddPackageTheoryInstructorName(ins.name);
                                  setAddPackageTheorySlotPick(null);
                                  setAddInlineErrors((prev) => ({ ...prev, packageTheorySlots: null }));
                                }
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
                              calendarKey={`add-pkg-th-${addPackageTheoryInstructorName}-${draft.branchId}-${addPackageId}`}
                              maxSelectableSlots={packageSelectionStats.theory.remainingBeforeSelection}
                              maxSelectableSlotsErrorKey="adminBookingValPackageTheoryCount"
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
                          hint={t("adminBookingSlotCalendarHint")}
                          selectedInstructorId={calendarInstructorId}
                          instructors={practicalInstructorsForCalendar}
                          onInstructorChange={(id) => {
                            const ins = instructors.find((i) => i.id === id);
                            if (ins) {
                              setDraft((d) => (d ? { ...d, instructorName: ins.name } : d));
                              setSlotPick(null);
                              setAddInlineErrors((prev) => ({ ...prev, slots: null }));
                            }
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
                          calendarKey={`add-practical-${draft.instructorName}-${draft.branchId}`}
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
                          hint={t("adminBookingSlotCalendarHint")}
                          selectedInstructorId={theoryPersonalCalendarInstructorId}
                          instructors={theoryPersonalCalendarInstructors}
                          onInstructorChange={(id) => {
                            const ins = instructors.find((i) => i.id === id);
                            if (ins) {
                              setDraft((d) => (d ? { ...d, instructorName: ins.name } : d));
                              setSlotPick(null);
                              setAddInlineErrors((prev) => ({ ...prev, slots: null }));
                            }
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
                          calendarKey={`add-personal-${draft.instructorName}-${draft.branchId}`}
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

                  {addCheckoutLines ? (
                    <CheckoutSummary
                      title={t("adminBookingCheckoutTitle")}
                      lines={addCheckoutLines}
                      totalAmd={addEffectiveTotalAmd}
                      validationMessageKeys={addValidation.ok ? [] : addValidation.messageKeys}
                      checkoutDisabled={!addValidation.ok}
                      checkoutHintKey="adminBookingCheckoutHintIncomplete"
                      onCheckout={handleAddCheckoutContinue}
                      t={t}
                    />
                  ) : null}
                </div>
              </TabsContent>
              <TabsContent value="payment" forceMount className="mt-4 data-[state=inactive]:hidden">
                {renderPaymentFields(addPayment, setAddPayment)}
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
    </AdminLayout>
  );
}
