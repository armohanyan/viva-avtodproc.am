import { useEffect, useState } from "react";
import { Link } from "wouter";
import DashboardLayout from "src/components/DashboardLayout";
import DashboardLearnSubnav from "src/components/dashboard/DashboardLearnSubnav";
import PanelPageHeader from "src/components/PanelPageHeader";
import { Card } from "src/components/ui/card";
import { SIGN_CATEGORY_SLUGS } from "src/data/signCategories";
import { THEMATIC_TOPIC_IDS, THEMATIC_TOPIC_TITLE_KEYS } from "src/data/thematicTopics";
import { useLang, type TranslationKey } from "src/lib/i18n";
import { getQuestionInLang, type ExamQuestion } from "src/data/examSampleQuestions";
import { defaultExamQuestionMeta, loadExamQuestionMeta, type ExamQuestionMeta } from "src/lib/examQuestionMeta";
import { loadMySavedQuestions } from "src/lib/examQuestionEngagement";
import { getApiErrorMessage } from "src/lib/vivaApi";

function isGenericThemeTitle(title: string): boolean {
  return /^(Թեմա|Тема|Theme|Նշաններ|Знаки|Signs)\s*\d+$/i.test(title.trim());
}

function themeTitleForQuestion(
  question: ExamQuestion,
  meta: ExamQuestionMeta,
  t: (key: TranslationKey) => string,
): string | null {
  const topicId = question.topicId?.trim() ?? "";
  if (!topicId) return null;

  if (question.category === "signs") {
    const slot = Number.parseInt(topicId, 10);
    const slotIndex =
      Number.isInteger(slot) && slot >= 1 && slot <= SIGN_CATEGORY_SLUGS.length ? slot - 1 : -1;
    const slugIndex = SIGN_CATEGORY_SLUGS.findIndex((slug) => slug === topicId);
    const index = slotIndex >= 0 ? slotIndex : slugIndex;
    if (index < 0) return null;
    const fromMeta = meta.signsCardTitles[index]?.trim() ?? "";
    return fromMeta || null;
  }

  const index = (THEMATIC_TOPIC_IDS as readonly string[]).indexOf(topicId);
  if (index < 0) return null;
  const fromMeta = meta.thematicCardTitles[index]?.trim() ?? "";
  const fallback = t(THEMATIC_TOPIC_TITLE_KEYS[index] as TranslationKey);
  if (!fromMeta || isGenericThemeTitle(fromMeta)) return fallback || null;
  return fromMeta;
}

export default function DashboardSavedQuestions() {
  const { t, lang } = useLang();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ExamQuestion[]>([]);
  const [meta, setMeta] = useState<ExamQuestionMeta>(() => defaultExamQuestionMeta());

  useEffect(() => {
    let mounted = true;
    void loadExamQuestionMeta()
      .then((next) => {
        if (mounted) setMeta(next);
      })
      .catch(() => {
        /* theme titles fall back to defaults */
      });
    return () => {
      mounted = false;
    };
  }, []);

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
        <PanelPageHeader className="mb-4 sm:mb-6" title={t("questionSavedListTitle")} />
        <DashboardLearnSubnav active="saved" />
        {loading ? <p className="text-sm text-muted-foreground">{t("questionSavedListLoading")}</p> : null}
        {error ? <p className="text-sm text-rose-500">{error}</p> : null}
        {!loading && !error && rows.length === 0 ? (
          <Card className="p-5">
            <p className="text-sm text-muted-foreground">{t("questionSavedListEmpty")}</p>
          </Card>
        ) : null}
        <div className="flex flex-col gap-4">
          {rows.map((q) => {
            const loc = getQuestionInLang(q, lang);
            const themeTitle = themeTitleForQuestion(q, meta, t);
            const href =
              q.category === "signs"
                ? `/dashboard/learn/road-signs/question/${q.id}`
                : `/dashboard/learn/thematic-tests/question/${q.id}`;
            return (
              <Link key={q.id} href={href} className="block">
                <Card className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start gap-4">
                    {q.imageUrl ? (
                      <img
                        src={q.imageUrl}
                        alt=""
                        className="size-16 shrink-0 rounded-md border border-border bg-white object-contain sm:size-20"
                      />
                    ) : null}
                    <div className="min-w-0">
                      {themeTitle ? (
                        <p className="text-xs font-medium text-primary mb-1">{themeTitle}</p>
                      ) : null}
                      <p className="text-sm font-medium text-foreground">{loc.text}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {q.category === "signs" ? t("dashboardLearnRoadSigns") : t("dashboardLearnThematicTests")}
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
