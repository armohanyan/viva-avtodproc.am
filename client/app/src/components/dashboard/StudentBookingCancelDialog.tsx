import type { StudentDemoBooking } from "src/data/studentDemoBookings";
import { Button } from "src/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "src/components/ui/dialog";
import { useLang } from "src/lib/i18n";
import { cn } from "src/lib/utils";
import { formatTimeRange, fullDateLabel } from "src/components/dashboard/studentBookingDisplay";

type Props = {
  booking: StudentDemoBooking | null;
  locale: string;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function StudentBookingCancelDialog({ booking, locale, busy, onOpenChange, onConfirm }: Props) {
  const { t } = useLang();

  return (
    <Dialog open={booking != null} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          "gap-0 overflow-hidden p-0 sm:max-w-md",
          "w-[min(100%,calc(100vw-1.5rem))] max-h-[min(90dvh,40rem)]",
          "border-border bg-card text-card-foreground shadow-xl",
          "rounded-xl",
        )}
      >
        <div
          className={cn(
            "border-b border-border bg-gradient-to-b from-primary/[0.06] to-transparent",
            "px-4 pb-4 pt-5 sm:px-6 sm:pb-5 sm:pt-6",
          )}
        >
          <DialogHeader className="space-y-0 text-left sm:text-left">
            <DialogTitle className="text-balance pr-10 text-base font-semibold tracking-tight text-foreground sm:text-lg">
              {t("bookingsCancelDialogTitle")}
            </DialogTitle>
          </DialogHeader>
          <DialogDescription asChild>
            <div className="mt-4 space-y-4 text-left text-sm leading-relaxed">
              {booking?.cancelRefundEligible ? (
                <p className="text-muted-foreground">{t("bookingsCancelAdminPathConfirm")}</p>
              ) : (
                <div className="space-y-2">
                  <p className="inline-flex w-fit max-w-full items-center rounded-md border border-destructive/25 bg-destructive/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-destructive">
                    {t("bookingsCancelLateWarningTitle")}
                  </p>
                  <p className="text-muted-foreground">{t("bookingsCancelLateWarningBody")}</p>
                </div>
              )}
              {booking ? (
                <div className="rounded-lg border border-border bg-background/80 p-3 shadow-inner sm:p-4 dark:bg-background/40">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t("bookingsTableColDate")} · {t("bookingsTableColTime")}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground tabular-nums">
                    {fullDateLabel(booking.dateIso, locale)}
                    <span className="text-muted-foreground"> · </span>
                    {formatTimeRange(booking.time, booking.endTime)}
                  </p>
                  <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t("bookingsTableColInstructor")}
                  </p>
                  <p className="mt-1 text-sm font-medium text-foreground">{booking.instructor}</p>
                  {typeof booking.hoursUntilLesson === "number" && booking.hoursUntilLesson >= 0 ? (
                    <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground tabular-nums">
                      {t("bookingsCancelHoursUntilLesson")}: {booking.hoursUntilLesson.toFixed(1)}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </DialogDescription>
        </div>
        <div className="flex flex-col gap-2 px-4 py-4 sm:px-6 sm:py-4">
          <Button
            type="button"
            variant="outline"
            className="min-h-10 h-auto w-full border-border bg-background/80 py-2 whitespace-normal break-words text-center"
            onClick={() => onOpenChange(false)}
          >
            {t("bookingsCancelDialogDismiss")}
          </Button>
          <Button
            type="button"
            variant={booking?.cancelRefundEligible ? "default" : "destructive"}
            className={cn(
              "min-h-10 h-auto w-full py-2 shadow-sm whitespace-normal break-words text-center",
              !booking?.cancelRefundEligible &&
                "dark:bg-destructive dark:text-white dark:hover:bg-destructive/90 dark:focus-visible:ring-destructive/30",
            )}
            disabled={busy}
            onClick={() => void onConfirm()}
          >
            {busy
              ? t("loading")
              : booking?.cancelRefundEligible
                ? t("bookingsCancelDialogConfirmRequest")
                : t("bookingsCancelDialogConfirmLate")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
