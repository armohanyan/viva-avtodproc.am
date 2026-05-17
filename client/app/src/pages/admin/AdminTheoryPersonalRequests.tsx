import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "src/components/AdminLayout";
import AdminTableScroll from "src/components/AdminTableScroll";
import PanelPageHeader from "src/components/PanelPageHeader";
import { AppModal } from "src/components/AppModal";
import LessonBookingCalendar, { type LessonBookingPayload } from "src/components/LessonBookingCalendar";
import { Card } from "src/components/ui/card";
import { Button } from "src/components/ui/button";
import { Badge } from "src/components/ui/badge";
import { useLang } from "src/lib/i18n";
import { localeForLang } from "src/lib/adminFormat";
import { useToast } from "src/lib/toast";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { useAdminBranchFilter } from "src/modules/admin/AdminBranchFilterProvider";
import { useInstructors } from "src/modules/instructors/useInstructors";
import { filterInstructorsServingBranches } from "src/modules/instructors/instructor-booking";

type RequestStatus = "pending" | "contacted" | "booked" | "cancelled";

type RequestRow = {
  id: string;
  studentUserId: number;
  studentName: string;
  studentPhone: string | null;
  studentEmail: string;
  instructorUserId: number;
  instructorName: string;
  branchId: number;
  note: string | null;
  selectedThemes: string[];
  status: RequestStatus;
  bookedLessonId: number | null;
  createdAt: string;
};

function formatDateTime(iso: string, lang: ReturnType<typeof useLang>["lang"]): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(localeForLang(lang), { dateStyle: "short", timeStyle: "short" });
}

function statusBadgeClass(status: RequestStatus): string {
  if (status === "pending") return "bg-amber-100 text-amber-800";
  if (status === "contacted") return "bg-blue-100 text-blue-800";
  if (status === "booked") return "bg-emerald-100 text-emerald-800";
  return "bg-muted text-muted-foreground";
}

