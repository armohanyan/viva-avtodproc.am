import { useEffect } from "react";
import { Plus } from "lucide-react";
import { Input } from "src/components/ui/input";
import { useLang, type TranslationKey } from "src/lib/i18n";
import { formatAmd, type TxMethod } from "src/pages/admin/finance/adminFinanceShared";
import {
  addAdminPaymentSession,
  adminPaymentStateForStatusChoice,
  adminPaymentStatusLabelKey,
  bookingRemainingAmd,
  canAddAdminPaymentSession,
  paidAmountFromState,
  removeAdminPaymentSession,
  syncAdminPaymentFromSessions,
  updateAdminPaymentSession,
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
  /** Show the "gift lesson" checkbox (admin add flow). When checked, payment fields are replaced by a gift note. */
  giftEnabled?: boolean;
  isGift?: boolean;
  onIsGiftChange?: (value: boolean) => void;
  giftNote?: string;
  onGiftNoteChange?: (value: string) => void;
  /** Current user is a super admin: their gifts are confirmed automatically (no approval request). */
  giftAutoApproved?: boolean;
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
  giftEnabled,
  isGift,
  onIsGiftChange,
  giftNote = "",
  onGiftNoteChange,
  giftAutoApproved,
}: Props) {
  const { t } = useLang();
  const total = Math.max(0, Math.round(totalPriceAmd));
  const remaining = bookingRemainingAmd(total, value);

  const setStatus = (status: AdminBookingPaymentStatus) => {
    onChange(adminPaymentStateForStatusChoice(value, status, total));
  };

  const showReminderDate = value.status === "unpaid" || value.status === "partial";
  const sessions = value.sessions ?? [];
  const showAddPayment = canAddAdminPaymentSession(value, total);

  useEffect(() => {
    const synced = syncAdminPaymentFromSessions(value, total);
    if (
      synced.status === value.status &&
      synced.paidStr === value.paidStr &&
      synced.paymentNotes === value.paymentNotes &&
      (synced.sessions?.length ?? 0) === (value.sessions?.length ?? 0) &&
      !(synced.status === "paid" && value.paymentReminderDate !== "")
    ) {
      return;
    }
    onChange(synced);
  }, [total, value, onChange]);

  const giftActive = Boolean(giftEnabled && isGift);

  return (
    <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
      {giftEnabled ? (
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium text-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={Boolean(isGift)}
              disabled={disabled}
              onChange={(e) => onIsGiftChange?.(e.target.checked)}
              className="h-4 w-4 rounded border-input accent-primary"
            />
            {t("adminBookingGiftCheckbox")}
          </label>
          {giftActive ? (
            <>
              <p className="rounded-md bg-primary/10 px-3 py-2 text-xs text-foreground">
                {t(giftAutoApproved ? "adminBookingGiftAutoApprovedHint" : "adminBookingGiftNoPaymentHint")}
              </p>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  {t("adminBookingGiftNoteLabel")}
                </label>
                <textarea
                  disabled={disabled}
                  value={giftNote}
                  onChange={(e) => onGiftNoteChange?.(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60 resize-y min-h-[4.5rem]"
                  placeholder={t("adminBookingGiftNotePlaceholder")}
                />
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {giftActive ? null : (
        <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            {t("adminBookingPaymentRemaining")}
          </label>
          <div className="h-10 flex items-center rounded-lg border border-input bg-muted/40 px-3 text-sm font-semibold tabular-nums text-amber-700">
            {formatAmd(remaining)}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {sessions.map((session, index) => (
          <div key={session.key} className="space-y-3 rounded-lg border border-border bg-background p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">
                {t("adminBookingPaymentSessionLabel").replace("%n", String(index + 1))}
              </p>
              {session.locked ? (
                <span className="text-xs text-muted-foreground">{t("adminBookingPaymentSessionLocked")}</span>
              ) : sessions.length > 1 ? (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange(removeAdminPaymentSession(value, session.key, total))}
                  className="text-xs font-medium text-red-600 hover:underline disabled:opacity-60"
                >
                  {t("adminBookingPaymentRemoveSession")}
                </button>
              ) : null}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  {t("adminBookingPaymentPaidAmount")}
                </label>
                <Input
                  inputMode="decimal"
                  disabled={disabled || session.locked}
                  value={session.paidStr}
                  onChange={(e) =>
                    onChange(updateAdminPaymentSession(value, session.key, { paidStr: e.target.value }, total))
                  }
                  className="h-10 tabular-nums"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("financeColDateTime")}</label>
                <Input
                  type="datetime-local"
                  disabled={disabled || session.locked}
                  value={session.datetimeLocal}
                  onChange={(e) =>
                    onChange(
                      updateAdminPaymentSession(value, session.key, { datetimeLocal: e.target.value }, total),
                    )
                  }
                  className="h-10"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">{t("financeColMethod")}</label>
                <select
                  value={session.method}
                  disabled={disabled || session.locked}
                  onChange={(e) =>
                    onChange(
                      updateAdminPaymentSession(
                        value,
                        session.key,
                        { method: e.target.value as TxMethod },
                        total,
                      ),
                    )
                  }
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                >
                  <option value="cash">{t("financeMethodCash")}</option>
                  <option value="card">{t("financeMethodCard")}</option>
                  <option value="transfer">{t("financeMethodTransfer")}</option>
                  <option value="idram">{t("financeMethodIdram")}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  {t("adminBookingPaymentNotes")}
                </label>
                <Input
                  disabled={disabled || session.locked}
                  value={session.note}
                  onChange={(e) =>
                    onChange(updateAdminPaymentSession(value, session.key, { note: e.target.value }, total))
                  }
                  placeholder={t("adminBookingPaymentNotesPlaceholder")}
                  className="h-10"
                />
              </div>
            </div>
          </div>
        ))}
        {showAddPayment ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(addAdminPaymentSession(value, total))}
            className="inline-flex items-center gap-2 rounded-lg border border-dashed border-input px-3 py-2 text-sm font-medium text-foreground hover:bg-muted/40 disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            {t("adminBookingPaymentAddInstallment")}
          </button>
        ) : null}
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
        </>
      )}
    </div>
  );
}
