import { Badge } from "src/components/ui/badge";
import { useLang } from "src/lib/i18n";
import { cn } from "src/lib/utils";

const PACKAGE_BADGE_CLASS = "bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-100";

/** Shows that a lesson was booked from package credits, with the catalog package name. */
export function PackageCreditMark({
  packageName,
  className,
  tone = "default",
}: {
  packageName?: string | null;
  className?: string;
  /** Light text for the colored day-graphic cells. */
  tone?: "default" | "onColor";
}) {
  const { t } = useLang();
  const name = packageName?.trim() ?? "";
  const label = t("adminBookingFlowPackage");

  if (tone === "onColor") {
    const text = name ? `${label}: ${name}` : label;
    return (
      <span
        className={cn(
          "block max-w-full truncate text-[10px] sm:text-[11px] font-medium leading-tight opacity-95",
          className,
        )}
        title={text}
      >
        {text}
      </span>
    );
  }

  return (
    <span className={cn("inline-flex max-w-full flex-col items-start gap-0.5", className)}>
      <Badge className={cn("text-xs font-normal", PACKAGE_BADGE_CLASS)}>{label}</Badge>
      {name ? (
        <span className="max-w-[14rem] truncate text-xs font-medium text-foreground" title={name}>
          {name}
        </span>
      ) : null}
    </span>
  );
}
