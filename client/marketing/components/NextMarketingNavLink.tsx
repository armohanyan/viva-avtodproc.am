"use client";

import NextLink from "next/link";
import type { ReactElement } from "react";
import type { MarketingNavLinkProps } from "src/lib/navigation/marketingNavLink.types";

export function NextMarketingNavLink({
  href,
  className,
  children,
  onClick,
}: MarketingNavLinkProps): ReactElement {
  return (
    <NextLink href={href} prefetch scroll className={className} onClick={onClick}>
      {children}
    </NextLink>
  );
}
