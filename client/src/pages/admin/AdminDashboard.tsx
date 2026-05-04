import AdminLayout from "src/components/AdminLayout";
import AdminTableScroll from "src/components/AdminTableScroll";
import AdminTableRowActions, { AdminTableRowContextMenu } from "src/components/AdminTableRowActions";
import { useLang, type TranslationKey } from "src/lib/i18n";
import { Card } from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import DataTableToolbar from "src/components/DataTableToolbar";
import CsvExportButton from "src/components/CsvExportButton";
import TableColumnFilter, { TableColumnHeaderWithFilter } from "src/components/TableColumnFilter";
import PanelPageHeader from "src/components/PanelPageHeader";
import { Users, Calendar, TrendingUp, Car, LayoutDashboard, Edit2, Trash2, Undo2 } from "lucide-react";
import { useToast } from "src/lib/toast";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { formatShortDateFromIso, localeForLang } from "src/lib/adminFormat";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { Button } from "src/components/ui/button";
import {
	hasLessonWindowEnded,
	yerevanTodayIso,
	yerevanWeekRangeContaining,
	yerevanMonthRangeContaining,
	yerevanDateInInclusiveRange,
	yerevanLocalRangeToUtcMsBounds,
	yerevanCalendarDateFromInstant,
} from "src/lib/yerevanLessonCalendar";

const SLOT_LIKE = ["confirmed", "pending", "pending_prebook", "pending_payment", "completed"] as const;

function isSlotReservingStatus(s: string): boolean {
	return (SLOT_LIKE as readonly string[]).includes(s);
}

function displayTimeHHMM(time: string): string {
	const t = time.trim();
	return t.length >= 5 ? t.slice(0, 5) : t;
}

type BookingAdminRow = {
	id: number;
	studentId: number;
	instructorName: string;
	dateIso: string;
	time: string;
	endTime: string | null;
	type: string;
	status: string;
	branchId: number;
	lessonPassedSuccessfully?: boolean | null;
};

type AdminTodayLessonRow = {
	id: number;
	studentId: number;
	studentName: string;
	instructorName: string;
	dateIso: string;
	time: string;
	endTime: string | null;
	type: string;
	status: string;
	lessonPassedSuccessfully: boolean | null;
};

type StudentMini = { id: string; name: string; joinedIso?: string };
type KpiPeriod = "day" | "week" | "month";
type FinanceTx = {
  status: string;
  grossAmd: number;
  createdAt: string;
  entryType?: "income" | "expense";
  expenseKind?: string | null;
};

type RecentBookingRow = { id: number; student: string; instructor: string; date: string; time: string; status: string };
type RecentBookedCallRow = {
  id: number;
  name: string | null;
  phone: string;
  status: "pending" | "contacted" | "cancelled";
  createdAt: string;
};
type RecentContactRequestRow = {
  id: number;
  firstName: string;
  lastName: string | null;
  email: string;
  status: "active" | "archived";
  createdAt: string;
};

function formatDateTime(iso: string, lang: ReturnType<typeof useLang>["lang"]): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(localeForLang(lang), { dateStyle: "short", timeStyle: "short" });
}

function canonicalBookingStatusForDashboard(raw: string): TranslationKey {
  if (raw === "confirmed" || raw === "pending" || raw === "cancelled" || raw === "refunded") return raw;
  if (raw === "completed") return "confirmed";
  if (raw === "pending_prebook" || raw === "pending_payment") return "pending";
  return "pending";
}

