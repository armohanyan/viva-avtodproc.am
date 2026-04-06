import type { ReactNode } from "react";
import { cn } from "src/lib/utils";

/** Horizontal scroll wrapper for wide admin tables on small viewports. */
export default function AdminTableScroll({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "w-full min-w-0 overflow-x-auto touch-pan-x overscroll-x-contain",
        "[&_thead_th:last-child]:sticky [&_thead_th:last-child]:right-0 [&_thead_th:last-child]:z-20 [&_thead_th:last-child]:bg-muted/40",
        "[&_tbody_td:last-child]:sticky [&_tbody_td:last-child]:right-0 [&_tbody_td:last-child]:z-10 [&_tbody_td:last-child]:bg-background",
        "[&_thead_th:last-child]:shadow-[-1px_0_0_0_hsl(var(--border))] [&_tbody_td:last-child]:shadow-[-1px_0_0_0_hsl(var(--border))]",
        className,
      )}
    >
      {children}
    </div>
  );
}
