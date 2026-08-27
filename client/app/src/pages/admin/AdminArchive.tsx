import { Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "src/components/AdminLayout";
import AdminTableScroll from "src/components/AdminTableScroll";
import ConfirmDialog from "src/components/ConfirmDialog";
import PanelPageHeader from "src/components/PanelPageHeader";
import TableSkeletonRows from "src/components/TableSkeletonRows";
import { Button } from "src/components/ui/button";
import { Card } from "src/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "src/components/ui/select";
import { formatDateTime } from "src/lib/adminFormat";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";

type ArchiveKind = "booking" | "slot";
type ArchiveFilter = "all" | ArchiveKind;

type BookingArchiveRow = {
  id: number;
  kind: ArchiveKind;
  bookingId: number | null;
  remark: string;
  archivedByUserId: number;
  archivedByName: string;
  archivedByEmail: string | null;
  branchId: number | null;
  branchName: string | null;
  studentUserId: number | null;
  studentName: string | null;
  instructorUserId: number | null;
  instructorName: string | null;
  lessonType: string | null;
  dateIso: string | null;
  time: string | null;
  endTime: string | null;
  slotDateIso: string | null;
  slotTime: string | null;
  totalPriceAmd: number | null;
  paymentStatus: string | null;
  paidAmountAmd: number | null;
  bookingStatusBefore: string | null;
  archivedAt: string;
};

function lessonTypeLabel(t: (k: string) => string, lessonType: string | null): string {
  if (lessonType === "practical") return t("lessonTypePractical");
  if (lessonType === "theory") return t("lessonTypeTheory");
  if (lessonType === "theory_personal") return t("lessonTypeTheoryPersonal");
  return lessonType?.trim() || "—";
}

export default function AdminArchivePage(): JSX.Element {
  const { t, lang } = useLang();
  const { showToast } = useToast();
  const [rows, setRows] = useState<BookingArchiveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [kindFilter, setKindFilter] = useState<ArchiveFilter>("all");
  const [purgeId, setPurgeId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await vivaApiJson<BookingArchiveRow[]>("/bookings/archives");
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

  const filtered = useMemo(() => {
    if (kindFilter === "all") return rows;
    return rows.filter((r) => r.kind === kindFilter);
  }, [rows, kindFilter]);

  const handlePurge = async () => {
    if (purgeId == null) return;
    try {
      await vivaApiJson(`/bookings/archives/${purgeId}`, { method: "DELETE" });
      setPurgeId(null);
      setRows((prev) => prev.filter((r) => r.id !== purgeId));
      showToast(t("adminArchivePurgedToast"), "success");
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
      throw e;
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <PanelPageHeader title={t("adminArchiveNav")} subtitle={t("adminArchivePageDesc")} />
        <div className="flex items-center justify-end">
          <Select value={kindFilter} onValueChange={(v) => setKindFilter(v as ArchiveFilter)}>
            <SelectTrigger className="w-[12rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("adminArchiveFilterAll")}</SelectItem>
              <SelectItem value="booking">{t("adminArchiveFilterBooking")}</SelectItem>
              <SelectItem value="slot">{t("adminArchiveFilterSlot")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Card className="overflow-hidden p-0">
          {!loading && filtered.length === 0 ? (
            <p className="text-muted-foreground p-6 text-sm">{t("adminArchiveEmpty")}</p>
          ) : (
            <AdminTableScroll>
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="px-3 py-2 font-medium">{t("adminArchiveColWhen")}</th>
                    <th className="px-3 py-2 font-medium">{t("adminArchiveColKind")}</th>
                    <th className="px-3 py-2 font-medium">{t("adminArchiveColWho")}</th>
                    <th className="px-3 py-2 font-medium">{t("adminArchiveColBranch")}</th>
                    <th className="px-3 py-2 font-medium">{t("adminArchiveColStudent")}</th>
                    <th className="px-3 py-2 font-medium">{t("adminArchiveColInstructor")}</th>
                    <th className="px-3 py-2 font-medium">{t("adminArchiveColSchedule")}</th>
                    <th className="px-3 py-2 font-medium">{t("adminArchiveColRemark")}</th>
                    <th className="px-3 py-2 font-medium w-[1%]">{t("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <TableSkeletonRows cols={9} cellClassName="px-3 py-2" />
                  ) : (
                    filtered.map((r) => {
                      const scheduleParts =
                        r.kind === "slot"
                          ? [r.slotDateIso, r.slotTime].filter(Boolean)
                          : [r.dateIso, r.time, r.endTime ? `→ ${r.endTime}` : null].filter(Boolean);
                      return (
                        <tr key={r.id} className="border-b last:border-0 align-top">
                          <td className="text-muted-foreground px-3 py-2 whitespace-nowrap">
                            {formatDateTime(r.archivedAt, lang)}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <div className="font-medium">
                              {r.kind === "slot" ? t("adminArchiveKindSlot") : t("adminArchiveKindBooking")}
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {lessonTypeLabel(t, r.lessonType)}
                              {r.bookingId != null ? ` · #${r.bookingId}` : ""}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <div>{r.archivedByName}</div>
                            {r.archivedByEmail ? (
                              <div className="text-muted-foreground text-xs">{r.archivedByEmail}</div>
                            ) : null}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">{r.branchName ?? "—"}</td>
                          <td className="px-3 py-2">{r.studentName ?? "—"}</td>
                          <td className="px-3 py-2">{r.instructorName ?? "—"}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{scheduleParts.join(" ") || "—"}</td>
                          <td className="max-w-[240px] px-3 py-2 whitespace-pre-wrap text-muted-foreground">
                            {r.remark}
                          </td>
                          <td className="px-3 py-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              aria-label={t("delete")}
                              onClick={() => setPurgeId(r.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </AdminTableScroll>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={purgeId != null}
        onClose={() => setPurgeId(null)}
        onConfirm={handlePurge}
        title={t("adminArchivePurgeTitle")}
        description={t("adminArchivePurgeDesc")}
        confirmLabel={t("delete")}
        danger
      />
    </AdminLayout>
  );
}
