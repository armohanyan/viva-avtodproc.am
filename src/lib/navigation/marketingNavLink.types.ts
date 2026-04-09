import type { ReactNode } from "react";

/** Shared props for in-app marketing navigation (Next.js `Link` or `<a>` on Vite). */
export type MarketingNavLinkProps = {
  href: string;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
};
