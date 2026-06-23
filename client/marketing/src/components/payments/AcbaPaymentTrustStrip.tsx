import { AcbaPaymentAcceptanceMarks } from "src/components/payments/AcbaPaymentAcceptanceMarks";

type Props = {
  className?: string;
  compact?: boolean;
};

/** Payment-path trust block: card logos, 3-D Secure, and policy link. */
export function AcbaPaymentTrustStrip({ className = "", compact = false }: Props) {
  return (
    <AcbaPaymentAcceptanceMarks
      variant="light"
      layout="panel"
      className={className}
      compact={compact}
      showHint={!compact}
      showPolicyLink
      show3ds
    />
  );
}
