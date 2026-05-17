import { useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import AdminLayout from "src/components/AdminLayout";
import PanelPageHeader from "src/components/PanelPageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "src/components/ui/tabs";
import { useLang, type TranslationKey } from "src/lib/i18n";
import { absWouterHref } from "src/lib/wouterFullPath";
import { BookedCallsPanel } from "./inbox/BookedCallsPanel";
import { ContactRequestsPanel } from "./inbox/ContactRequestsPanel";
import { TheoryPersonalRequestsPanel } from "./inbox/TheoryPersonalRequestsPanel";
import { TabCountBadge } from "./inbox/TabCountBadge";
import { inboxPathForTab, inboxTabFromPath, type AdminInboxTab } from "./inbox/inboxTabs";
import { useInboxUnreadCounts } from "./inbox/useInboxUnreadCounts";
import { GraduationCap, Mail, PhoneCall, type LucideIcon } from "lucide-react";

export default function AdminInboxRequests(): JSX.Element {
  const { t } = useLang();
  const [location, setLocation] = useLocation();
  const { counts, refresh } = useInboxUnreadCounts();

  const activeTab = inboxTabFromPath(location);

  useEffect(() => {
    if (location === "/admin/inbox" || location === "/admin/inbox/") {
      setLocation(absWouterHref(inboxPathForTab("theory-personal")), { replace: true });
    }
  }, [location, setLocation]);

  const onTabChange = (value: string) => {
    setLocation(absWouterHref(inboxPathForTab(value as AdminInboxTab)));
  };

  const pageHeader = useMemo((): { icon: LucideIcon; titleKey: TranslationKey; subtitleKey: TranslationKey } => {
    if (activeTab === "booked-calls") {
      return {
        icon: PhoneCall,
        titleKey: "adminBookedCalls",
        subtitleKey: "adminInboxBookedCallsPageSubtitle",
      };
    }
    if (activeTab === "contact-requests") {
      return {
        icon: Mail,
        titleKey: "adminContactRequests",
        subtitleKey: "adminInboxContactRequestsPageSubtitle",
      };
    }
    return {
      icon: GraduationCap,
      titleKey: "adminTheoryPersonalRequests",
      subtitleKey: "adminInboxTheoryPersonalPageSubtitle",
    };
  }, [activeTab]);

  return (
    <AdminLayout>
      <PanelPageHeader
        icon={pageHeader.icon}
        title={t(pageHeader.titleKey)}
        subtitle={t(pageHeader.subtitleKey)}
      />

      <Tabs value={activeTab} onValueChange={onTabChange} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 w-full sm:w-auto">
          <TabsTrigger value="theory-personal" className="px-3">
            {t("adminTheoryPersonalRequests")}
            <TabCountBadge count={counts.theoryPersonal} />
          </TabsTrigger>
          <TabsTrigger value="booked-calls" className="px-3">
            {t("adminBookedCalls")}
            <TabCountBadge count={counts.bookedCalls} />
          </TabsTrigger>
          <TabsTrigger value="contact-requests" className="px-3">
            {t("adminContactRequests")}
            <TabCountBadge count={counts.contactRequests} />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="theory-personal" className="mt-0">
          <TheoryPersonalRequestsPanel onCountsChange={refresh} />
        </TabsContent>
        <TabsContent value="booked-calls" className="mt-0">
          <BookedCallsPanel onCountsChange={refresh} />
        </TabsContent>
        <TabsContent value="contact-requests" className="mt-0">
          <ContactRequestsPanel onCountsChange={refresh} />
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
