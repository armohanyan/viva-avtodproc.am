import type { DirectorOptionCategory } from "./director.types";

export const DIRECTOR_NAV_LINKS = [
  { href: "/admin/director", label: "Գլխավոր" },
  { href: "/admin/director/cash", label: "Կասսա" },
  { href: "/admin/director/expenses", label: "Ծախսեր" },
  { href: "/admin/director/repair", label: "Վերանորոգում" },
  { href: "/admin/director/fuel-km", label: "Վառելիք / ԿՄ" },
  { href: "/admin/director/instructor-hours", label: "Հրահանգիչների ժամեր" },
  { href: "/admin/director/driver-profile", label: "Վարորդի պրոֆիլ" },
  { href: "/admin/director/salary", label: "Աշխատավարձ" },
] as const;

export const DIRECTOR_PAYMENT_LABELS: Record<"card" | "cash", string> = {
  card: "Քարտ",
  cash: "Կանխիկ",
};

export const DIRECTOR_OPTION_CATEGORY: Record<string, DirectorOptionCategory> = {
  expType: "exp_type",
  salRole: "sal_role",
  cashType: "cash_type",
  fuelType: "fuel_type",
};

export function todayIso(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function directorDateQuery(start: string, end: string): string {
  return `startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}`;
}

export function isDirectorRoute(path: string): boolean {
  return path === "/admin/director" || path.startsWith("/admin/director/");
}
