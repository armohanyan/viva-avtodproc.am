import { Search } from "lucide-react";
import { Input } from "src/components/ui/input";
import { useLang } from "src/lib/i18n";
import { cn } from "src/lib/utils";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** Extra filter controls (chips, selects) shown to the right on larger screens */
  children?: React.ReactNode;
}

export default function DataTableToolbar({ value, onChange, placeholder, className, children }: Props) {
  const { t } = useLang();
  return (
    <div
      className={cn(
        "p-4 border-b border-border flex min-w-0 w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3",
        className,
      )}
    >
      <div className="relative w-full min-w-0 sm:max-w-sm shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? t("search")}
          className="pl-9 h-9 w-full min-w-0"
          aria-label={t("search")}
        />
      </div>
      {children ? (
        <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-2">
          {children}
        </div>
      ) : null}
    </div>
  );
}
