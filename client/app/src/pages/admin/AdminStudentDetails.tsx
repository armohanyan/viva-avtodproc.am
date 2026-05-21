import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import {
  ArrowLeft,
  CalendarPlus,
  CreditCard,
  Edit2,
  GraduationCap,
  Mail,
  Phone,
  ReceiptText,
  Wallet,
  AlertCircle,
  Trash2,
} from "lucide-react";
import AdminLayout from "src/components/AdminLayout";
import AdminTableScroll from "src/components/AdminTableScroll";
import PanelPageHeader from "src/components/PanelPageHeader";
import AdminStudentProgressBlock from "src/components/AdminStudentProgressBlock";
import AdminStudentEditModal from "src/components/admin/AdminStudentEditModal";
import ConfirmDialog from "src/components/ConfirmDialog";
import { Card } from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";
import { useLang, type TranslationKey } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { absWouterHref } from "src/lib/wouterFullPath";
import { formatShortDateFromIso } from "src/lib/adminFormat";
import { formatAmd } from "src/utils/currency.utils";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { branchNameById, useBranches } from "src/modules/branches";
import { adminBookingsHrefFromStudent } from "src/modules/admin/theoryPersonalRequestBooking";
import { BOOKING_STATUS_BADGE_CLASS } from "src/constants/booking.constants";
import { toCanonicalBookingStatus } from "src/utils/booking.utils";
import type { FinanceTx } from "src/types/finance.types";

const INTERNAL_NO_LOGIN_EMAIL_DOMAIN = "no-login.local";

function displayStudentEmail(email: string): string {
  const value = (email ?? "").trim();
  return value.toLowerCase().endsWith(`@${INTERNAL_NO_LOGIN_EMAIL_DOMAIN}`) ? "" : value;
}

type StudentRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  instructor: string;
  package: string;
  lessons: string;
  status: string;
  joinedIso: string;
  branchId: string;
  skillRating: number;
  licenseAchieved: boolean;
  inviteEligible?: boolean;
};

type StudentBookingRow = {
  id: number;
  dateIso: string;
  time: string;
  endTime: string | null;
  totalPriceAmd: number | null;
  instructorUserId: number | null;
  instructor: string;
  lessonTypeKey: "lessonTypePractical" | "lessonTypeTheory" | "lessonTypeTheoryPersonal";
  status: string;
  paymentStatus?: "paid" | "unpaid" | "partial" | "pending" | "failed" | null;
  paidAmountAmd?: number | null;
  paymentRequiredAt?: string | null;
  cancellationRequestedAt?: string | null;
};

type StudentPaymentSummary = {
  totalDebtAmd: number;
  totalPaidOnBookingsAmd: number;
  totalRemainingAmd: number;
  unpaidBookings: Array<{
    id: number;
    dateIso: string;
    time: string;
    endTime: string | null;
    totalPriceAmd: number;
    paidAmountAmd: number;
    remainingAmd: number;
    lessonTypeKey: StudentBookingRow["lessonTypeKey"];
    paymentStatus: string;
    status: string;
  }>;
};

const statusColor: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  completed: "bg-blue-100 text-blue-700",
  inactive: "bg-slate-100 text-slate-500",
};

function studentBookingHref(s: Pick<StudentRow, "id" | "branchId" | "instructor">): string {
  return absWouterHref(
    adminBookingsHrefFromStudent({
      studentId: s.id,
      branchId: s.branchId,
      instructorName: s.instructor,
    }),
  );
}

function bookingRemainingAmd(b: StudentBookingRow): number {
  const c = toCanonicalBookingStatus(b.status);
  if (c === "cancelled" || c === "refunded") return 0;
  const total = b.totalPriceAmd ?? 0;
  if (total <= 0) return 0;
  const paid = b.paidAmountAmd ?? (b.paymentStatus === "paid" ? total : 0);
  return Math.max(0, total - paid);
}

function paymentStatusBadge(b: StudentBookingRow): { labelKey: TranslationKey; className: string } {
  const remaining = bookingRemainingAmd(b);
  if (b.paymentStatus === "paid" || remaining === 0) {
    return { labelKey: "studentDetailsPaymentPaid", className: "bg-emerald-100 text-emerald-700" };
  }
  if (b.paymentStatus === "partial" || (remaining > 0 && (b.paidAmountAmd ?? 0) > 0)) {
    return { labelKey: "adminBookingPaymentStatusPartial", className: "bg-sky-100 text-sky-800" };
  }
  if (b.paymentStatus === "failed") {
    return { labelKey: "studentDetailsPaymentFailed", className: "bg-red-100 text-red-600" };
  }
  if (b.paymentStatus === "pending") {
    return { labelKey: "studentDetailsPaymentPending", className: "bg-amber-100 text-amber-700" };
  }
  if (remaining > 0) {
    return { labelKey: "studentDetailsPaymentUnpaid", className: "bg-amber-100 text-amber-700" };
  }
  return { labelKey: "studentDetailsPaymentNa", className: "bg-slate-100 text-slate-500" };
}

