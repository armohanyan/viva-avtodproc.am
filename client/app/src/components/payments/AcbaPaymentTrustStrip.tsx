import { AcbaPaymentAcceptanceMarks } from "src/components/payments/AcbaPaymentAcceptanceMarks";

type Props = {
  className?: string;
  compact?: boolean;
};

export function AcbaPaymentTrustStrip({ className = "", compact = false }: Props) {
  return (
    <AcbaPaymentAcceptanceMarks
      variant="light"
      className={className}
      compact={compact}
      showHint={!compact}
      showPolicyLink
      show3ds
    />
  );
}
