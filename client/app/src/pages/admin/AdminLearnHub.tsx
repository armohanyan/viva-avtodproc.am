import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardList, Package, UsersRound } from "lucide-react";
import AdminLayout from "src/components/AdminLayout";
import PanelPageHeader from "src/components/PanelPageHeader";
import { Card } from "src/components/ui/card";
import { Button } from "src/components/ui/button";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { useAccount } from "src/modules/accounts";

type LearnHubStats = {
  groupsTotal: number;
  groupsActive: number;
  packagesTotal: number;
  packagesActive: number;
  questionsTotal: number;
};

const initialStats: LearnHubStats = {
  groupsTotal: 0,
  groupsActive: 0,
  packagesTotal: 0,
  packagesActive: 0,
  questionsTotal: 0,
};

/** Hub route: navigation lives in the sidebar under Learn (collapsible). */
export default function AdminLearnHub() {
  const { t } = useLang();
  const { showToast } = useToast();
  const { user } = useAccount();
  const canManageGroups = user?.accountType === "super_admin";
  const [stats, setStats] = useState<LearnHubStats>(initialStats);

  const loadStats = useCallback(async () => {
    try {
      const [cohorts, packages, questions] = await Promise.all([
        canManageGroups ? vivaApiJson<Array<{ status?: string }>>("/theory-cohorts") : Promise.resolve([]),
        vivaApiJson<Array<{ status?: string }>>("/packages"),
        vivaApiJson<Array<{ id: string }>>("/exam-questions"),
      ]);
      const cohortsList = Array.isArray(cohorts) ? cohorts : [];
      const packageList = Array.isArray(packages) ? packages : [];
      const questionsList = Array.isArray(questions) ? questions : [];
      setStats({
        groupsTotal: cohortsList.length,
        groupsActive: cohortsList.filter((x) => x.status === "active" || x.status === "upcoming").length,
        packagesTotal: packageList.length,
        packagesActive: packageList.filter((x) => x.status === "active").length,
        questionsTotal: questionsList.length,
      });
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    }
  }, [canManageGroups, showToast]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const cards = useMemo(() => {
    const all = [
      {
        key: "groups",
        icon: UsersRound,
        title: t("adminSidebarGroups"),
        value: stats.groupsTotal,
        note: `${t("active")}: ${stats.groupsActive}`,
        href: "/admin/learn/groups",
        superAdminOnly: true as const,
      },
      {
        key: "packages",
        icon: Package,
        title: t("packages"),
        value: stats.packagesTotal,
        note: `${t("active")}: ${stats.packagesActive}`,
        href: "/admin/learn/packages",
      },
      {
        key: "questions",
        icon: ClipboardList,
        title: t("adminExamQuestionsTitle"),
        value: stats.questionsTotal,
        note: t("adminLearnOpenExamTests"),
        href: "/admin/learn/exam-questions",
      },
    ];
    return canManageGroups ? all : all.filter((c) => !("superAdminOnly" in c));
  }, [
    canManageGroups,
    stats.groupsActive,
    stats.groupsTotal,
    stats.packagesActive,
    stats.packagesTotal,
    stats.questionsTotal,
    t,
  ]);

  return (
    <AdminLayout>
      <PanelPageHeader
        icon={ClipboardList}
        title={t("adminSidebarLearn")}
        subtitle="KPI"
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.key} className="p-5 border-border">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">{card.title}</p>
                <p className="mt-1 text-3xl font-bold text-foreground">{card.value}</p>
                <p className="mt-2 text-xs text-muted-foreground">{card.note}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <card.icon className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="mt-4">
              <Button asChild variant="outline" size="sm">
                <a href={card.href}>{t("viewAll")}</a>
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </AdminLayout>
  );
}