export default function AdminStudentDetails() {
  const [, params] = useRoute<{ id: string }>("/admin/students/:id");
  const studentId = params?.id ?? "";
  const { t, lang } = useLang();
  const { showToast } = useToast();
  const { branches } = useBranches();
  const [, setLocation] = useLocation();

  const [student, setStudent] = useState<StudentRow | null | undefined>(undefined);
  const [bookings, setBookings] = useState<StudentBookingRow[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<StudentPaymentSummary | null>(null);
  const [transactions, setTransactions] = useState<FinanceTx[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const load = useCallback(async () => {
    if (!studentId) return;
    try {
      const [students, bks, summary, txs] = await Promise.all([
        vivaApiJson<StudentRow[]>("/students"),
        vivaApiJson<StudentBookingRow[]>(
          `/bookings?studentUserId=${encodeURIComponent(studentId)}`,
        ),
        vivaApiJson<StudentPaymentSummary>(
          `/bookings?studentUserId=${encodeURIComponent(studentId)}&paymentSummary=1`,
        ),
        vivaApiJson<FinanceTx[]>(
          `/finance/student-transactions?studentUserId=${encodeURIComponent(studentId)}`,
        ),
      ]);
      const all = Array.isArray(students) ? students : [];
      const found =
        all.find((s) => String(s.id) === String(studentId)) ?? null;
      setStudent(
        found
          ? {
              ...found,
              id: String(found.id),
              email: displayStudentEmail(found.email),
            }
          : null,
      );
      setBookings(Array.isArray(bks) ? bks : []);
      setPaymentSummary(summary && typeof summary === "object" ? summary : null);
      setTransactions(
        (Array.isArray(txs) ? txs : []).map((tx) => ({
          ...tx,
          entryType: tx.entryType ?? "income",
        })),
      );
    } catch (e) {
      setStudent(null);
      showToast(getApiErrorMessage(e), "error");
    }
  }, [studentId, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDelete = async () => {
    if (!student) return;
    try {
      await vivaApiJson(`/students/${encodeURIComponent(student.id)}`, { method: "DELETE" });
      setDeleteOpen(false);
      showToast(t("userDeleted"), "success");
      setLocation(absWouterHref("/admin/students"));
    } catch (err) {
      showToast(getApiErrorMessage(err) || t("fillRequired"), "error");
    }
  };

  const stats = useMemo(() => {
    const incomeTxs = transactions.filter((tx) => (tx.entryType ?? "income") === "income");
    const totalPaid = incomeTxs
      .filter((tx) => tx.status === "completed")
      .reduce((sum, tx) => sum + (tx.grossAmd ?? 0), 0);
    const totalPendingTx = incomeTxs
      .filter((tx) => tx.status === "pending")
      .reduce((sum, tx) => sum + (tx.grossAmd ?? 0), 0);
    const totalRefunded = incomeTxs
      .filter((tx) => tx.status === "refunded")
      .reduce((sum, tx) => sum + (tx.grossAmd ?? 0), 0);

    const totalOutstandingBookings = paymentSummary?.totalDebtAmd ?? bookings.reduce((sum, b) => sum + bookingRemainingAmd(b), 0);
    const totalPaidOnBookings = paymentSummary?.totalPaidOnBookingsAmd ?? 0;
    const unpaidLessonCount = paymentSummary?.unpaidBookings.length ?? bookings.filter((b) => bookingRemainingAmd(b) > 0).length;

    const totalBookings = bookings.length;
    const pendingBookings = bookings.filter((b) => {
      const c = toCanonicalBookingStatus(b.status);
      return c === "pending" || c === "pending_payment";
    }).length;
    const confirmedBookings = bookings.filter(
      (b) => toCanonicalBookingStatus(b.status) === "confirmed",
    ).length;
    const cancelledBookings = bookings.filter((b) => {
      const c = toCanonicalBookingStatus(b.status);
      return c === "cancelled" || c === "refunded";
    }).length;

    return {
      transactionCount: transactions.length,
      totalPaid,
      totalPendingTx,
      totalRefunded,
      totalOutstandingBookings,
      totalPaidOnBookings,
      unpaidLessonCount,
      totalBookings,
      pendingBookings,
      confirmedBookings,
      cancelledBookings,
    };
  }, [bookings, paymentSummary, transactions]);

  if (student === undefined) {
    return (
      <AdminLayout>
        <div className="p-6 text-sm text-muted-foreground">{t("loading")}</div>
      </AdminLayout>
    );
  }

  if (student === null) {
    return (
      <AdminLayout>
        <div className="max-w-2xl mx-auto p-6">
          <Card className="border-border p-8 text-center">
            <AlertCircle className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <h2 className="text-lg font-semibold text-foreground mb-1">
              {t("studentDetailsNotFoundTitle")}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {t("studentDetailsNotFoundDesc")}
            </p>
            <Link href={absWouterHref("/admin/students")}>
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                {t("studentDetailsBackToList")}
              </Button>
            </Link>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  const displayJoined = (iso: string) => formatShortDateFromIso(iso, lang);
  const statusLabel = (s: string) => {
    if (s === "active") return t("active");
    if (s === "inactive") return t("inactive");
    if (s === "completed") return t("userStatusCompleted");
    return s;
  };

  return (
    <AdminLayout>
      <PanelPageHeader
        icon={GraduationCap}
        title={student.name}
        subtitle={t("studentDetailsSubtitle")}
        actions={
          <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-2">
            <Link href={absWouterHref("/admin/students")}>
              <Button type="button" variant="outline" className="w-full gap-2 sm:w-auto">
                <ArrowLeft className="w-4 h-4 shrink-0" />
                {t("studentDetailsBackToList")}
              </Button>
            </Link>
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2 sm:w-auto"
              onClick={() => setEditOpen(true)}
            >
              <Edit2 className="w-4 h-4 shrink-0" />
              {t("edit")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2 sm:w-auto text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="w-4 h-4 shrink-0" />
              {t("delete")}
            </Button>
            <Link href={studentBookingHref(student)}>
              <Button type="button" className="w-full gap-2 sm:w-auto">
                <CalendarPlus className="w-4 h-4 shrink-0" />
                {t("adminStudentBookLesson")}
              </Button>
            </Link>
          </div>
        }
      />

      <div className="space-y-6">
        <Card className="border-border p-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:gap-5 gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center text-primary font-semibold text-xl shrink-0">
              {(student.name?.[0] ?? "?").toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <h2 className="text-xl font-semibold text-foreground">{student.name}</h2>
                <Badge className={`text-xs ${statusColor[student.status] ?? "bg-slate-100 text-slate-700"}`}>
                  {statusLabel(student.status)}
                </Badge>
                <Badge variant={student.licenseAchieved ? "default" : "secondary"} className="text-xs">
                  {student.licenseAchieved
                    ? t("studentLicenseAchieved")
                    : t("studentLicenseNotYet")}
                </Badge>
              </div>
              <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <Mail className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <dt className="text-xs text-muted-foreground">{t("emailAddress")}</dt>
                    <dd className="text-foreground truncate" title={student.email}>
                      {student.email || "—"}
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <dt className="text-xs text-muted-foreground">{t("phoneNumber")}</dt>
                    <dd className="text-foreground truncate">{student.phone || "—"}</dd>
                  </div>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t("adminColBranch")}</dt>
                  <dd className="text-foreground">{branchNameById(branches, student.branchId) || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t("cohortColInstructor")}</dt>
                  <dd className="text-foreground">{student.instructor || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t("adminColPackage")}</dt>
                  <dd className="text-foreground">{student.package || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t("adminColLessons")}</dt>
                  <dd className="text-foreground tabular-nums">{student.lessons || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t("studentSkillRating")}</dt>
                  <dd className="text-foreground font-medium tabular-nums">{student.skillRating}/10</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t("adminColJoined")}</dt>
                  <dd className="text-foreground tabular-nums">{displayJoined(student.joinedIso)}</dd>
                </div>
              </dl>
            </div>
          </div>
        </Card>

        <AdminStudentProgressBlock studentUserId={Number(student.id)} />

        <div>
          <h3 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-primary" />
            {t("studentDetailsFinanceTitle")}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              icon={<CreditCard className="w-4 h-4 text-emerald-600" />}
              label={t("studentDetailsTotalPaid")}
              value={formatAmd(stats.totalPaid)}
              hint={`${stats.transactionCount} ${t("studentDetailsTransactionsCount")}`}
              tone="emerald"
            />
            <StatCard
              icon={<AlertCircle className="w-4 h-4 text-amber-600" />}
              label={t("studentDetailsAmountDue")}
              value={formatAmd(stats.totalOutstandingBookings)}
              hint={`${stats.unpaidLessonCount} ${t("studentDetailsUnpaidBookingsTitle").toLowerCase()}`}
              tone="amber"
            />
            <StatCard
              icon={<CreditCard className="w-4 h-4 text-sky-600" />}
              label={t("studentDetailsBookingPaid")}
              value={formatAmd(stats.totalPaidOnBookings)}
              tone="sky"
            />
            <StatCard
              icon={<ReceiptText className="w-4 h-4 text-sky-600" />}
              label={t("studentDetailsPendingTransactions")}
              value={formatAmd(stats.totalPendingTx)}
              tone="sky"
            />
            <StatCard
              icon={<ReceiptText className="w-4 h-4 text-slate-500" />}
              label={t("studentDetailsRefunded")}
              value={formatAmd(stats.totalRefunded)}
              tone="slate"
            />
          </div>
        </div>

        {(paymentSummary?.unpaidBookings.length ?? 0) > 0 ? (
          <div>
            <h3 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              {t("studentDetailsUnpaidBookingsTitle")}
            </h3>
            <Card className="border-border overflow-hidden">
              <AdminTableScroll>
                <table className="w-full text-sm min-w-[40rem]">
                  <thead className="bg-muted/40">
                    <tr className="text-left">
                      <th className="px-4 py-3 font-medium text-muted-foreground">{t("date")}</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">{t("studentDetailsLessonType")}</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground text-right">{t("adminColPrice")}</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground text-right">{t("adminBookingPaymentPaidAmount")}</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground text-right">{t("studentDetailsBookingRemaining")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(paymentSummary?.unpaidBookings ?? []).map((b) => (
                      <tr key={b.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                          {displayJoined(b.dateIso)} · {b.time}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{t(b.lessonTypeKey)}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{formatAmd(b.totalPriceAmd)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-emerald-700">{formatAmd(b.paidAmountAmd)}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium text-amber-700">{formatAmd(b.remainingAmd)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </AdminTableScroll>
            </Card>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("studentDetailsNoUnpaidBookings")}</p>
        )}

        <div>
          <h3 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
            <CalendarPlus className="w-4 h-4 text-primary" />
            {t("studentDetailsLessonsTitle")}
            <span className="text-xs text-muted-foreground font-normal">
              ({stats.totalBookings} {t("studentDetailsLessonsCountSuffix")} · {stats.confirmedBookings} {t("confirmed")} · {stats.pendingBookings} {t("pending")})
            </span>
          </h3>
          <Card className="border-border overflow-hidden">
            <AdminTableScroll>
              <table className="w-full text-sm min-w-[48rem]">
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-medium text-muted-foreground">{t("date")}</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">{t("bookingColTime")}</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">{t("cohortColInstructor")}</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">{t("studentDetailsLessonType")}</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">{t("status")}</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">{t("studentDetailsPayment")}</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-right">{t("adminColPrice")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {bookings.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                        {t("studentDetailsLessonsEmpty")}
                      </td>
                    </tr>
                  ) : (
                    bookings.map((b) => {
                      const canonical = toCanonicalBookingStatus(b.status);
                      const badgeClass = BOOKING_STATUS_BADGE_CLASS[canonical] ?? "bg-slate-100 text-slate-700";
                      const pay = paymentStatusBadge(b);
                      return (
                        <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 text-foreground whitespace-nowrap tabular-nums">{displayJoined(b.dateIso)}</td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap tabular-nums">
                            {b.time}
                            {b.endTime ? `–${b.endTime}` : ""}
                          </td>
                          <td className="px-4 py-3 text-foreground whitespace-nowrap">{b.instructor || "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{t(b.lessonTypeKey)}</td>
                          <td className="px-4 py-3"><Badge className={`text-xs ${badgeClass}`}>{t(canonicalToBookingStatusLabelKey(canonical))}</Badge></td>
                          <td className="px-4 py-3"><Badge className={`text-xs ${pay.className}`}>{t(pay.labelKey)}</Badge></td>
                          <td className="px-4 py-3 text-foreground text-right whitespace-nowrap tabular-nums">
                            {b.totalPriceAmd != null ? formatAmd(b.totalPriceAmd) : "—"}
                            {bookingRemainingAmd(b) > 0 ? (
                              <div className="text-xs text-amber-700 font-normal">
                                {t("studentDetailsBookingRemaining")}: {formatAmd(bookingRemainingAmd(b))}
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </AdminTableScroll>
          </Card>
        </div>

        <div>
          <h3 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
            <ReceiptText className="w-4 h-4 text-primary" />
            {t("studentDetailsTransactionsTitle")}
            <span className="text-xs text-muted-foreground font-normal">
              ({stats.transactionCount})
            </span>
          </h3>
          <Card className="border-border overflow-hidden">
            <AdminTableScroll>
              <table className="w-full text-sm min-w-[48rem]">
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-medium text-muted-foreground">{t("date")}</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">{t("studentDetailsTxDescription")}</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">{t("studentDetailsTxMethod")}</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground">{t("status")}</th>
                    <th className="px-4 py-3 font-medium text-muted-foreground text-right">{t("studentDetailsTxAmount")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                        {t("studentDetailsTransactionsEmpty")}
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => {
                      const created = new Date(tx.createdAt);
                      const dateLabel = Number.isNaN(created.getTime())
                        ? tx.createdAt
                        : displayJoined(created.toISOString().slice(0, 10));
                      const isExpense = (tx.entryType ?? "income") === "expense";
                      return (
                        <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 text-foreground whitespace-nowrap tabular-nums">{dateLabel}</td>
                          <td className="px-4 py-3 text-muted-foreground max-w-[24rem]">
                            <div className="truncate" title={tx.description}>{tx.description || "—"}</div>
                            {tx.providerRef ? (
                              <div className="text-xs text-muted-foreground/70 truncate">#{tx.providerRef}</div>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{t(methodLabelKey(tx.method))}</td>
                          <td className="px-4 py-3"><Badge className={`text-xs ${txStatusClass(tx.status)}`}>{t(txStatusLabelKey(tx.status))}</Badge></td>
                          <td className={`px-4 py-3 text-right whitespace-nowrap tabular-nums font-medium ${isExpense ? "text-red-600" : "text-emerald-700"}`}>
                            {isExpense ? "-" : "+"}{formatAmd(tx.grossAmd)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </AdminTableScroll>
          </Card>
        </div>
      </div>

      <AdminStudentEditModal
        open={editOpen}
        user={student}
        onOpenChange={setEditOpen}
        onSaved={() => {
          void load();
        }}
        onBookClick={() => setLocation(studentBookingHref(student))}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title={t("userDeleteTitle")}
        description={t("userDeleteDesc")}
        confirmLabel={t("delete")}
        danger
      />
    </AdminLayout>
  );
}

type StatCardTone = "emerald" | "amber" | "sky" | "slate";

const STAT_CARD_TONE: Record<StatCardTone, string> = {
  emerald: "bg-emerald-50/60 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30",
  amber: "bg-amber-50/60 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30",
  sky: "bg-sky-50/60 dark:bg-sky-900/10 border-sky-100 dark:border-sky-900/30",
  slate: "bg-muted/30 border-border",
};

function StatCard({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone: StatCardTone;
}) {
  return (
    <div className={`rounded-lg border p-4 ${STAT_CARD_TONE[tone]}`}>
      <div className="flex items-center gap-2 mb-1 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-lg font-semibold text-foreground tabular-nums">{value}</div>
      {hint ? <div className="text-xs text-muted-foreground mt-1">{hint}</div> : null}
    </div>
  );
}

function canonicalToBookingStatusLabelKey(
  status: ReturnType<typeof toCanonicalBookingStatus>,
): TranslationKey {
  if (status === "confirmed") return "confirmed";
  if (status === "pending") return "pending";
  if (status === "pending_payment") return "pending_payment";
  if (status === "cancelled") return "cancelled";
  if (status === "refunded") return "refunded";
  return "pending";
}

function methodLabelKey(method: FinanceTx["method"]): TranslationKey {
  if (method === "card") return "financeMethodCard";
  if (method === "idram") return "financeMethodIdram";
  if (method === "cash") return "financeMethodCash";
  return "financeMethodTransfer";
}

function txStatusLabelKey(status: FinanceTx["status"]): TranslationKey {
  if (status === "completed") return "financeStatusCompleted";
  if (status === "pending") return "financeStatusPending";
  if (status === "failed") return "financeStatusFailed";
  return "financeStatusRefunded";
}

function txStatusClass(status: FinanceTx["status"]): string {
  if (status === "completed") return "bg-emerald-100 text-emerald-700";
  if (status === "pending") return "bg-amber-100 text-amber-700";
  if (status === "failed") return "bg-red-100 text-red-600";
  return "bg-slate-200 text-slate-700";
}
