import { useLang } from "src/lib/i18n";
import { useAppNavigation } from "src/lib/navigation/AppNavigationContext";
import { cn } from "src/lib/utils";

type Variant = "light" | "dark";

type Props = {
  variant?: Variant;
  className?: string;
  compact?: boolean;
  showHint?: boolean;
  showPolicyLink?: boolean;
  show3ds?: boolean;
};

const THREE_DS_KEYS = [
  "vpos3dsVerifiedByVisa",
  "vpos3dsSecureCode",
  "vpos3dsSafeKey",
  "vpos3dsArCaSecurePay",
] as const;

function CardLogosRow({ variant, compact }: { variant: Variant; compact: boolean }) {
  const visaSrc = variant === "dark" ? "/payments/visa-white.png" : "/payments/visa.png";
  const arcaSrc = variant === "dark" ? "/payments/arca-dark.png" : "/payments/arca.png";
  const logoClass = compact ? "h-4 w-auto object-contain" : "h-5 w-auto object-contain";

  return (
    <div className="flex flex-wrap items-center gap-3" aria-label="Accepted card brands">
      <img src={visaSrc} alt="Visa" className={logoClass} />
      <img src="/payments/mastercard.svg" alt="Mastercard" className={logoClass} />
      <img src={arcaSrc} alt="ArCa" className={logoClass} />
      <img src="/payments/amex.png" alt="American Express" className={logoClass} />
    </div>
  );
}

function ThreeDSecureRow({ variant, compact }: { variant: Variant; compact: boolean }) {
  const { t } = useLang();
  const mutedClass = variant === "dark" ? "text-hero-foreground/60" : "text-muted-foreground";
  const pillClass =
    variant === "dark"
      ? "border-hero-foreground/20 bg-hero-foreground/5 text-hero-foreground/80"
      : "border-border bg-muted/40 text-muted-foreground";

  return (
    <div className={compact ? "space-y-1" : "space-y-1.5"}>
      <p className={cn("uppercase tracking-wide", compact ? "text-[10px]" : "text-[11px]", mutedClass)}>
        {t("vpos3dsHeading")}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {THREE_DS_KEYS.map((key) => (
          <span
            key={key}
            className={cn("rounded border px-2 py-0.5 leading-snug", compact ? "text-[10px]" : "text-[11px]", pillClass)}
          >
            {t(key)}
          </span>
        ))}
      </div>
    </div>
  );
}

export function AcbaPaymentAcceptanceMarks({
  variant = "light",
  className = "",
  compact = false,
  showHint = true,
  showPolicyLink = true,
  show3ds = true,
}: Props) {
  const { t } = useLang();
  const { MarketingLink } = useAppNavigation();
  const mutedClass = variant === "dark" ? "text-hero-foreground/70" : "text-muted-foreground";
  const linkClass =
    variant === "dark"
      ? "text-hero-foreground/80 underline underline-offset-2 hover:text-hero-foreground"
      : "underline underline-offset-2 hover:text-foreground";

  return (
    <div className={cn(compact ? "space-y-2" : "space-y-3", className)}>
      {showHint ? (
        <p className={cn("leading-relaxed", compact ? "text-[11px]" : "text-xs", mutedClass)}>
          {t("vposSecurePaymentHint")}
        </p>
      ) : null}
      <CardLogosRow variant={variant} compact={compact} />
      {show3ds ? <ThreeDSecureRow variant={variant} compact={compact} /> : null}
      {showPolicyLink ? (
        <p className={cn(compact ? "text-[11px]" : "text-xs", mutedClass)}>
          <MarketingLink href="/payments-and-refunds" className={linkClass}>
            {t("vposPolicyLink")}
          </MarketingLink>
        </p>
      ) : null}
    </div>
  );
}
