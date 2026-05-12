import type { PublicNavigationLink } from "./public.types";

export const PUBLIC_NAV_LINKS: readonly PublicNavigationLink[] = [
  { href: "/", translationKey: "home" },
  { href: "/about", translationKey: "about" },
  { href: "/services", translationKey: "services" },
  { href: "/thematic-questions", translationKey: "examTests" },
  { href: "/packages", translationKey: "packages" },
  /** Public directory: first segment `instructors` — not the instructor panel (`instructor`). See `src/lib/navigation/appShell.ts`. */
  { href: "/instructors", translationKey: "instructors" },
  { href: "/blogs", translationKey: "blogs" },
  { href: "/contact", translationKey: "contact" },
];
