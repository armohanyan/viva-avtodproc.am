import type { TranslationKey } from "src/lib/i18n";
import { Button } from "src/components/ui/button";
import { Card } from "src/components/ui/card";
import { formatAmd } from "src/pages/admin/finance/adminFinanceShared";
export type CheckoutSummaryLines = {
  typeLabel: string;
  detailLines: string[];
  slotsLine: string | null;
};

type Props = {
  title: string;
  lines: CheckoutSummaryLines;
  totalAmd: number;
  validationMessageKeys: TranslationKey[];
  checkoutDisabled: boolean;
  checkoutHintKey: TranslationKey;
  onCheckout: () => void;
  t: (k: TranslationKey) => string;
};

export default function CheckoutSummary({
  title,
  lines,
  totalAmd,
  validationMessageKeys,
  checkoutDisabled,
  checkoutHintKey,
  onCheckout,
  t,
}: Props) {
  return (
    <Card className="border-border p-4 space-y-3 h-fit lg:sticky lg:top-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="text-sm space-y-1.5 text-muted-foreground">
        <p>
          <span className="font-medium text-foreground">{t("bookingColType")}:</span> {lines.typeLabel}
        </p>
        {lines.detailLines.map((line, i) => (
          <p key={i} className="break-words">
            {line}
          </p>
        ))}
        {lines.slotsLine ? (
          <p>
            <span className="font-medium text-foreground">{t("bookingColTime")}:</span> {lines.slotsLine}
          </p>
        ) : null}
      </div>
      <div className="pt-2 border-t border-border">
        <p className="text-xs text-muted-foreground">{t("adminBookingCheckoutTotalLabel")}</p>
        <p className="text-lg font-semibold tabular-nums text-foreground">{formatAmd(totalAmd)}</p>
      </div>
      {validationMessageKeys.length > 0 ? (
        <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-1 list-disc pl-4">
          {validationMessageKeys.map((k) => (
            <li key={k}>{t(k)}</li>
          ))}
        </ul>
      ) : null}
      <Button type="button" className="w-full" disabled={checkoutDisabled} onClick={onCheckout}>
        {t("adminBookingCheckoutContinue")}
      </Button>
      {checkoutDisabled ? <p className="text-xs text-muted-foreground">{t(checkoutHintKey)}</p> : null}
    </Card>
  );
}
