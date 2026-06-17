import { useEffect, useState } from "react";
import { Link } from "wouter";
import DashboardLayout from "src/components/DashboardLayout";
import DashboardLearnSubnav from "src/components/dashboard/DashboardLearnSubnav";
import PanelPageHeader from "src/components/PanelPageHeader";
import { Card } from "src/components/ui/card";
import { useLang } from "src/lib/i18n";
import { getQuestionInLang, type ExamQuestion } from "src/data/examSampleQuestions";
import { loadMySavedQuestions } from "src/lib/examQuestionEngagement";
import { getApiErrorMessage } from "src/lib/vivaApi";

export default function DashboardSavedQuestions() {
  const { t, lang } = useLang();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ExamQuestion[]>([]);

  useEffect(() => {
    let mounted = true;
    void loadMySavedQuestions()
      .then((data) => {
        if (!mounted) return;
        setRows(data);
      })
      .catch((e: unknown) => {
        if (!mounted) return;
        setError(getApiErrorMessage(e));
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto">
        <PanelPageHeader className="mb-4 sm:mb-6" title={t("questionSavedListTitle")} subtitle={t("questionSavedListSubtitle")} />
        <DashboardLearnSubnav active="saved" />
        {loading ? <p className="text-sm text-muted-foreground">{t("questionSavedListLoading")}</p> : null}
        {error ? <p className="text-sm text-rose-500">{error}</p> : null}
        {!loading && !error && rows.length === 0 ? (
          <Card className="p-5">
            <p className="text-sm text-muted-foreground">{t("questionSavedListEmpty")}</p>
          </Card>
        ) : null}
        <div className="space-y-3">
          {rows.map((q) => {
            const loc = getQuestionInLang(q, lang);
            const href =
              q.category === "signs"
                ? `/dashboard/learn/road-signs/question/${q.id}`
                : `/dashboard/learn/thematic-tests/question/${q.id}`;
            return (
              <Link key={q.id} href={href}>
                <Card className="p-4 hover:bg-muted/30 transition-colors">
                  <p className="text-sm font-medium text-foreground">{loc.text}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {q.category === "signs" ? t("dashboardLearnRoadSigns") : t("dashboardLearnThematicTests")}
                  </p>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
