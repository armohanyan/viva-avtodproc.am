import { useEffect, type ReactElement } from "react";
import { useLocation } from "wouter";
import { resolvedViteMarketingOrigin } from "src/lib/navigation/viteMarketingOrigin";

/**
 * Fallback when the URL is not a panel route: send users to the Next.js marketing app.
 * In dev, defaults to http://localhost:3000 when `VITE_MARKETING_ORIGIN` is unset (same idea as
 * Next’s default panel URL). In production same-origin deploys, leave env unset if nginx never
 * sends marketing paths here.
 */
export default function RedirectToMarketing(): ReactElement | null {
  const [pathname] = useLocation();
  const marketingBase = resolvedViteMarketingOrigin();

  useEffect(() => {
    const base = marketingBase.replace(/\/$/, "");

    if (!base) return;

    const target = `${base}${pathname}${window.location.search}${window.location.hash}`;

    if (target !== window.location.href) {
      window.location.replace(target);
    }
  }, [pathname, marketingBase]);

  if (marketingBase) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center text-muted-foreground text-sm">
      Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center text-muted-foreground text-sm max-w-md mx-auto">
      <p>This URL is served by the marketing app (Next.js). Run it from the repo root:</p>
      <code className="text-xs bg-muted px-2 py-1 rounded text-foreground">npm run dev:web</code>
      <p className="text-xs">
        Or set <code className="text-foreground">VITE_MARKETING_ORIGIN</code> (e.g.{" "}
        <code className="text-foreground">http://localhost:3000</code>) when the marketing app uses
        a different origin.
      </p>
    </div>
  );
}
