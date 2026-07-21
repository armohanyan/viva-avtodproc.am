/** Production marketing origin — used when `NEXT_PUBLIC_SITE_URL` is unset (canonicals, sitemap, OG). */
const PRODUCTION_SITE_URL = "https://viva-avtodproc.am";

export function siteUrl(): URL {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || PRODUCTION_SITE_URL;
  try {
    const url = new URL(raw);
    // Guard against shipping localhost canonicals/sitemaps if env is mis-set in production builds.
    if (
      process.env.NODE_ENV === "production" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1")
    ) {
      return new URL(PRODUCTION_SITE_URL);
    }
    return url;
  } catch {
    return new URL(PRODUCTION_SITE_URL);
  }
}

/** Resolve a path or absolute URL against the marketing site origin. */
export function absoluteUrl(pathOrUrl: string): string {
  try {
    return new URL(pathOrUrl, siteUrl()).toString();
  } catch {
    return siteUrl().origin;
  }
}
