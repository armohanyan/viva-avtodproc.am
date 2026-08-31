import { Link, useLocation } from "wouter";
import { cn } from "src/lib/utils";

type Props = {
  basePath: string;
};

export function useDirectorSectionView(basePath: string): "report" | "records" {
  const [location] = useLocation();
  return location === `${basePath}/records` ? "records" : "report";
}

export default function DirectorSectionNav({ basePath }: Props) {
  const [location] = useLocation();
  const isRecords = location === `${basePath}/records`;

  const tabs = [
    { href: basePath, label: "Հաշվետվություն", active: !isRecords },
    { href: `${basePath}/records`, label: "Տվյալներ", active: isRecords },
  ];

  return (
    <nav className="flex gap-1 border-b border-border mb-6 -mt-2" aria-label="Բաժնի նավիգացիա">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={cn(
            "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
            tab.active
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
