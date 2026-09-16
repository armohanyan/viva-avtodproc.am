export type DirectorNavLink = {
  href: string;
  label: string;
};

/** Sidebar order for director room (in-page tabs stay on each section page). */
export const DIRECTOR_NAV_LINKS: DirectorNavLink[] = [
  { href: "/admin/director/cash", label: "Կասսա" },
  { href: "/admin/director/expenses", label: "Ծախսեր" },
  { href: "/admin/director/driver-profile", label: "Վարորդի պրոֆիլ" },
  { href: "/admin/director/fuel", label: "Վառելիք" },
  { href: "/admin/director/km", label: "Կիլոմետրեր" },
  { href: "/admin/director/salary", label: "Աշխատավարձ" },
  { href: "/admin/director/repair", label: "Վերանորոգում" },
  { href: "/admin/director/students", label: "Ուսանողներ" },
];

function directorNavMatch(path: string): DirectorNavLink | null {
  // Longest href first so shorter prefixes do not swallow nested routes
  const sorted = [...DIRECTOR_NAV_LINKS].sort((a, b) => b.href.length - a.href.length);
  for (const link of sorted) {
    if (path === link.href || path.startsWith(`${link.href}/`)) return link;
  }
  return null;
}

export function directorNavLabel(path: string): string {
  return directorNavMatch(path)?.label ?? "Տնօրենի միջավայր";
}

export function directorNavSectionBase(path: string): string | null {
  return directorNavMatch(path)?.href ?? null;
}

export function isDirectorNavActive(path: string, href: string): boolean {
  return path === href || path.startsWith(`${href}/`);
}

export const DIRECTOR_PAYMENT_LABELS: Record<"card" | "cash", string> = {
  card: "Քարտ",
  cash: "Կանխիկ",
};

export const DIRECTOR_CASH_DIRECTION_LABELS: Record<"in" | "out", string> = {
  in: "Մուտք",
  out: "Ելք",
};

export const DIRECTOR_CASH_SOURCE_LABELS: Record<
  "manual" | "finance" | "expense" | "fuel" | "repair",
  string
> = {
  manual: "Ձեռքով",
  finance: "Վճարում",
  expense: "Ծախս",
  fuel: "Վառելիք",
  repair: "Վերանորոգում",
};

export const DIRECTOR_OPTION_CATEGORY: Record<string, import("./director.types").DirectorOptionCategory> = {
  expType: "exp_type",
  salRole: "sal_role",
  fuelType: "fuel_type",
};

export function todayIso(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Default director list range: first day of current month through today. */
export function defaultDirectorStartDate(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${m}-01`;
}

export { halfMonthPeriod as defaultDirectorSalaryPeriod } from "src/utils/halfMonthPeriod.utils";

export function isLegacyDirectorRecord(id: number): boolean {
  return id < 0;
}

export function directorDateQuery(start: string, end: string, branchId?: string | null): string {
  const params = new URLSearchParams({
    startDate: start,
    endDate: end,
  });
  if (branchId) params.set("branchId", branchId);
  return params.toString();
}

export function isDirectorRoute(path: string): boolean {
  return path === "/admin/director" || path.startsWith("/admin/director/");
}
