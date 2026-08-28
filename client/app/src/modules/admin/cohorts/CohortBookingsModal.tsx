import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Edit2, Trash2 } from "lucide-react";
import { AppModal } from "src/components/AppModal";
import AdminTableRowActions, {
  AdminTableRowContextMenu,
  type AdminTableRowAction,
} from "src/components/AdminTableRowActions";
import AdminTableScroll from "src/components/AdminTableScroll";
import RemarkConfirmDialog from "src/components/RemarkConfirmDialog";
import { Badge } from "src/components/ui/badge";
import { BOOKING_STATUS_BADGE_CLASS } from "src/constants/booking.constants";
import { useLang, type TranslationKey } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { formatShortDateFromIso } from "src/lib/adminFormat";
import { absWouterHref } from "src/lib/wouterFullPath";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import {
  BOOKING_LIST_PAYMENT_BADGE_CLASS,
  bookingListPaymentLabelKey,
  bookingListPaymentRow,
} from "src/modules/admin/booking/adminBookingPayment";
import {
  normalizeAdminBookingRow,
  type AdminBookingListItem,
  type AdminBookingRow,
} from "src/modules/admin/booking/adminBookings.api";
import { formatAmd } from "src/pages/admin/finance/adminFinanceShared";
import { toCanonicalBookingStatus } from "src/utils/booking.utils";
import { formatBookingSlotRangeLabel } from "src/data/studentDemoBookings";

export type CohortBookingsCohort = {
  id: string;
  name: string;
};

type Props = {
  cohort: CohortBookingsCohort | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged?: () => void;
};

export default function CohortBookingsModal({ cohort, open, onOpenChange, onChanged }: Props) {
  const { t, lang } = useLang();
  const { showToast } = useToast();
  const [, setLocation] = useLocation();
  const [rows, setRows] = useState<AdminBookingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!cohort) return;
    setLoading(true);
    try {
      const data = await vivaApiJson<AdminBookingListItem[]>(
        `/theory-cohorts/${encodeURIComponent(cohort.id)}/bookings`,
      );
      setRows(Array.isArray(data) ? data.map(normalizeAdminBookingRow) : []);
    } catch (e) {
      setRows([]);
      showToast(getApiErrorMessage(e), "error");
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }, [cohort, onOpenChange, showToast]);

  useEffect(() => {
    if (!open || !cohort) {
      setRows([]);
      setDeleteId(null);
      return;
    }
    void refresh();
  }, [open, cohort, refresh]);

  const handleArchive = async (remark: string) => {
    if (!deleteId) return;
    try {
      await vivaApiJson(`/bookings/${encodeURIComponent(deleteId)}/archive`, {
        method: "POST",
        body: { remark },
      });
      setDeleteId(null);
      showToast(t("bookingArchivedMsg"), "success");
      await refresh();
      onChanged?.();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
      throw e;
    }
  };

  const openEdit = (bookingId: string) => {
    onOpenChange(false);
    setLocation(absWouterHref(`/admin/bookings?edit=${encodeURIComponent(bookingId)}`));
  };

  return (
    <>
      <AppModal
        open={open}
        onOpenChange={onOpenChange}
        title={t("cohortStudentsDialogTitle")}
        contentClassName="w-full max-w-[calc(100%-2rem)] sm:max-w-[min(96vw,1200px)] max-h-[min(94vh,900px)]"
      >
        {cohort ? (
          <p className="text-sm font-medium text-foreground -mt-1 mb-3">{cohort.name}</p>
        ) : null}
        {loading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">{t("loading")}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">{t("cohortStudentsEmpty")}</p>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden -mx-1">
            <AdminTableScroll>
              <table className="w-full text-sm min-w-[52rem]">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">
                      {t("tableColId")}
                    </th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">
                      {t("bookingColStudent")}
                    </th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">
                      {t("phone")}
                    </th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">
                      {t("date")}
                    </th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">
                      {t("bookingColTime")}
                    </th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">
                      {t("status")}
                    </th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">
                      {t("adminBookingsColPayment")}
                    </th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">
                      {t("actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((b) => {
                    const hasBooking = b.id !== "0";
                    const pay = hasBooking ? bookingListPaymentRow(b) : null;
                    const phones = [b.studentPhone, b.studentPhone2].filter(Boolean).join(" / ") || "—";
                    const rowActions: AdminTableRowAction[] = hasBooking
                      ? [
                          {
                            kind: "item",
                            id: "edit",
                            label: t("edit"),
                            icon: Edit2,
                            onClick: () => openEdit(b.id),
                          },
                          {
                            kind: "item",
                            id: "delete",
                            label: t("delete"),
                            icon: Trash2,
                            destructive: true,
                            onClick: () => setDeleteId(b.id),
                          },
                        ]
                      : [];
                    return (
                      <AdminTableRowContextMenu key={hasBooking ? b.id : `student-${b.studentId}`} actions={rowActions}>
                        <tr className="hover:bg-muted/20">
                          <td className="px-3 py-2 text-xs font-mono text-muted-foreground whitespace-nowrap">
                            {hasBooking ? b.id : "—"}
                          </td>
                          <td className="px-3 py-2 min-w-[10rem]">
                            <div className="font-medium text-foreground">{b.studentName || "—"}</div>
                            {b.studentEmail ? (
                              <div className="text-xs text-muted-foreground break-all">{b.studentEmail}</div>
                            ) : null}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{phones}</td>
                          <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                            {hasBooking ? formatShortDateFromIso(b.dateIso, lang) : "—"}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                            {hasBooking ? formatBookingSlotRangeLabel(b.time, b.endTime) : "—"}
                          </td>
                          <td className="px-3 py-2">
                            {hasBooking ? (
                              <Badge
                                className={`text-xs ${BOOKING_STATUS_BADGE_CLASS[toCanonicalBookingStatus(b.status)] ?? BOOKING_STATUS_BADGE_CLASS.pending}`}
                              >
                                {t(toCanonicalBookingStatus(b.status) as TranslationKey)}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {!hasBooking || pay?.status === "na" ? (
                              <span className="text-xs text-muted-foreground">—</span>
                            ) : (
                              <div className="flex flex-col gap-1 items-start min-w-[7rem]">
                                <Badge className={`text-xs ${BOOKING_LIST_PAYMENT_BADGE_CLASS[pay.status]}`}>
                                  {t(bookingListPaymentLabelKey(pay.status))}
                                </Badge>
                                {pay.totalAmd > 0 ? (
                                  <div className="text-xs text-muted-foreground tabular-nums">
                                    <span className="text-foreground">{formatAmd(pay.paidAmd)}</span>
                                    <span className="mx-0.5">/</span>
                                    <span>{formatAmd(pay.totalAmd)}</span>
                                  </div>
                                ) : null}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {hasBooking ? <AdminTableRowActions toolbarOnly actions={rowActions} /> : null}
                          </td>
                        </tr>
                      </AdminTableRowContextMenu>
                    );
                  })}
                </tbody>
              </table>
            </AdminTableScroll>
          </div>
        )}
      </AppModal>

      <RemarkConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleArchive}
        title={t("bookingArchiveTitle")}
        description={t("bookingArchiveDesc")}
        confirmLabel={t("adminArchiveConfirm")}
        danger
      />
    </>
  );
}
