export type DirectorNavChild = {
  href: string;
  label: string;
};

export type DirectorNavLink = {
  href: string;
  label: string;
  children?: DirectorNavChild[];
};

export const DIRECTOR_NAV_LINKS: DirectorNavLink[] = [
  { href: "/admin/director", label: "Գլխավոր" },
  {
    href: "/admin/director/cash",
    label: "Կասսա",
    children: [
      { href: "/admin/director/cash", label: "Հաշվետվություն" },
      { href: "/admin/director/cash/records", label: "Տվյալներ" },
    ],
  },
  {
    href: "/admin/director/expenses",
    label: "Ծախսեր",
    children: [
      { href: "/admin/director/expenses", label: "Հաշվետվություն" },
      { href: "/admin/director/expenses/records", label: "Տվյալներ" },
    ],
  },
  {
    href: "/admin/director/repair",
    label: "Վերանորոգում",
    children: [
      { href: "/admin/director/repair", label: "Հաշվետվություն" },
      { href: "/admin/director/repair/records", label: "Տվյալներ" },
    ],
  },
  {
    href: "/admin/director/fuel",
    label: "Վառելիք",
    children: [
      { href: "/admin/director/fuel", label: "Հաշվետվություն" },
      { href: "/admin/director/fuel/records", label: "Տվյալներ" },
    ],
  },
  {
    href: "/admin/director/km",
    label: "Կիլոմետրեր",
    children: [
      { href: "/admin/director/km", label: "Հաշվետվություն" },
      { href: "/admin/director/km/records", label: "Տվյալներ" },
    ],
  },
  {
    href: "/admin/director/instructor-hours",
    label: "Հրահանգիչների դասեր",
    children: [
      { href: "/admin/director/instructor-hours", label: "Հաշվետվություն" },
      { href: "/admin/director/instructor-hours/records", label: "Տվյալներ" },
    ],
  },
  {
    href: "/admin/director/driver-profile",
    label: "Վարորդի պրոֆիլ",
    children: [
      { href: "/admin/director/driver-profile", label: "Հաշվետվություն" },
      { href: "/admin/director/driver-profile/records", label: "Օրական ցանկ" },
    ],
  },
  {
    href: "/admin/director/salary",
    label: "Աշխատավարձ",
    children: [
      { href: "/admin/director/salary", label: "Հաշվետվություն" },
      { href: "/admin/director/salary/records", label: "Տվյալներ" },
    ],
  },
];

export function directorNavLabel(path: string): string {
  for (const link of DIRECTOR_NAV_LINKS) {
    if (link.href === path) return link.label;
    for (const child of link.children ?? []) {
      if (child.href === path) return `${link.label} · ${child.label}`;
    }
  }
  return "Տնօրենի միջավայր";
}

export function directorNavSectionBase(path: string): string | null {
  for (const link of DIRECTOR_NAV_LINKS) {
    if (path === link.href || path.startsWith(`${link.href}/`)) return link.href;
  }
  return null;
}

export const DIRECTOR_PAYMENT_LABELS: Record<"card" | "cash", string> = {
  card: "Քարտ",
  cash: "Կանխիկ",
};

export const DIRECTOR_OPTION_CATEGORY: Record<string, import("./director.types").DirectorOptionCategory> = {
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

/** Default director list range: first day of current month through today. */
export function defaultDirectorStartDate(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${m}-01`;
}

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
