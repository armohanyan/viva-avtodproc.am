import { Link } from "wouter";
import { useLang } from "src/lib/i18n";
import { cn } from "src/lib/utils";

type ActiveTab = "overview" | "package" | "practical";

export default function DashboardBookingsSubnav({ active }: { active: ActiveTab }) {
  const { t } = useLang();

  const tabClass = (isActive: boolean) =>
    cn(
      "px-3 py-2 sm:py-1.5 rounded-lg text-sm font-medium transition-colors min-h-10 sm:min-h-0 inline-flex items-center justify-center",
      isActive
        ? "bg-primary text-primary-foreground"
        : "border border-border text-muted-foreground hover:text-foreground hover:bg-accent",
    );

  return (
    <nav className="flex flex-wrap gap-2 mb-6 sm:mb-8" aria-label={t("bookings")}>
      <Link href="/dashboard/bookings" className={tabClass(active === "overview")}>
        {t("bookingsSubnavOverview")}
      </Link>
      <Link href="/dashboard/bookings/package" className={tabClass(active === "package")}>
        {t("bookingsSubnavPackage")}
      </Link>
      <Link href="/dashboard/bookings/practical" className={tabClass(active === "practical")}>
        {t("bookingsSubnavPractical")}
      </Link>
    </nav>
  );
}
