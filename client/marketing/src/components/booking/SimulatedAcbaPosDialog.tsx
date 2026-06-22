import { useLang } from "src/lib/i18n";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "src/components/ui/dialog";
import { Button } from "src/components/ui/button";
import { AcbaPaymentTrustStrip } from "src/components/payments/AcbaPaymentTrustStrip";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amountAmd: number | null;
  locale: string;
  busy: boolean;
  onApprove: () => Promise<boolean>;
  variant?: "simulated" | "live";
};

export function SimulatedAcbaPosDialog({
  open,
  onOpenChange,
  amountAmd,
  locale,
  busy,
  onApprove,
  variant = "simulated",
}: Props) {
  const { t } = useLang();
  const live = variant === "live";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={!busy}>
        <DialogHeader>
          <DialogTitle>{live ? t("vposLiveDialogTitle") : t("bookingPosSimTitle")}</DialogTitle>
          <DialogDescription className="text-left space-y-3 pt-1">
            <span className="block text-foreground/90 text-sm">
              {live ? t("vposLiveDialogBody") : t("bookingPosSimBody")}
            </span>
            {amountAmd != null && Number.isFinite(amountAmd) ? (
              <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
                <span className="text-muted-foreground">{t("bookingPosSimAmountLabel")}: </span>
                <span className="font-semibold tabular-nums text-foreground">{amountAmd.toLocaleString(locale)} ֏</span>
              </div>
            ) : null}
            <AcbaPaymentTrustStrip compact />
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            {t("bookingPosSimCancel")}
          </Button>
          {!live ? (
            <Button
              type="button"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={busy}
              onClick={() => void onApprove().then((ok) => ok && onOpenChange(false))}
            >
              {busy ? t("loading") : t("bookingPosSimApprove")}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
