import DashboardLayout from "src/components/DashboardLayout";
import NotificationsListPage from "src/components/NotificationsListPage";
import { useLang } from "src/lib/i18n";

export default function DashboardNotifications() {
  const { t } = useLang();
  return (
    <DashboardLayout>
      <NotificationsListPage title={t("notifications")} subtitle={t("dashboard")} panel="student" />
    </DashboardLayout>
  );
}
