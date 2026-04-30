import AdminLayout from "src/components/AdminLayout";
import NotificationsListPage from "src/components/NotificationsListPage";
import { useLang } from "src/lib/i18n";

export default function AdminNotifications() {
  const { t } = useLang();

  return (
    <AdminLayout>
      <NotificationsListPage title={t("notifications")} subtitle={t("adminSidebarRoleBadge")} panel="admin" />
    </AdminLayout>
  );
}
