import { normalizeAppBase } from "src/lib/navigation/crossApp";

/**
 * Base URL for the Next marketing app when running the Vite panel.
 * Used for logout, "back to site", and `/` fallback redirect.
 */
function inferredMarketingOriginFromHostname(): string {
  if (typeof window === "undefined") return "";
  const { hostname, protocol } = window.location;
  if (!hostname.startsWith("app.")) return "";
  return normalizeAppBase(`${protocol}//${hostname.slice(4)}`);
}

export function resolvedViteMarketingOrigin(): string {
  const raw = (import.meta.env.VITE_MARKETING_ORIGIN as string | undefined)?.trim();
  if (raw) return normalizeAppBase(raw);
  if (import.meta.env.DEV) return "http://localhost:3000";
  return inferredMarketingOriginFromHostname();
}
