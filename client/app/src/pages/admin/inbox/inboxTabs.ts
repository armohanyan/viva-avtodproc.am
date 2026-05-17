export const ADMIN_INBOX_TABS = ["theory-personal", "booked-calls", "contact-requests"] as const;

export type AdminInboxTab = (typeof ADMIN_INBOX_TABS)[number];

export function inboxTabFromPath(path: string): AdminInboxTab {
  const segment = path.replace(/^\/admin\/inbox\/?/, "").split("/")[0];
  if (segment === "booked-calls") return "booked-calls";
  if (segment === "contact-requests") return "contact-requests";
  return "theory-personal";
}

export function inboxPathForTab(tab: AdminInboxTab): string {
  if (tab === "theory-personal") return "/admin/inbox/theory-personal";
  return `/admin/inbox/${tab}`;
}
