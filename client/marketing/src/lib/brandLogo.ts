import type { Lang } from "src/lib/i18n";
import type { Theme } from "src/lib/theme";

export type BrandLogoLayout = "horizontal" | "vertical" | "mark";

/** Which surface the logo sits on. `auto` follows the active color theme. */
export type BrandLogoTone = "auto" | "on-light" | "on-dark";

export type BrandLogoLocale = "en" | "am";

/** Russian UI uses the English wordmark assets. */
export function brandLogoLocale(lang: Lang): BrandLogoLocale {
  return lang === "am" ? "am" : "en";
}

export function resolveBrandLogoTone(tone: BrandLogoTone, theme: Theme): "on-light" | "on-dark" {
  if (tone === "auto") return theme === "dark" ? "on-dark" : "on-light";
  return tone;
}

export function brandLogoSrc(opts: {
  lang: Lang;
  theme: Theme;
  layout?: BrandLogoLayout;
  tone?: BrandLogoTone;
}): string {
  const locale = brandLogoLocale(opts.lang);
  const layout = opts.layout ?? "horizontal";
  const surface = resolveBrandLogoTone(opts.tone ?? "auto", opts.theme);
  return `/brand/${locale}/${layout}-${surface}.png`;
}

/** Static fallback for avatars, broken images, and non-React consumers. */
export const BRAND_LOGO_FALLBACK_SRC = "/brand/en/mark-on-light.png";
