import { useEffect } from "react";
import { Input } from "src/components/ui/input";
import { useLang, type TranslationKey } from "src/lib/i18n";
import { formatAmd, methodTKey, type TxMethod } from "src/pages/admin/finance/adminFinanceShared";
import {
  adminPaymentStateAfterPaidStrChange,
  adminPaymentStatusLabelKey,
  bookingRemainingAmd,
  paidAmountFromState,
  paidStrForStatusChange,
  type AdminBookingPaymentState,
  type AdminBookingPaymentStatus,
} from "src/modules/admin/booking/adminBookingPayment";

type Props = {
  totalPriceAmd: number;
  value: AdminBookingPaymentState;
  onChange: (next: AdminBookingPaymentState) => void;
  errorKey?: TranslationKey | null;
  disabled?: boolean;
  /** When set, total price is an input instead of read-only (used by quick practical booking). */
  totalPriceEditable?: boolean;
  totalPriceStr?: string;
  onTotalPriceStrChange?: (value: string) => void;
};

export default function AdminBookingPaymentSection({
  totalPriceAmd,
  value,
  onChange,
  errorKey,
  disabled,
  totalPriceEditable,
  totalPriceStr = "",
  onTotalPriceStrChange,
}: Props) {
  const { t } = useLang();
  const total = Math.max(0, Math.round(totalPriceAmd));
  const remaining = bookingRemainingAmd(total, value);

  const setStatus = (status: AdminBookingPaymentStatus) => {
    onChange({
      ...value,
      status,
      paidStr: paidStrForStatusChange(status, total, value.paidStr),
      ...(status === "paid" ? { paymentReminderDate: "" } : {}),
    });
  };

  const showReminderDate = value.status === "unpaid" || value.status === "partial";

  useEffect(() => {
    const synced = adminPaymentStateAfterPaidStrChange(value, value.paidStr, total);
    if (
      synced.status === value.status &&
      synced.paidStr === value.paidStr &&
      !(synced.status === "paid" && value.paymentReminderDate !== "")
    ) {
      return;
    }
    onChange(synced);
  }, [total, value, onChange]);

  return (
    <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">{t("financeColMethod")}</label>
          <select
            value={value.method}
            disabled={disabled}
            onChange={(e) => onChange({ ...value, method: e.target.value as TxMethod })}
            className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
          >
            <option value="cash">{t("financeMethodCash")}</option>
            <option value="card">{t("financeMethodCard")}</option>
            <option value="transfer">{t("financeMethodTransfer")}</option>
            <option value="idram">{t("financeMethodIdram")}</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">{t("financeColDateTime")}</label>
          <Input
            type="datetime-local"
            disabled={disabled}
            value={value.datetimeLocal}
            onChange={(e) => onChange({ ...value, datetimeLocal: e.target.value })}
            className="h-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            {t("adminBookingPaymentTotalPrice")}
          </label>
          {totalPriceEditable && onTotalPriceStrChange ? (
            <Input
              inputMode="decimal"
              disabled={disabled}
              value={totalPriceStr}
              onChange={(e) => onTotalPriceStrChange(e.target.value)}
              className="h-10 tabular-nums"
            />
          ) : (
            <div className="h-10 flex items-center rounded-lg border border-input bg-muted/40 px-3 text-sm font-semibold tabular-nums text-foreground">
              {formatAmd(total)}
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            {t("adminBookingPaymentPaidAmount")}
          </label>
          <Input
            inputMode="decimal"
            disabled={disabled}
            value={value.paidStr}
            onChange={(e) => onChange(adminPaymentStateAfterPaidStrChange(value, e.target.value, total))}
            className="h-10 tabular-nums"
            placeholder="0"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            {t("adminBookingPaymentRemaining")}
          </label>
          <div className="h-10 flex items-center rounded-lg border border-input bg-muted/40 px-3 text-sm font-semibold tabular-nums text-amber-700">
            {formatAmd(remaining)}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-1">
          {t("adminBookingPaymentStatusLabel")}
        </label>
        <select
          value={value.status}
          disabled={disabled}
          onChange={(e) => setStatus(e.target.value as AdminBookingPaymentStatus)}
          className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
        >
          <option value="paid">{t("adminBookingPaymentStatusPaid")}</option>
          <option value="partial">{t("adminBookingPaymentStatusPartial")}</option>
          <option value="unpaid">{t("adminBookingPaymentStatusUnpaid")}</option>
        </select>
        <p className="text-xs text-muted-foreground mt-1">
          {t(adminPaymentStatusLabelKey(value.status))}
          {paidAmountFromState(value) > 0 ? (
            <span className="ml-1 tabular-nums">· {formatAmd(paidAmountFromState(value))}</span>
          ) : null}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-muted-foreground mb-1">
          {t("adminBookingPaymentNotes")}
        </label>
        <textarea
          disabled={disabled}
          value={value.paymentNotes}
          onChange={(e) => onChange({ ...value, paymentNotes: e.target.value })}
          rows={3}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60 resize-y min-h-[4.5rem]"
          placeholder={t("adminBookingPaymentNotesPlaceholder")}
        />
      </div>

      {showReminderDate ? (
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            {t("adminBookingPaymentReminderDate")}
          </label>
          <Input
            type="date"
            disabled={disabled}
            value={value.paymentReminderDate}
            onChange={(e) => onChange({ ...value, paymentReminderDate: e.target.value })}
            className="h-10 max-w-xs"
          />
          <p className="text-xs text-muted-foreground mt-1">{t("adminBookingPaymentReminderDateHint")}</p>
        </div>
      ) : null}

      {errorKey ? <p className="text-xs text-red-600">{t(errorKey)}</p> : null}
    </div>
  );
}
