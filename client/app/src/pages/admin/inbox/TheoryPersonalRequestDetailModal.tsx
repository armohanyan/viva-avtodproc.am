import type { ReactNode } from "react";
import { Badge } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";
import { AppModal } from "src/components/AppModal";
import ConfirmDialog from "src/components/ConfirmDialog";
import { useLang } from "src/lib/i18n";
import { localeForLang } from "src/lib/adminFormat";
import { cn } from "src/lib/utils";

export type TheoryPersonalRequestRow = {
  id: string;
  studentUserId: number;
  studentName: string;
  studentPhone: string | null;
  studentPhone2: string | null;
  studentEmail: string;
  instructorUserId: number;
  instructorName: string;
  branchId: number;
  note: string | null;
  selectedThemes: string[];
  status: "pending" | "contacted" | "booked" | "cancelled";
  bookedLessonId: number | null;
  createdAt: string;
};

function statusBadgeClass(status: TheoryPersonalRequestRow["status"]): string {
  if (status === "pending") return "bg-amber-100 text-amber-800";
  if (status === "contacted") return "bg-blue-100 text-blue-800";
  if (status === "booked") return "bg-emerald-100 text-emerald-800";
  return "bg-muted text-muted-foreground";
}

type Props = {
  row: TheoryPersonalRequestRow | null;
  branchLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busy: boolean;
  onCancel: () => void;
  onRemove: () => void;
  onBook: () => void;
  confirmRemoveOpen: boolean;
  onConfirmRemoveOpenChange: (open: boolean) => void;
};

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm text-foreground">{children}</dd>
    </div>
  );
}

export function TheoryPersonalRequestDetailModal({
  row,
  branchLabel,
  open,
  onOpenChange,
  busy,
  onCancel,
  onRemove,
  onBook,
  confirmRemoveOpen,
  onConfirmRemoveOpenChange,
}: Props) {
  const { t, lang } = useLang();

  if (!row) return null;

  const statusLabel =
    row.status === "pending"
      ? t("theoryPersonalRequestStatusPending")
      : row.status === "contacted"
        ? t("theoryPersonalRequestStatusContacted")
        : row.status === "booked"
          ? t("theoryPersonalRequestStatusBooked")
          : t("theoryPersonalRequestStatusCancelled");

  const createdLabel = new Date(row.createdAt).toLocaleString(localeForLang(lang), {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const closed = row.status === "booked" || row.status === "cancelled";
  const canRemove = row.status !== "booked";
  const canAct = !closed;

  return (
    <>
      <AppModal
        open={open}
        onOpenChange={onOpenChange}
        title={t("theoryPersonalRequestDetailTitle")}
        description={`#${row.id} · ${row.studentName}`}
        contentClassName="sm:max-w-lg"
        footer={
          <div className="flex flex-col gap-2 px-6 pb-6 sm:flex-row sm:flex-wrap sm:justify-end">
            {canRemove ? (
              <Button type="button" variant="outline" disabled={busy} onClick={() => onConfirmRemoveOpenChange(true)}>
                {t("theoryPersonalRequestActionRemove")}
              </Button>
            ) : null}
            {canAct ? (
              <>
                <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>
                  {t("theoryPersonalRequestActionCancel")}
                </Button>
                <Button type="button" disabled={busy} onClick={onBook}>
                  {t("theoryPersonalRequestActionCreateBooking")}
                </Button>
              </>
            ) : null}
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={cn("text-xs font-normal", statusBadgeClass(row.status))}>{statusLabel}</Badge>
            <span className="text-xs text-muted-foreground">{createdLabel}</span>
          </div>

          <dl className="grid gap-4 sm:grid-cols-2">
            <DetailRow label={t("theoryPersonalRequestColStudent")}>{row.studentName}</DetailRow>
            <DetailRow label={t("theoryPersonalRequestColInstructor")}>{row.instructorName}</DetailRow>
            <DetailRow label={t("theoryPersonalRequestColContact")}>
              <div className="space-y-0.5">
                {row.studentPhone ? <div>{row.studentPhone}</div> : null}
                {row.studentPhone2 ? <div>{row.studentPhone2}</div> : null}
                <div className="break-all">{row.studentEmail}</div>
              </div>
            </DetailRow>
            <DetailRow label={t("theoryPersonalRequestColBranch")}>{branchLabel || "—"}</DetailRow>
          </dl>

          {row.selectedThemes.length > 0 ? (
            <DetailRow label={t("bookingTheoryThemesTitle")}>
              <p className="text-sm">{row.selectedThemes.join(", ")}</p>
            </DetailRow>
          ) : null}

          <DetailRow label={t("theoryPersonalRequestColNote")}>
            <p className="whitespace-pre-wrap text-muted-foreground">{row.note?.trim() ? row.note : "—"}</p>
          </DetailRow>

          {row.bookedLessonId != null ? (
            <DetailRow label={t("theoryPersonalRequestLinkedBooking")}>#{row.bookedLessonId}</DetailRow>
          ) : null}
        </div>
      </AppModal>

      <ConfirmDialog
        open={confirmRemoveOpen}
        onClose={() => onConfirmRemoveOpenChange(false)}
        onConfirm={onRemove}
        title={t("theoryPersonalRequestRemoveConfirmTitle")}
        description={t("theoryPersonalRequestRemoveConfirmBody")}
        confirmLabel={t("theoryPersonalRequestActionRemove")}
        danger
      />
    </>
  );
}
