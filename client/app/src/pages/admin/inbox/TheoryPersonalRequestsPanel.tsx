import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import AdminTableScroll from "src/components/AdminTableScroll";
import { Card } from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import { useLang } from "src/lib/i18n";
import { localeForLang } from "src/lib/adminFormat";
import { useToast } from "src/lib/toast";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { branchNameById, useBranches } from "src/modules/branches";
import { adminBookingsHrefFromTheoryPersonalRequest } from "src/modules/admin/theoryPersonalRequestBooking";
import { absWouterHref } from "src/lib/wouterFullPath";
import { cn } from "src/lib/utils";
import {
  TheoryPersonalRequestDetailModal,
  type TheoryPersonalRequestRow,
} from "src/pages/admin/inbox/TheoryPersonalRequestDetailModal";

function formatDateTime(iso: string, lang: ReturnType<typeof useLang>["lang"]): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(localeForLang(lang), { dateStyle: "short", timeStyle: "short" });
}

function statusBadgeClass(status: TheoryPersonalRequestRow["status"]): string {
  if (status === "pending") return "bg-amber-100 text-amber-800";
  if (status === "contacted") return "bg-blue-100 text-blue-800";
  if (status === "booked") return "bg-emerald-100 text-emerald-800";
  return "bg-muted text-muted-foreground";
}

type Props = {
  onCountsChange?: () => void;
};

export function TheoryPersonalRequestsPanel({ onCountsChange }: Props) {
  const { t, lang } = useLang();
  const { showToast } = useToast();
  const [, setLocation] = useLocation();
  const { branches } = useBranches();
  const [rows, setRows] = useState<TheoryPersonalRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [detailRow, setDetailRow] = useState<TheoryPersonalRequestRow | null>(null);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await vivaApiJson<TheoryPersonalRequestRow[]>("/personal-theory-lesson-requests");
      setRows(Array.isArray(data) ? data.map((r) => ({ ...r, id: String(r.id) })) : []);
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const statusLabel = (status: TheoryPersonalRequestRow["status"]): string => {
    const map: Record<TheoryPersonalRequestRow["status"], string> = {
      pending: t("theoryPersonalRequestStatusPending"),
      contacted: t("theoryPersonalRequestStatusContacted"),
      booked: t("theoryPersonalRequestStatusBooked"),
      cancelled: t("theoryPersonalRequestStatusCancelled"),
    };
    return map[status];
  };

  const patchRow = (updated: TheoryPersonalRequestRow) => {
    const normalized = { ...updated, id: String(updated.id) };
    setRows((prev) => prev.map((r) => (r.id === normalized.id ? normalized : r)));
    setDetailRow((prev) => (prev?.id === normalized.id ? normalized : prev));
    return normalized;
  };

  const cancelRequest = async (id: string) => {
    setBusy(true);
    try {
      const updated = await vivaApiJson<TheoryPersonalRequestRow>(
        `/personal-theory-lesson-requests/${id}/cancel`,
        { method: "POST" },
      );
      patchRow(updated);
      showToast(t("theoryPersonalRequestCancelledToast"), "success");
      onCountsChange?.();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  const removeRequest = async () => {
    if (!detailRow) return;
    setBusy(true);
    try {
      await vivaApiJson(`/personal-theory-lesson-requests/${detailRow.id}`, { method: "DELETE" });
      setRows((prev) => prev.filter((r) => r.id !== detailRow.id));
      setDetailRow(null);
      setConfirmRemoveOpen(false);
      showToast(t("theoryPersonalRequestRemovedToast"), "success");
      onCountsChange?.();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  const openBooking = (row: TheoryPersonalRequestRow) => {
    setDetailRow(null);
    setLocation(absWouterHref(adminBookingsHrefFromTheoryPersonalRequest(row)));
  };

  const detailBranchLabel = detailRow ? branchNameById(branches, detailRow.branchId) : "";

  return (
    <>
      <Card className="overflow-hidden p-0">
        {loading ? (
          <p className="text-muted-foreground p-6 text-sm">{t("loading")}</p>
        ) : rows.length === 0 ? (
          <p className="text-muted-foreground p-6 text-sm">{t("adminTheoryPersonalRequestsEmpty")}</p>
        ) : (
          <>
            <p className="text-muted-foreground border-b px-4 py-2 text-xs">{t("theoryPersonalRequestRowHint")}</p>
            <AdminTableScroll>
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="px-3 py-2 font-medium">{t("theoryPersonalRequestColCreated")}</th>
                    <th className="px-3 py-2 font-medium">{t("theoryPersonalRequestColStudent")}</th>
                    <th className="px-3 py-2 font-medium">{t("theoryPersonalRequestColInstructor")}</th>
                    <th className="px-3 py-2 font-medium">{t("theoryPersonalRequestColStatus")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.id}
                      className={cn(
                        "border-b last:border-0 cursor-pointer transition-colors hover:bg-muted/40",
                        detailRow?.id === r.id && "bg-muted/30",
                      )}
                      onClick={() => setDetailRow(r)}
                    >
                      <td className="text-muted-foreground px-3 py-2.5 whitespace-nowrap">
                        {formatDateTime(r.createdAt, lang)}
                      </td>
                      <td className="px-3 py-2.5 font-medium">{r.studentName}</td>
                      <td className="px-3 py-2.5">{r.instructorName}</td>
                      <td className="px-3 py-2.5">
                        <Badge className={statusBadgeClass(r.status)}>{statusLabel(r.status)}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </AdminTableScroll>
          </>
        )}
      </Card>

      <TheoryPersonalRequestDetailModal
        row={detailRow}
        branchLabel={detailBranchLabel}
        open={detailRow != null}
        onOpenChange={(open) => {
          if (!open) {
            setDetailRow(null);
            setConfirmRemoveOpen(false);
          }
        }}
        busy={busy}
        confirmRemoveOpen={confirmRemoveOpen}
        onConfirmRemoveOpenChange={setConfirmRemoveOpen}
        onCancel={() => detailRow && void cancelRequest(detailRow.id)}
        onRemove={() => void removeRequest()}
        onBook={() => detailRow && openBooking(detailRow)}
      />
    </>
  );
}
