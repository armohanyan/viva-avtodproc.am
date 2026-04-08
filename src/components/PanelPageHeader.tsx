import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "src/lib/utils";

export type PanelPageHeaderProps = {
  icon?: LucideIcon;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export default function PanelPageHeader({ icon: Icon, title, subtitle, actions, className }: PanelPageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-6", className)}>
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2 flex-wrap">
          {Icon ? <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-primary shrink-0" aria-hidden /> : null}
          <span className="min-w-0 break-words">{title}</span>
        </h2>
        {subtitle != null && subtitle !== "" ? (
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl leading-relaxed">{subtitle}</p>
        ) : null}
      </div>
      {actions != null ? <div className="shrink-0 flex flex-wrap gap-2 justify-end">{actions}</div> : null}
    </div>
  );
}