export default function AdminTheoryPersonalRequests(): JSX.Element {
  const { branchId: filterBranchId } = useAdminBranchFilter();
  const { t, lang } = useLang();
  const { showToast } = useToast();
  const { instructors } = useInstructors();
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bookingRow, setBookingRow] = useState<RequestRow | null>(null);
  const [bookingPayload, setBookingPayload] = useState<LessonBookingPayload | null>(null);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await vivaApiJson<RequestRow[]>("/personal-theory-lesson-requests");
      setRows(Array.isArray(data) ? data.map((r) => ({ ...r, id: String(r.id) })) : []);
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load, filterBranchId]);

  const visibleRows = useMemo(() => {
    if (!filterBranchId) return rows;
    return rows.filter((r) => String(r.branchId) === filterBranchId);
  }, [rows, filterBranchId]);

  const calendarInstructors = useMemo(() => {
    if (!bookingRow) return [];
    return filterInstructorsServingBranches(instructors, [String(bookingRow.branchId)]);
  }, [bookingRow, instructors]);

  const selectedInstructorId = useMemo(() => {
    if (!bookingRow) return "";
    const m = instructors.find((i) => String(i.id) === String(bookingRow.instructorUserId) || i.name === bookingRow.instructorName);
    return m?.id ?? "";
  }, [bookingRow, instructors]);

  const statusLabel = (status: RequestStatus): string => {
    const map: Record<RequestStatus, string> = {
      pending: t("theoryPersonalRequestStatusPending"),
      contacted: t("theoryPersonalRequestStatusContacted"),
      booked: t("theoryPersonalRequestStatusBooked"),
      cancelled: t("theoryPersonalRequestStatusCancelled"),
    };
    return map[status];
  };

  const runAction = async (id: string, action: "contacted" | "cancel") => {
    setBusyId(id);
    try {
      const path =
        action === "contacted"
          ? `/personal-theory-lesson-requests/${id}/contacted`
          : `/personal-theory-lesson-requests/${id}/cancel`;
      const updated = await vivaApiJson<RequestRow>(path, { method: "POST" });
      setRows((prev) => prev.map((r) => (r.id === id ? { ...updated, id: String(updated.id) } : r)));
      showToast(
        action === "contacted" ? t("theoryPersonalRequestMarkedContactedToast") : t("theoryPersonalRequestCancelledToast"),
        "success",
      );
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setBusyId(null);
    }
  };

  const submitBooking = async () => {
    if (!bookingRow || !bookingPayload) return;
    const times =
      bookingPayload.times.length > 0
        ? bookingPayload.times
        : bookingPayload.time
          ? [bookingPayload.time]
          : [];
    if (times.length === 0) {
      showToast(t("adminBookingValSelectSlots"), "error");
      return;
    }
    setBookingSubmitting(true);
    try {
      await vivaApiJson(`/personal-theory-lesson-requests/${bookingRow.id}/create-booking`, {
        method: "POST",
        body: {
          date: bookingPayload.dateIso,
          slots: times,
          status: "confirmed",
        },
      });
      showToast(t("theoryPersonalRequestBookingCreatedToast"), "success");
      setBookingRow(null);
      setBookingPayload(null);
      await load();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setBookingSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <PanelPageHeader title={t("adminTheoryPersonalRequests")} />
        <Card className="overflow-hidden p-0">
          {loading ? (
            <p className="text-muted-foreground p-6 text-sm">{t("loading")}</p>
          ) : visibleRows.length === 0 ? (
            <p className="text-muted-foreground p-6 text-sm">{t("adminTheoryPersonalRequestsEmpty")}</p>
          ) : (
            <AdminTableScroll>
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="px-3 py-2 font-medium">{t("theoryPersonalRequestColCreated")}</th>
                    <th className="px-3 py-2 font-medium">{t("theoryPersonalRequestColStudent")}</th>
                    <th className="px-3 py-2 font-medium">{t("theoryPersonalRequestColContact")}</th>
                    <th className="px-3 py-2 font-medium">{t("theoryPersonalRequestColInstructor")}</th>
                    <th className="px-3 py-2 font-medium">{t("theoryPersonalRequestColNote")}</th>
                    <th className="px-3 py-2 font-medium">{t("theoryPersonalRequestColStatus")}</th>
                    <th className="px-3 py-2 font-medium">{t("theoryPersonalRequestColActions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((r) => {
                    const busy = busyId === r.id;
                    const closed = r.status === "booked" || r.status === "cancelled";
                    return (
                      <tr key={r.id} className="border-b last:border-0 align-top">
                        <td className="text-muted-foreground px-3 py-2 whitespace-nowrap">
                          {formatDateTime(r.createdAt, lang)}
                        </td>
                        <td className="px-3 py-2 font-medium">{r.studentName}</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          <div className="space-y-0.5">
                            {r.studentPhone ? <div>{r.studentPhone}</div> : null}
                            <div className="break-all">{r.studentEmail}</div>
                          </div>
                        </td>
                        <td className="px-3 py-2">{r.instructorName}</td>
                        <td className="max-w-[200px] px-3 py-2 whitespace-pre-wrap text-muted-foreground">
                          {r.note ?? "—"}
                          {r.selectedThemes.length > 0 ? (
                            <p className="mt-1 text-xs text-foreground/80">{r.selectedThemes.join(", ")}</p>
                          ) : null}
                        </td>
                        <td className="px-3 py-2">
                          <Badge className={statusBadgeClass(r.status)}>{statusLabel(r.status)}</Badge>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-2">
                            {r.status === "pending" ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                onClick={() => void runAction(r.id, "contacted")}
                              >
                                {t("theoryPersonalRequestActionContacted")}
                              </Button>
                            ) : null}
                            {!closed ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                onClick={() => void runAction(r.id, "cancel")}
                              >
                                {t("theoryPersonalRequestActionCancel")}
                              </Button>
                            ) : null}
                            {r.status !== "booked" && r.status !== "cancelled" ? (
                              <Button
                                type="button"
                                size="sm"
                                disabled={busy}
                                onClick={() => {
                                  setBookingRow(r);
                                  setBookingPayload(null);
                                }}
                              >
                                {t("theoryPersonalRequestActionCreateBooking")}
                              </Button>
                            ) : r.bookedLessonId ? (
                              <span className="text-xs text-muted-foreground self-center">
                                #{r.bookedLessonId}
                              </span>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </AdminTableScroll>
          )}
        </Card>
      </div>

      <AppModal
        open={bookingRow != null}
        onOpenChange={(open) => {
          if (!open) {
            setBookingRow(null);
            setBookingPayload(null);
          }
        }}
        title={t("theoryPersonalRequestBookingModalTitle")}
        description={
          bookingRow
            ? `${bookingRow.studentName} · ${bookingRow.instructorName}`
            : undefined
        }
        contentClassName="sm:max-w-4xl"
        footer={
          <div className="flex flex-col-reverse gap-2 px-6 pb-6 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setBookingRow(null);
                setBookingPayload(null);
              }}
              disabled={bookingSubmitting}
            >
              {t("cancel")}
            </Button>
            <Button
              type="button"
              onClick={() => void submitBooking()}
              disabled={bookingSubmitting || !bookingPayload}
            >
              {bookingSubmitting ? t("loading") : t("theoryPersonalRequestActionCreateBooking")}
            </Button>
          </div>
        }
      >
        {bookingRow && selectedInstructorId ? (
          <LessonBookingCalendar
            mode="admin"
            instructors={calendarInstructors}
            selectedInstructorId={selectedInstructorId}
            onInstructorChange={() => {}}
            studentName={bookingRow.studentName}
            branchId={String(bookingRow.branchId)}
            showInstructorPicker={false}
            adminSuppressSummaryCard
            onBookingConfirmed={(payload) => setBookingPayload(payload)}
          />
        ) : bookingRow ? (
          <p className="text-sm text-muted-foreground">{t("couldNotLoadData")}</p>
        ) : null}
      </AppModal>
    </AdminLayout>
  );
}