function lessonTypeLabelKey(type: string): TranslationKey {
  if (type === "theory") return "lessonTypeTheory";
  if (type === "theory_personal") return "lessonTypeTheoryPersonal";
  return "lessonTypePractical";
}

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { t, lang } = useLang();
  const { showToast } = useToast();
  const [bookingSearch, setBookingSearch] = useState("");
  const [bookingStatus, setBookingStatus] = useState<string>("all");
  const [recentBookingsData, setRecentBookingsData] = useState<RecentBookingRow[]>([]);
  const [recentBookedCalls, setRecentBookedCalls] = useState<RecentBookedCallRow[]>([]);
  const [recentContactRequests, setRecentContactRequests] = useState<RecentContactRequestRow[]>([]);
  const [bookedCallsPage, setBookedCallsPage] = useState(1);
  const [contactRequestsPage, setContactRequestsPage] = useState(1);
  const [todayLessons, setTodayLessons] = useState<AdminTodayLessonRow[]>([]);
  const [outcomeBusyId, setOutcomeBusyId] = useState<number | null>(null);
  const [kpiPeriod, setKpiPeriod] = useState<KpiPeriod>("day");
  const [rawStudents, setRawStudents] = useState<StudentMini[]>([]);
  const [rawBookings, setRawBookings] = useState<BookingAdminRow[]>([]);
  const [rawTxs, setRawTxs] = useState<FinanceTx[]>([]);

  const loadDashboard = useCallback(async () => {
    try {
      const [students, bookings, txs, bookedCalls, contactRequests] = await Promise.all([
        vivaApiJson<StudentMini[]>("/students"),
        vivaApiJson<BookingAdminRow[]>("/bookings"),
        vivaApiJson<FinanceTx[]>("/finance/transactions"),
        vivaApiJson<RecentBookedCallRow[]>("/booked-calls"),
        vivaApiJson<RecentContactRequestRow[]>("/contact-requests"),
      ]);
      const studentRows = Array.isArray(students) ? students : [];
      const byStudent = new Map(studentRows.map((s) => [String(s.id), s.name]));
      setRawStudents(
        studentRows.map((s) => ({
          id: String(s.id),
          name: typeof s.name === "string" ? s.name : "",
          joinedIso: typeof (s as { joinedIso?: string }).joinedIso === "string" ? (s as { joinedIso: string }).joinedIso : undefined,
        })),
      );
      const bookingList = Array.isArray(bookings) ? bookings : [];
      setRawBookings(bookingList);
      const todayY = yerevanTodayIso();
      const todayRows: AdminTodayLessonRow[] = bookingList
        .filter((b) => String(b.dateIso).slice(0, 10) === todayY && isSlotReservingStatus(String(b.status)))
        .map((b) => {
          const sid = typeof b.studentId === "number" ? b.studentId : Number(b.studentId);
          return {
            id: typeof b.id === "number" ? b.id : Number(b.id),
            studentId: Number.isFinite(sid) ? sid : 0,
            studentName: byStudent.get(String(b.studentId)) ?? String(b.studentId),
            instructorName: b.instructorName,
            dateIso: String(b.dateIso).slice(0, 10),
            time: b.time,
            endTime: b.endTime ?? null,
            type: b.type,
            status: b.status,
            lessonPassedSuccessfully:
              b.lessonPassedSuccessfully === null || b.lessonPassedSuccessfully === undefined
                ? null
                : Boolean(b.lessonPassedSuccessfully),
          };
        })
        .filter((b) => b.id > 0)
        .sort((a, b) => a.time.localeCompare(b.time));
      setTodayLessons(todayRows);

      const rows = bookingList.slice(0, 12).map((b) => ({
        id: typeof b.id === "number" ? b.id : Number(b.id),
        student: byStudent.get(String(b.studentId)) ?? String(b.studentId),
        instructor: b.instructorName,
        date: formatShortDateFromIso(b.dateIso, lang),
        time: b.time,
        status: b.status,
      }));
      setRecentBookingsData(rows);
      setRecentBookedCalls(Array.isArray(bookedCalls) ? bookedCalls : []);
      setRecentContactRequests(Array.isArray(contactRequests) ? contactRequests : []);
      setRawTxs(
        (Array.isArray(txs) ? txs : []).map((x) => ({
          ...x,
          entryType: (x as FinanceTx).entryType ?? "income",
          expenseKind: (x as FinanceTx).expenseKind ?? null,
        })),
      );
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    }
  }, [lang, showToast]);

  const saveLessonPassed = useCallback(
    async (row: AdminTodayLessonRow, value: boolean | null) => {
      setOutcomeBusyId(row.id);
      try {
        const updated = await vivaApiJson<BookingAdminRow>(
          `/bookings/${encodeURIComponent(String(row.id))}/lesson-passed`,
          {
            method: "PATCH",
            body: { lessonPassedSuccessfully: value },
          },
        );
        setTodayLessons((prev) =>
          prev.map((r) =>
            r.id === row.id
              ? {
                  ...r,
                  lessonPassedSuccessfully:
                    updated.lessonPassedSuccessfully === null || updated.lessonPassedSuccessfully === undefined
                      ? null
                      : Boolean(updated.lessonPassedSuccessfully),
                }
              : r,
          ),
        );
        showToast(t("lessonPassedSaved"), "success");
      } catch (e) {
        showToast(getApiErrorMessage(e), "error");
      } finally {
        setOutcomeBusyId(null);
      }
    },
    [showToast, t],
  );

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const kpiStats = useMemo(() => {
    const todayY = yerevanTodayIso();
    let start: string;
    let end: string;
    if (kpiPeriod === "day") {
      start = todayY;
      end = todayY;
    } else if (kpiPeriod === "week") {
      ({ start, end } = yerevanWeekRangeContaining(todayY));
    } else {
      ({ start, end } = yerevanMonthRangeContaining(todayY));
    }
    const { fromMs, toMs } = yerevanLocalRangeToUtcMsBounds(start, end);

    const newStudents = rawStudents.filter((s) => {
      if (!s.joinedIso?.trim()) return false;
      const jd = yerevanCalendarDateFromInstant(s.joinedIso);
      return yerevanDateInInclusiveRange(jd, start, end);
    }).length;

    const bookingsInPeriod = rawBookings.filter(
      (b) => yerevanDateInInclusiveRange(String(b.dateIso), start, end) && isSlotReservingStatus(String(b.status)),
    );

    const txsInPeriod = rawTxs.filter((x) => {
      const ts = new Date(x.createdAt).getTime();
      return ts >= fromMs && ts <= toMs;
    });

    const incomeCompletedSum = txsInPeriod
      .filter((x) => (x.entryType ?? "income") === "income" && x.status === "completed")
      .reduce((s, x) => s + (x.grossAmd ?? 0), 0);

    const bookingRefundSum = txsInPeriod
      .filter(
        (x) =>
          (x.entryType ?? "income") === "expense" &&
          x.expenseKind === "booking_refund" &&
          x.status === "completed",
      )
      .reduce((s, x) => s + (x.grossAmd ?? 0), 0);

    const legacyRefundedIncomeSum = txsInPeriod
      .filter((x) => (x.entryType ?? "income") === "income" && x.status === "refunded")
      .reduce((s, x) => s + (x.grossAmd ?? 0), 0);

    const refundMoney = bookingRefundSum + legacyRefundedIncomeSum;
    const revenue = incomeCompletedSum - bookingRefundSum - legacyRefundedIncomeSum;

    const instructorNames = new Set(
      bookingsInPeriod
        .map((b) => String(b.instructorName ?? "").trim())
        .filter((n) => n.length > 0),
    );

    return {
      newStudents,
      bookingsCount: bookingsInPeriod.length,
      revenue,
      refundMoney,
      instructorsTeaching: instructorNames.size,
    };
  }, [rawStudents, rawBookings, rawTxs, kpiPeriod]);

  const kpiFootnoteKey =
    kpiPeriod === "day" ? ("adminKpiScopeDay" as const) : kpiPeriod === "week" ? ("adminKpiScopeWeek" as const) : ("adminKpiScopeMonth" as const);

  const filteredRecentBookings = useMemo(() => {
    const q = bookingSearch.trim().toLowerCase();
    return recentBookingsData.filter((b) => {
      const hay = [b.student, b.instructor, b.date, b.time, b.status].join(" ").toLowerCase();
      const matchSearch = !q || hay.includes(q);
      const matchStatus =
        bookingStatus === "all" || canonicalBookingStatusForDashboard(b.status) === bookingStatus;
      return matchSearch && matchStatus;
    });
  }, [bookingSearch, bookingStatus, recentBookingsData]);

  const PAGE_SIZE = 10;
  const activeBookedCalls = useMemo(
    () => recentBookedCalls.filter((r) => r.status !== "cancelled"),
    [recentBookedCalls],
  );
  const activeContactRequests = useMemo(
    () => recentContactRequests.filter((r) => r.status === "active"),
    [recentContactRequests],
  );

  const bookedCallsTotalPages = Math.max(1, Math.ceil(activeBookedCalls.length / PAGE_SIZE));
  const contactRequestsTotalPages = Math.max(1, Math.ceil(activeContactRequests.length / PAGE_SIZE));
  const safeBookedCallsPage = Math.min(bookedCallsPage, bookedCallsTotalPages);
  const safeContactRequestsPage = Math.min(contactRequestsPage, contactRequestsTotalPages);

  const pagedBookedCalls = useMemo(() => {
    const start = (safeBookedCallsPage - 1) * PAGE_SIZE;
    return activeBookedCalls.slice(start, start + PAGE_SIZE);
  }, [activeBookedCalls, safeBookedCallsPage]);
  const pagedContactRequests = useMemo(() => {
    const start = (safeContactRequestsPage - 1) * PAGE_SIZE;
    return activeContactRequests.slice(start, start + PAGE_SIZE);
  }, [activeContactRequests, safeContactRequestsPage]);

  const stats = useMemo(
    () =>
      [
        {
          label: t("adminKpiStudentsJoined"),
          value: String(kpiStats.newStudents),
          icon: Users,
          color: "text-primary",
          bg: "bg-primary/10",
          footnote: kpiFootnoteKey,
        },
        {
          label: t("adminKpiLessonBookings"),
          value: String(kpiStats.bookingsCount),
          icon: Calendar,
          color: "text-primary",
          bg: "bg-primary/10",
          footnote: kpiFootnoteKey,
        },
        {
          label: t("revenue"),
          value: `${kpiStats.revenue.toLocaleString()} ֏`,
          icon: TrendingUp,
          color: "text-primary",
          bg: "bg-primary/10",
          footnote: "adminKpiRevenueNetFootnote" as const,
        },
        {
          label: t("adminKpiRefundMoney"),
          value: `${kpiStats.refundMoney.toLocaleString()} ֏`,
          icon: Undo2,
          color: "text-rose-600 dark:text-rose-400",
          bg: "bg-rose-500/10",
          footnote: kpiFootnoteKey,
        },
        {
          label: t("adminKpiInstructorsTeaching"),
          value: String(kpiStats.instructorsTeaching),
          icon: Car,
          color: "text-primary",
          bg: "bg-primary/10",
          footnote: kpiFootnoteKey,
        },
      ] as const,
    [kpiStats, kpiFootnoteKey, t],
  );

  const statusColor: Record<string, string> = {
    confirmed: "bg-emerald-100 text-emerald-700",
    pending: "bg-amber-100 text-amber-700",
    cancelled: "bg-red-100 text-red-600",
    refunded: "bg-slate-200 text-slate-700",
  };

  return (
    <AdminLayout>
      <PanelPageHeader icon={LayoutDashboard} title={t("adminDashboard")} subtitle={t("adminDashboardPageSubtitle")} />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <p className="text-sm text-muted-foreground">{t("adminKpiFilterHint")}</p>
        <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/50 shrink-0" role="group" aria-label={t("adminKpiFilterAria")}>
          {(["day", "week", "month"] as const).map((p) => (
            <Button
              key={p}
              type="button"
              size="sm"
              variant={kpiPeriod === p ? "secondary" : "ghost"}
              className="h-8 px-3 rounded-md"
              onClick={() => setKpiPeriod(p)}
            >
              {p === "day" ? t("adminKpiFilterDay") : p === "week" ? t("adminKpiFilterWeek") : t("adminKpiFilterMonth")}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
        {stats.map((s, i) => (
          <Card key={i} className="p-5 border-border">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                <p className="text-2xl font-bold text-foreground">
                  {s.value}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{t(s.footnote)}</p>
              </div>
              <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center shrink-0`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-8">
        <Card className="border-border overflow-hidden min-w-0">
          <div className="p-5 border-b border-border flex items-center justify-between gap-3">
            <h3 className="font-semibold text-foreground">{t("adminDashboardRecentBookedCallsTitle")}</h3>
            <a href="/admin/booked-calls" className="text-sm text-primary hover:underline shrink-0">{t("viewAll")}</a>
          </div>
          <div className="p-5">
            {pagedBookedCalls.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("adminBookedCallsEmpty")}</p>
            ) : (
              <div className="space-y-3">
                {pagedBookedCalls.map((r) => (
                  <div key={r.id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{r.name?.trim() || r.phone}</p>
                      <p className="text-xs text-muted-foreground truncate">{r.phone}</p>
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTime(r.createdAt, lang)}
                    </p>
                  </div>
                ))}
                <div className="pt-2 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {t("panelShowingLabel")} {Math.min(activeBookedCalls.length, (safeBookedCallsPage - 1) * PAGE_SIZE + 1)}-
                    {Math.min(activeBookedCalls.length, safeBookedCallsPage * PAGE_SIZE)} / {activeBookedCalls.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={safeBookedCallsPage <= 1}
                      onClick={() => setBookedCallsPage((p) => Math.max(1, p - 1))}
                    >
                      ‹
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={safeBookedCallsPage >= bookedCallsTotalPages}
                      onClick={() => setBookedCallsPage((p) => Math.min(bookedCallsTotalPages, p + 1))}
                    >
                      ›
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card className="border-border overflow-hidden min-w-0">
          <div className="p-5 border-b border-border flex items-center justify-between gap-3">
            <h3 className="font-semibold text-foreground">{t("adminDashboardRecentContactRequestsTitle")}</h3>
            <a href="/admin/contact-requests" className="text-sm text-primary hover:underline shrink-0">{t("viewAll")}</a>
          </div>
          <div className="p-5">
            {pagedContactRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("adminContactRequestsEmpty")}</p>
            ) : (
              <div className="space-y-3">
                {pagedContactRequests.map((r) => (
                  <div key={r.id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {[r.firstName, r.lastName].filter(Boolean).join(" ") || r.email}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{r.email}</p>
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateTime(r.createdAt, lang)}
                    </p>
                  </div>
                ))}
                <div className="pt-2 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {t("panelShowingLabel")}{" "}
                    {Math.min(activeContactRequests.length, (safeContactRequestsPage - 1) * PAGE_SIZE + 1)}-
                    {Math.min(activeContactRequests.length, safeContactRequestsPage * PAGE_SIZE)} / {activeContactRequests.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={safeContactRequestsPage <= 1}
                      onClick={() => setContactRequestsPage((p) => Math.max(1, p - 1))}
                    >
                      ‹
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={safeContactRequestsPage >= contactRequestsTotalPages}
                      onClick={() => setContactRequestsPage((p) => Math.min(contactRequestsTotalPages, p + 1))}
                    >
                      ›
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Today's lessons — shared lesson-passed flag (instructor or staff) */}
        <Card className="border-border overflow-hidden min-w-0">
          <div className="p-5 border-b border-border">
            <h3 className="font-semibold text-foreground">{t("adminTodayLessonsTitle")}</h3>
          </div>
          <AdminTableScroll>
            <table className="w-full text-sm min-w-[48rem]">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">{t("bookingColStudent")}</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">{t("cohortColInstructor")}</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">{t("bookingColTime")}</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">{t("bookingsTableColType")}</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">{t("status")}</th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">{t("lessonPassedColumnTitle")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {todayLessons.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">
                      {t("tableNoMatches")}
                    </td>
                  </tr>
                ) : (
                  todayLessons.map((row) => {
                    const ended = hasLessonWindowEnded(row.dateIso, row.time, row.endTime);
                    const st = canonicalBookingStatusForDashboard(row.status);
                    return (
                      <tr key={row.id} className="hover:bg-muted/30 transition-colors align-top">
                        <td className="px-5 py-3.5 font-medium text-foreground">{row.studentName}</td>
                        <td className="px-5 py-3.5 text-muted-foreground">{row.instructorName}</td>
                        <td className="px-5 py-3.5 text-muted-foreground whitespace-nowrap">
                          {displayTimeHHMM(row.time)}
                          {row.endTime ? `–${displayTimeHHMM(row.endTime)}` : null}
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge className="text-xs bg-muted text-foreground">{t(lessonTypeLabelKey(row.type))}</Badge>
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge className={`text-xs ${statusColor[st] ?? statusColor.pending}`}>{t(st)}</Badge>
                        </td>
                        <td className="px-5 py-3.5">
                          {!ended ? (
                            <span className="text-muted-foreground text-sm">—</span>
                          ) : (
                            <div className="flex flex-col gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={row.lessonPassedSuccessfully === true ? "default" : "outline"}
                                  disabled={outcomeBusyId === row.id}
                                  onClick={() => void saveLessonPassed(row, true)}
                                >
                                  {t("lessonPassedPass")}
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={row.lessonPassedSuccessfully === false ? "destructive" : "outline"}
                                  className={row.lessonPassedSuccessfully === false ? "" : "border-destructive/50 text-destructive"}
                                  disabled={outcomeBusyId === row.id}
                                  onClick={() => void saveLessonPassed(row, false)}
                                >
                                  {t("lessonPassedFail")}
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  disabled={outcomeBusyId === row.id || row.lessonPassedSuccessfully === null}
                                  onClick={() => void saveLessonPassed(row, null)}
                                >
                                  {t("lessonPassedClear")}
                                </Button>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {row.lessonPassedSuccessfully === null
                                  ? t("lessonPassedNotSet")
                                  : row.lessonPassedSuccessfully
                                    ? t("lessonPassedPass")
                                    : t("lessonPassedFail")}
                              </span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </AdminTableScroll>
        </Card>

        {/* Recent Bookings Table */}
        <Card className="border-border overflow-hidden min-w-0">
          <div className="p-5 border-b border-border flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="font-semibold text-foreground">{t("adminRecentBookingsTitle")}</h3>
            <a href="/admin/bookings" className="text-sm text-primary hover:underline shrink-0">{t("viewAll")}</a>
          </div>
          <DataTableToolbar value={bookingSearch} onChange={setBookingSearch} placeholder={`${t("search")}…`}>
            <CsvExportButton
              filename="admin-dashboard-recent-bookings.csv"
              headers={[t("bookingColStudent"), t("cohortColInstructor"), t("tableColId"), t("date"), t("bookingColTime"), t("status")]}
              rows={filteredRecentBookings.map((b) => [
                b.student,
                b.instructor,
                b.date,
                b.time,
                t(canonicalBookingStatusForDashboard(b.status)),
              ])}
            />
          </DataTableToolbar>
          <AdminTableScroll>
            <table className="w-full text-sm min-w-[40rem]">
              <thead className="bg-muted/40">
                <tr>
                  <TableColumnHeaderWithFilter title={t("bookingColStudent")} className="px-5 py-3" />
                  <TableColumnHeaderWithFilter title={t("cohortColInstructor")} className="px-5 py-3" />
                  <TableColumnHeaderWithFilter title={t("date")} className="px-5 py-3" />
                  <TableColumnHeaderWithFilter title={t("bookingColTime")} className="px-5 py-3" />
                  <TableColumnHeaderWithFilter
                    title={t("status")}
                    className="px-5 py-3"
                    filter={
                      <TableColumnFilter
                        value={bookingStatus}
                        onChange={setBookingStatus}
                        ariaLabel={t("filterByStatus")}
                        options={[
                          { value: "all", label: t("filterOptionAll") },
                          { value: "confirmed", label: t("confirmed") },
                          { value: "pending", label: t("pending") },
                          { value: "cancelled", label: t("cancelled") },
                          { value: "refunded", label: t("refunded") },
                        ]}
                      />
                    }
                  />
                  <TableColumnHeaderWithFilter title={t("actions")} align="end" className="px-5 py-3 text-right" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRecentBookings.map((b, i) => (
                  <AdminTableRowContextMenu
                    key={i}
                    actions={[
                      {
                        kind: "item",
                        id: "edit",
                        label: t("edit"),
                        icon: Edit2,
                        onClick: () => setLocation(`/admin/bookings?edit=${encodeURIComponent(String(b.id))}`),
                      },
                      {
                        kind: "item",
                        id: "delete",
                        label: t("delete"),
                        icon: Trash2,
                        destructive: true,
                        onClick: () => setLocation(`/admin/bookings?delete=${encodeURIComponent(String(b.id))}`),
                      },
                    ]}
                  >
                    <tr className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-foreground">{b.student}</td>
                      <td className="px-5 py-3.5 text-muted-foreground">{b.instructor}</td>
                      <td className="px-5 py-3.5 text-muted-foreground">{b.date}</td>
                      <td className="px-5 py-3.5 text-muted-foreground">{b.time}</td>
                      <td className="px-5 py-3.5">
                        <Badge className={`text-xs ${statusColor[canonicalBookingStatusForDashboard(b.status)] ?? statusColor.pending}`}>
                          {t(canonicalBookingStatusForDashboard(b.status))}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <AdminTableRowActions
                          toolbarOnly
                          className="justify-end ml-auto"
                          actions={[
                            {
                              kind: "item",
                              id: "edit",
                              label: t("edit"),
                              icon: Edit2,
                              onClick: () => setLocation(`/admin/bookings?edit=${encodeURIComponent(String(b.id))}`),
                            },
                            {
                              kind: "item",
                              id: "delete",
                              label: t("delete"),
                              icon: Trash2,
                              destructive: true,
                              onClick: () => setLocation(`/admin/bookings?delete=${encodeURIComponent(String(b.id))}`),
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
        </Card>
      </div>
    </AdminLayout>
  );
}
