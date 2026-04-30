import { Bell, CheckCheck, Trash2 } from "lucide-react";
import { Link } from "wouter";
import PanelPageHeader from "src/components/PanelPageHeader";
import { Card } from "src/components/ui/card";
import { Button } from "src/components/ui/button";
import { Badge } from "src/components/ui/badge";
import AdminTableScroll from "src/components/AdminTableScroll";
import { useNotifications } from "src/modules/notifications/useNotifications";
import { useLang } from "src/lib/i18n";
import { notificationTargetHref, type NotificationPanel } from "src/modules/notifications/notificationLinks";

type Props = {
  title: string;
  subtitle?: string;
  panel: NotificationPanel;
};

export default function NotificationsListPage({ title, subtitle, panel }: Props) {
  const { t, lang } = useLang();
  const { items, unread, loading, markRead, markAllRead, remove } = useNotifications(20);
  const locale = lang === "am" ? "hy-AM" : lang === "ru" ? "ru-RU" : "en-US";

  return (
    <>
      <PanelPageHeader
        icon={Bell}
        title={title}
        subtitle={subtitle}
        actions={
          <Button type="button" variant="outline" size="sm" onClick={() => void markAllRead()}>
            <CheckCheck className="w-4 h-4 mr-1.5" />
            {t("markAllRead")}
          </Button>
        }
      />
      <div className="mb-4">
        <Card className="p-4 border-border inline-flex items-center gap-4">
          <div>
            <p className="text-xs text-muted-foreground">{t("notifications")}</p>
            <p className="text-2xl font-bold">{unread}</p>
          </div>
          <Badge className="bg-primary/10 text-primary">{t("unread")}</Badge>
        </Card>
      </div>

      <Card className="border-border overflow-hidden">
        <AdminTableScroll>
          <table className="w-full text-sm min-w-[48rem]">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("notifications")}</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("status")}</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t("date")}</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">{t("loading")}</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">{t("tableNoMatches")}</td>
                </tr>
              ) : (
                items.map((n) => (
                  <tr key={n.id} className={!n.isRead ? "bg-primary/5" : ""}>
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-foreground">{n.title}</p>
                      <p className="text-xs text-muted-foreground">{n.message}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge className={n.isRead ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}>
                        {n.isRead ? t("read") : t("unread")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">
                      {new Date(n.createdAt).toLocaleString(locale, { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex justify-end gap-2">
                        {!n.isRead ? (
                          <Button size="sm" variant="outline" onClick={() => void markRead(n.id)}>
                            {t("markRead")}
                          </Button>
                        ) : null}
                        <Button size="sm" variant="outline" asChild>
                          <Link href={notificationTargetHref(panel, n)}>{t("viewAll")}</Link>
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => void remove(n.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </AdminTableScroll>
      </Card>
    </>
  );
}
