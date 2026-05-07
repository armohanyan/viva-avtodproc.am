import { Link, useLocation } from "wouter";
import { useLang } from "src/lib/i18n";
import { cn } from "src/lib/utils";

type ActiveTab = "exam" | "thematic" | "saved";

export default function DashboardLearnSubnav({ active }: { active: ActiveTab }) {
  const { t } = useLang();
  const [location] = useLocation();
  const examHref = location.startsWith("/dashboard/learn/") ? "/dashboard/learn/exam-tests" : "/dashboard/exam-tests";
  const thematicHref = "/dashboard/learn/thematic-tests";
  const savedHref = "/dashboard/learn/saved-questions";

  const tabClass = (isActive: boolean) =>
    cn(
      "px-3 py-2 sm:py-1.5 rounded-lg text-sm font-medium transition-colors min-h-10 sm:min-h-0 inline-flex items-center justify-center",
      isActive
        ? "bg-primary text-primary-foreground"
        : "border border-border text-muted-foreground hover:text-foreground hover:bg-accent",
    );

  return (
    <nav className="flex flex-wrap gap-2 mb-6 sm:mb-8" aria-label={t("learn")}>
      <Link href={thematicHref} className={tabClass(active === "thematic")}>
        {t("dashboardLearnThematicTests")}
      </Link>
        <Link href={examHref} className={tabClass(active === "exam")}>
            {t("dashboardLearnExamTests")}
        </Link>
      <Link href={savedHref} className={tabClass(active === "saved")}>
        {t("questionSavedListTitle")}
      </Link>
    </nav>
  );
}
