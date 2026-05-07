import type { ReactNode } from "react";
import { cn } from "src/lib/utils";

/** Horizontal scroll wrapper for wide admin tables on small viewports. */
export default function AdminTableScroll({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("w-full min-w-0 overflow-x-auto touch-pan-x overscroll-x-contain", className)}>{children}</div>
  );
}
