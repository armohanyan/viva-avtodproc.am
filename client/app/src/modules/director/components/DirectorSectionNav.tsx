import { Link, useLocation } from "wouter";
import { cn } from "src/lib/utils";

export type DirectorSectionTab = {
  /** Path suffix after basePath. Empty string = report (base path). */
  suffix: string;
  label: string;
};

const DEFAULT_TABS: DirectorSectionTab[] = [
  { suffix: "", label: "Հաշվետվություն" },
  { suffix: "/records", label: "Տվյալներ" },
];

type Props = {
  basePath: string;
  tabs?: DirectorSectionTab[];
};

export function useDirectorSectionView(basePath: string): string {
  const [location] = useLocation();
  if (location === basePath || location === `${basePath}/`) return "report";
  if (location.startsWith(`${basePath}/`)) {
    return location.slice(basePath.length + 1);
  }
  return "report";
}

export default function DirectorSectionNav({ basePath, tabs = DEFAULT_TABS }: Props) {
  const [location] = useLocation();

  return (
    <nav className="flex gap-1 border-b border-border mb-6 -mt-2" aria-label="Բաժնի նավիգացիա">
      {tabs.map((tab) => {
        const href = `${basePath}${tab.suffix}`;
        const active =
          tab.suffix === ""
            ? location === basePath || location === `${basePath}/`
            : location === href;
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              active
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
