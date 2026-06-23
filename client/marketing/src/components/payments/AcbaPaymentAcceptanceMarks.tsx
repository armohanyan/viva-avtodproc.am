import { ShieldCheck } from "lucide-react";
import { useLang } from "src/lib/i18n";
import { useAppNavigation } from "src/lib/navigation/AppNavigationContext";
import { cn } from "src/lib/utils";

type Variant = "light" | "dark";
type Layout = "stack" | "panel";

type Props = {
  variant?: Variant;
  layout?: Layout;
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
    <div className="flex flex-wrap items-center gap-2.5 sm:gap-3" aria-label="Accepted card brands">
      <img src={visaSrc} alt="Visa" className={logoClass} />
      <img src="/payments/mastercard.svg" alt="Mastercard" className={logoClass} />
      <img src={arcaSrc} alt="ArCa" className={logoClass} />
      <img src="/payments/amex.png" alt="American Express" className={logoClass} />
    </div>
  );
}

function ThreeDSecureRow({
  variant,
  compact,
  inline,
}: {
  variant: Variant;
  compact: boolean;
  inline?: boolean;
}) {
  const { t } = useLang();
  const mutedClass = variant === "dark" ? "text-hero-foreground/60" : "text-muted-foreground";
  const pillClass =
    variant === "dark"
      ? "border-hero-foreground/20 bg-hero-foreground/5 text-hero-foreground/80"
      : "border-border bg-background/80 text-muted-foreground";

  if (inline) {
    return (
      <p className={cn("leading-relaxed", compact ? "text-[10px]" : "text-[11px]", mutedClass)}>
        {THREE_DS_KEYS.map((key) => t(key)).join(" · ")}
      </p>
    );
  }

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

function PolicyLink({
  variant,
  compact,
  className,
}: {
  variant: Variant;
  compact: boolean;
  className?: string;
}) {
  const { t } = useLang();
  const { MarketingLink } = useAppNavigation();
  const mutedClass = variant === "dark" ? "text-hero-foreground/70" : "text-muted-foreground";
  const linkClass =
    variant === "dark"
      ? "text-hero-foreground/80 underline underline-offset-2 hover:text-hero-foreground"
      : "text-foreground/80 underline underline-offset-2 hover:text-foreground";

  return (
    <p className={cn(compact ? "text-[11px]" : "text-xs", mutedClass, className)}>
      <MarketingLink href="/payments-and-refunds" className={linkClass}>
        {t("vposPolicyLink")}
      </MarketingLink>
    </p>
  );
}

function PanelLayout({
  variant,
  compact,
  showHint,
  showPolicyLink,
  show3ds,
}: {
  variant: Variant;
  compact: boolean;
  showHint: boolean;
  showPolicyLink: boolean;
  show3ds: boolean;
}) {
  const { t } = useLang();
  const mutedClass = variant === "dark" ? "text-hero-foreground/70" : "text-muted-foreground";
  const surfaceClass =
    variant === "dark"
      ? "border-hero-foreground/15 bg-hero-foreground/5"
      : "border-border/70 bg-muted/25";

  return (
    <div className={cn("rounded-xl border px-3.5 py-3 sm:px-4 sm:py-3.5 space-y-2.5", surfaceClass)}>
      {showHint ? (
        <div className="flex items-start gap-2.5">
          <ShieldCheck
            className={cn(
              "shrink-0 mt-0.5",
              compact ? "w-3.5 h-3.5" : "w-4 h-4",
              variant === "dark" ? "text-primary" : "text-primary",
            )}
            aria-hidden
          />
          <div className="min-w-0 space-y-0.5">
            <p className={cn("font-medium text-foreground", compact ? "text-[11px]" : "text-xs")}>
              {t("vposFooterPaymentsHeading")}
            </p>
            <p className={cn("leading-relaxed", compact ? "text-[10px]" : "text-[11px]", mutedClass)}>
              {t("vposSecurePaymentHint")}
            </p>
          </div>
        </div>
      ) : null}
      <CardLogosRow variant={variant} compact={compact} />
      {show3ds ? <ThreeDSecureRow variant={variant} compact={compact} inline={compact} /> : null}
      {showPolicyLink ? <PolicyLink variant={variant} compact={compact} /> : null}
    </div>
  );
}

function StackLayout({
  variant,
  compact,
  showHint,
  showPolicyLink,
  show3ds,
}: {
  variant: Variant;
  compact: boolean;
  showHint: boolean;
  showPolicyLink: boolean;
  show3ds: boolean;
}) {
  const { t } = useLang();
  const mutedClass = variant === "dark" ? "text-hero-foreground/70" : "text-muted-foreground";

  return (
    <>
      {showHint ? (
        <p className={cn("leading-relaxed", compact ? "text-[11px]" : "text-xs", mutedClass)}>
          {t("vposSecurePaymentHint")}
        </p>
      ) : null}
      <CardLogosRow variant={variant} compact={compact} />
      {show3ds ? <ThreeDSecureRow variant={variant} compact={compact} /> : null}
      {showPolicyLink ? <PolicyLink variant={variant} compact={compact} /> : null}
    </>
  );
}

export function AcbaPaymentAcceptanceMarks({
  variant = "light",
  layout = "stack",
  className = "",
  compact = false,
  showHint = true,
  showPolicyLink = true,
  show3ds = true,
}: Props) {
  const content =
    layout === "panel" ? (
      <PanelLayout
        variant={variant}
        compact={compact}
        showHint={showHint}
        showPolicyLink={showPolicyLink}
        show3ds={show3ds}
      />
    ) : (
      <StackLayout
        variant={variant}
        compact={compact}
        showHint={showHint}
        showPolicyLink={showPolicyLink}
        show3ds={show3ds}
      />
    );

  return (
    <div className={cn(layout === "stack" ? (compact ? "space-y-2" : "space-y-3") : undefined, className)}>
      {content}
    </div>
  );
}
