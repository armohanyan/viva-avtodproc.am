import InstructorPanelLayout from "src/components/InstructorPanelLayout";
import NotificationsListPage from "src/components/NotificationsListPage";
import { useLang } from "src/lib/i18n";

export default function InstructorNotifications() {
  const { t } = useLang();
  return (
    <InstructorPanelLayout>
      <NotificationsListPage title={t("notifications")} subtitle={t("instructorPanelBadge")} panel="instructor" />
    </InstructorPanelLayout>
  );
}
