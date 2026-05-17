import { useCallback, useEffect, useState } from "react";
import { Reveal } from "src/lib/motion";
import { Card } from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";
import ConfirmDialog from "src/components/ConfirmDialog";
import { useLang, type TranslationKey } from "src/lib/i18n";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { useToast } from "src/lib/toast";
import { cn } from "src/lib/utils";
import { localeFromLang } from "src/components/dashboard/studentBookingDisplay";

type RequestStatus = "pending" | "contacted" | "booked" | "cancelled";

type RequestRow = {
  id: number;
  instructorName: string;
  note: string | null;
  selectedThemes: string[];
  status: RequestStatus;
  createdAt: string;
};

function statusBadgeClass(status: RequestStatus): string {
  if (status === "pending") return "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-100";
  if (status === "contacted") return "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-100";
  if (status === "booked") return "bg-primary/10 text-primary";
  return "bg-muted text-muted-foreground";
}

export default function StudentTheoryPersonalRequestsPanel() {
  const { t, lang } = useLang();
  const { showToast } = useToast();
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [cancelTarget, setCancelTarget] = useState<RequestRow | null>(null);

  const statusLabel = (status: RequestStatus): string => {
    const map: Record<RequestStatus, TranslationKey> = {
      pending: "theoryPersonalRequestStatusPending",
      contacted: "theoryPersonalRequestStatusContacted",
      booked: "theoryPersonalRequestStatusBooked",
      cancelled: "theoryPersonalRequestStatusCancelled",
    };
    return t(map[status]);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await vivaApiJson<RequestRow[]>("/personal-theory-lesson-requests/mine");
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

  useEffect(() => {
    const refreshOnVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", refreshOnVisible);
    return () => document.removeEventListener("visibilitychange", refreshOnVisible);
  }, [load]);

  const activeRows = rows.filter((r) => r.status === "pending" || r.status === "contacted");
  const locale = localeFromLang(lang);

  const confirmCancelRequest = async () => {
    if (!cancelTarget) return;
    setBusyId(cancelTarget.id);
    try {
      await vivaApiJson(`/personal-theory-lesson-requests/${cancelTarget.id}/cancel-mine`, { method: "POST" });
      showToast(t("theoryPersonalRequestStudentCancelledToast"), "success");
      setCancelTarget(null);
      await load();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setBusyId(null);
    }
  };

  if (!loading && activeRows.length === 0) {
    return null;
  }

  return (
    <Reveal delay={0.04}>
      <ConfirmDialog
        open={cancelTarget != null}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => void confirmCancelRequest()}
        title={t("theoryPersonalRequestStudentCancelTitle")}
        description={t("theoryPersonalRequestStudentCancelBody")}
        confirmLabel={t("theoryPersonalRequestActionCancel")}
        danger
      />

      <h2 className="text-base font-semibold text-foreground mb-1">{t("bookingsTheoryPersonalRequestsTitle")}</h2>
      <p className="text-sm text-muted-foreground mb-3">{t("bookingsTheoryPersonalRequestsHint")}</p>
      <Card className="border-border overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse min-w-[640px]">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th scope="col" className="py-3 px-4 font-medium text-muted-foreground whitespace-nowrap">
                  {t("theoryPersonalRequestColCreated")}
                </th>
                <th scope="col" className="py-3 px-4 font-medium text-muted-foreground min-w-[8rem]">
                  {t("theoryPersonalRequestColInstructor")}
                </th>
                <th scope="col" className="py-3 px-4 font-medium text-muted-foreground min-w-[10rem]">
                  {t("theoryPersonalRequestColStatus")}
                </th>
                <th scope="col" className="py-3 px-4 font-medium text-muted-foreground min-w-[12rem]">
                  {t("theoryPersonalRequestColNote")}
                </th>
                <th scope="col" className="py-3 px-4 font-medium text-muted-foreground text-right whitespace-nowrap">
                  {t("bookingsTableColActions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 px-4 text-center text-muted-foreground">
                    {t("loading")}
                  </td>
                </tr>
              ) : (
                activeRows.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-b-0 hover:bg-muted/20">
                    <td className="py-3 px-4 text-muted-foreground whitespace-nowrap tabular-nums">
                      {new Date(r.createdAt).toLocaleString(locale, {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="py-3 px-4 text-foreground font-medium">{r.instructorName}</td>
                    <td className="py-3 px-4 align-top">
                      <Badge className={cn("text-xs font-normal w-fit", statusBadgeClass(r.status))}>
                        {statusLabel(r.status)}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground max-w-[240px]">
                      <p className="whitespace-pre-wrap">{r.note?.trim() ? r.note : "—"}</p>
                      {r.selectedThemes.length > 0 ? (
                        <p className="mt-1 text-xs text-foreground/80">{r.selectedThemes.join(", ")}</p>
                      ) : null}
                    </td>
                    <td className="py-3 px-4 text-right align-top whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs text-destructive hover:text-destructive"
                        disabled={busyId === r.id}
                        onClick={() => setCancelTarget(r)}
                      >
                        {busyId === r.id ? t("loading") : t("theoryPersonalRequestStudentCancelCta")}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </Reveal>
  );
}
