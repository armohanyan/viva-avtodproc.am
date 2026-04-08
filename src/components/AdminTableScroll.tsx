import type { ReactNode } from "react";
import { cn } from "src/lib/utils";

/** Horizontal scroll wrapper for wide admin tables on small viewports. */
export default function AdminTableScroll({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "w-full min-w-0 overflow-x-auto touch-pan-x overscroll-x-contain",
        // `border-collapse: collapse` + sticky `td`/`th` mis-places cells in Chromium; separate model fixes overlap with the previous column.
        "[&_table]:border-separate [&_table]:border-spacing-0",
        // Opaque surface + min width so horizontal scroll does not bleed through or squeeze the actions column into the prior column.
        "[&_thead_th:last-child]:sticky [&_thead_th:last-child]:right-0 [&_thead_th:last-child]:z-20 [&_thead_th:last-child]:min-w-[10.5rem] [&_thead_th:last-child]:bg-card",
        "[&_tbody_td:last-child]:sticky [&_tbody_td:last-child]:right-0 [&_tbody_td:last-child]:z-10 [&_tbody_td:last-child]:min-w-[10.5rem] [&_tbody_td:last-child]:bg-card",
        "[&_tbody_tr:hover_td:last-child]:bg-muted/30",
        "[&_thead_th:last-child]:shadow-[-1px_0_0_0_hsl(var(--border))] [&_tbody_td:last-child]:shadow-[-1px_0_0_0_hsl(var(--border))]",
        className,
      )}
    >
      {children}
    </div>
  );
}
