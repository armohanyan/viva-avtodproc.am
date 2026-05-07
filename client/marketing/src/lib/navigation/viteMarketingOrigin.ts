import { normalizeAppBase } from "src/lib/navigation/crossApp";

/**
 * Base URL for the Next marketing app when running the Vite panel.
 * Used for logout, "back to site", and `/` fallback redirect.
 */
export function resolvedViteMarketingOrigin(): string {
  const env = (typeof process !== "undefined" ? process.env : {}) as Record<string, string | undefined>;
  const raw = (env.NEXT_PUBLIC_MARKETING_ORIGIN ?? env.VITE_MARKETING_ORIGIN)?.trim();
  if (raw) return normalizeAppBase(raw);
  if (env.NODE_ENV === "development") return "http://localhost:3000";
  return "";
}
