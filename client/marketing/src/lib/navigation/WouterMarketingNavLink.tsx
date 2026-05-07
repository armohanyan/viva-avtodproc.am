import type { ReactElement } from "react";
import type { MarketingNavLinkProps } from "src/lib/navigation/marketingNavLink.types";

export function WouterMarketingNavLink({
  href,
  className,
  children,
  onClick,
}: MarketingNavLinkProps): ReactElement {
  return (
    <a href={href} className={className} onClick={onClick}>
      {children}
    </a>
  );
}
