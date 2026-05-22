export const ADMIN_BOOKINGS_TABS = ["all", "debts"] as const;

export type AdminBookingsTab = (typeof ADMIN_BOOKINGS_TABS)[number];

export function bookingsTabFromPath(path: string): AdminBookingsTab {
  const normalized = path.replace(/\/$/, "");
  if (normalized.endsWith("/admin/bookings/debts")) return "debts";
  return "all";
}

export function bookingsPathForTab(tab: AdminBookingsTab): string {
  if (tab === "debts") return "/admin/bookings/debts";
  return "/admin/bookings";
}

export function isAdminBookingsPath(path: string): boolean {
  const normalized = path.replace(/\/$/, "") || "/";
  return normalized === "/admin/bookings" || normalized.endsWith("/admin/bookings/debts");
}
