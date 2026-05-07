import { Bell } from "lucide-react";
import { Link } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "src/components/ui/dropdown-menu";
import { Button } from "src/components/ui/button";
import { useNotifications } from "src/modules/notifications/useNotifications";
import { notificationTargetHref, type NotificationPanel } from "src/modules/notifications/notificationLinks";
import { localizedNotificationTitle } from "src/modules/notifications/notificationTitle";
import { useLang } from "src/lib/i18n";
import { cn } from "src/lib/utils";

type Props = {
  listHref: string;
  panel: NotificationPanel;
  onNavigate?: () => void;
};

export default function NotificationBell({ listHref, panel, onNavigate }: Props) {
  const { t, lang } = useLang();
  const { items, unread, markRead, markAllRead, loading } = useNotifications(8);
  const latest = items.slice(0, 6);
  const locale = lang === "am" ? "hy-AM" : lang === "ru" ? "ru-RU" : "en-US";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background hover:bg-muted"
          aria-label={t("notifications")}
        >
          <Bell className="h-4 w-4" />
          {unread > 0 ? (
            <span className="absolute -right-1 -top-1 min-w-4 h-4 rounded-full bg-destructive text-[10px] text-white px-1 flex items-center justify-center">
              {unread > 99 ? "99+" : unread}
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[22rem]">
        <DropdownMenuLabel className="flex items-center justify-between gap-2">
          <span>{t("notifications")}</span>
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => void markAllRead()}>
            {t("markAllRead")}
          </Button>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {loading ? (
          <div className="px-3 py-4 text-xs text-muted-foreground">{t("loading")}</div>
        ) : latest.length === 0 ? (
          <div className="px-3 py-4 text-xs text-muted-foreground">{t("tableNoMatches")}</div>
        ) : (
          latest.map((n) => (
            <DropdownMenuItem
              key={n.id}
              className={cn("flex flex-col items-start gap-0.5 py-2", !n.isRead && "bg-primary/5")}
              onClick={() => {
                if (!n.isRead) void markRead(n.id);
                onNavigate?.();
              }}
              asChild
            >
              <Link href={notificationTargetHref(panel, n)}>
                <span className={cn("text-xs font-medium", !n.isRead ? "text-foreground" : "text-muted-foreground")}>
                  {localizedNotificationTitle(n, t)}
                </span>
                <span className="text-xs text-muted-foreground line-clamp-2">{n.message}</span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(n.createdAt).toLocaleString(locale, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </Link>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild onClick={() => onNavigate?.()}>
          <Link href={listHref}>{t("viewAll")}</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
