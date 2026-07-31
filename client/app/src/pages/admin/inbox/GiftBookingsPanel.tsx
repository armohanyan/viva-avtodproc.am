import { useCallback, useEffect, useState } from "react";
import AdminTableScroll from "src/components/AdminTableScroll";
import ConfirmDialog from "src/components/ConfirmDialog";
import TableSkeletonRows from "src/components/TableSkeletonRows";
import { Badge } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";
import { Card } from "src/components/ui/card";
import { useLang, type TranslationKey } from "src/lib/i18n";
import { formatShortDateFromIso, localeForLang } from "src/lib/adminFormat";
import { useToast } from "src/lib/toast";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { useAccount } from "src/modules/accounts";
import { branchNameById, useBranches } from "src/modules/branches";
import { formatBookingSlotRangeLabel } from "src/data/studentDemoBookings";

type GiftBookingStatus = "pending" | "approved" | "rejected";

type GiftBookingRow = {
  id: number;
  studentId: number;
  studentName: string;
  studentPhone: string;
  instructorName: string;
  branchId: number;
  dateIso: string;
  time: string;
  endTime: string | null;
  type: "practical" | "theory" | "theory_personal";
  status: string;
  giftNote: string | null;
  giftStatus: GiftBookingStatus;
  createdAt: string;
};

const GIFT_STATUS_LABEL_KEY: Record<GiftBookingStatus, TranslationKey> = {
  pending: "giftBookingStatusPending",
  approved: "giftBookingStatusApproved",
  rejected: "giftBookingStatusRejected",
};

const GIFT_STATUS_BADGE_CLASS: Record<GiftBookingStatus, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-100",
  approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-100",
  rejected: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-100",
};

function formatDateTime(iso: string, lang: ReturnType<typeof useLang>["lang"]): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(localeForLang(lang), { dateStyle: "short", timeStyle: "short" });
}

type Props = {
  onCountsChange?: () => void;
};

export function GiftBookingsPanel({ onCountsChange }: Props) {
  const { t, lang } = useLang();
  const { showToast } = useToast();
  const { user } = useAccount();
  const { branches } = useBranches();
  const isSuperAdmin = user?.accountType === "super_admin";

  const [rows, setRows] = useState<GiftBookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [decisionDialog, setDecisionDialog] = useState<{ kind: "approve" | "reject"; row: GiftBookingRow } | null>(
    null,
  );

  const load = useCallback(async () => {
    try {
      const data = await vivaApiJson<GiftBookingRow[]>("/bookings/gift-requests");
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const onDecisionConfirm = useCallback(async () => {
    const dialog = decisionDialog;
    if (!dialog) return;
    setDecisionDialog(null);
    setBusyId(dialog.row.id);
    try {
      const action = dialog.kind === "approve" ? "approve-gift" : "reject-gift";
      await vivaApiJson(`/bookings/${encodeURIComponent(String(dialog.row.id))}/${action}`, { method: "POST" });
      showToast(t(dialog.kind === "approve" ? "giftBookingApprovedToast" : "giftBookingRejectedToast"), "success");
      await load();
      onCountsChange?.();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setBusyId(null);
    }
  }, [decisionDialog, load, onCountsChange, showToast, t]);

  return (
    <Card className="overflow-hidden p-0">
      {!loading && rows.length === 0 ? (
        <p className="text-muted-foreground p-6 text-sm">{t("adminGiftBookingsEmpty")}</p>
      ) : (
        <AdminTableScroll>
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="px-3 py-2 font-medium">{t("bookedCallColCreated")}</th>
                <th className="px-3 py-2 font-medium">{t("bookingColStudent")}</th>
                <th className="px-3 py-2 font-medium">{t("cohortColInstructor")}</th>
                <th className="px-3 py-2 font-medium">{t("adminColBranch")}</th>
                <th className="px-3 py-2 font-medium">{t("date")}</th>
                <th className="px-3 py-2 font-medium">{t("adminBookingGiftNoteLabel")}</th>
                <th className="px-3 py-2 font-medium">{t("status")}</th>
                <th className="px-3 py-2 font-medium text-right">{t("actions")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeletonRows cols={8} cellClassName="px-3 py-2" />
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="text-muted-foreground px-3 py-2 whitespace-nowrap">
                      {formatDateTime(r.createdAt, lang)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{r.studentName || `#${r.studentId}`}</div>
                      {r.studentPhone ? (
                        <div className="text-muted-foreground text-xs whitespace-nowrap">{r.studentPhone}</div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{r.instructorName || "—"}</td>
                    <td className="max-w-[10rem] truncate px-3 py-2" title={branchNameById(branches, String(r.branchId))}>
                      {branchNameById(branches, String(r.branchId))}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap tabular-nums">
                      {formatShortDateFromIso(r.dateIso, lang)} · {formatBookingSlotRangeLabel(r.time, r.endTime)}
                    </td>
                    <td className="text-muted-foreground max-w-[220px] px-3 py-2 whitespace-pre-wrap">
                      {r.giftNote ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col items-start gap-1">
                        <Badge className={`text-xs ${GIFT_STATUS_BADGE_CLASS[r.giftStatus]}`}>
                          {t(GIFT_STATUS_LABEL_KEY[r.giftStatus])}
                        </Badge>
                        {r.giftStatus === "rejected" || r.status === "cancelled" ? (
                          <span className="text-muted-foreground text-xs">{t("cancelled")}</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {isSuperAdmin && r.giftStatus === "pending" ? (
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            className="h-8 text-xs"
                            disabled={busyId === r.id}
                            onClick={() => setDecisionDialog({ kind: "approve", row: r })}
                          >
                            {t("giftBookingApprove")}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs"
                            disabled={busyId === r.id}
                            onClick={() => setDecisionDialog({ kind: "reject", row: r })}
                          >
                            {t("giftBookingReject")}
                          </Button>
                        </div>
                      ) : (
                        <div className="text-muted-foreground text-right text-xs">—</div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </AdminTableScroll>
      )}

      <ConfirmDialog
        open={decisionDialog !== null}
        onClose={() => setDecisionDialog(null)}
        onConfirm={onDecisionConfirm}
        title={decisionDialog?.kind === "approve" ? t("giftBookingApproveTitle") : t("giftBookingRejectTitle")}
        description={decisionDialog?.kind === "approve" ? t("giftBookingApproveDesc") : t("giftBookingRejectDesc")}
        confirmLabel={decisionDialog?.kind === "approve" ? t("giftBookingApprove") : t("giftBookingReject")}
        danger={decisionDialog?.kind === "reject"}
      />
    </Card>
  );
}
