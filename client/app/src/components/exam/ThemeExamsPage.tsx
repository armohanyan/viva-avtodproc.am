import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { Shuffle } from "lucide-react";
import MultiSelectDropdown from "src/components/MultiSelectDropdown";
import PanelPageHeader from "src/components/PanelPageHeader";
import { Button } from "src/components/ui/button";
import { Card } from "src/components/ui/card";
import {
  THEMATIC_TOPIC_IDS,
  THEMATIC_TOPIC_TITLE_KEYS,
} from "src/data/thematicTopics";
import { defaultExamQuestionMeta, loadExamQuestionMeta, subscribeExamQuestionMetaUpdated } from "src/lib/examQuestionMeta";
import { useLang, type TranslationKey } from "src/lib/i18n";
import {
  buildThemeExamPacks,
  loadThemeExamSession,
  saveThemeExamSession,
  THEME_EXAM_QUESTIONS_PER_TEST,
  type ThemeExamSession,
} from "src/lib/themeExamPacks";
import { Reveal } from "src/lib/motion";

function isGenericTopicTitle(title: string): boolean {
  return /^(Թեմա|Тема|Theme)\s*\d+$/i.test(title.trim());
}

export type ThemeExamsPageProps = {
  /** Quiz URL for pack index, e.g. `/dashboard/learn/exam-tests/quiz/full?themeExam=` */
  quizHrefForPack: (packIndex: number) => string;
  /** Optional learn subnav (student only). */
  subnav?: ReactNode;
};

export default function ThemeExamsPage({ quizHrefForPack, subnav }: ThemeExamsPageProps) {
  const { t } = useLang();
  const [thematicCardTitles, setThematicCardTitles] = useState(() => defaultExamQuestionMeta().thematicCardTitles);
  const [thematicCardQuestionIds, setThematicCardQuestionIds] = useState(
    () => defaultExamQuestionMeta().thematicCardQuestionIds,
  );
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [session, setSession] = useState<ThemeExamSession | null>(() => loadThemeExamSession());

  useEffect(() => {
    let mounted = true;
    const sync = async () => {
      const meta = await loadExamQuestionMeta();
      if (!mounted) return;
      setThematicCardTitles(meta.thematicCardTitles);
      setThematicCardQuestionIds(meta.thematicCardQuestionIds);
    };
    void sync();
    const off = subscribeExamQuestionMetaUpdated(() => void sync());
    return () => {
      mounted = false;
      off();
    };
  }, []);

  const topicOptions = useMemo(
    () =>
      THEMATIC_TOPIC_IDS.map((_topicId, i) => {
        const slotId = String(i + 1);
        const titleFromMeta = thematicCardTitles[i]?.trim() ?? "";
        const fallbackTitle = t(THEMATIC_TOPIC_TITLE_KEYS[i] as TranslationKey);
        const title = !titleFromMeta || isGenericTopicTitle(titleFromMeta) ? fallbackTitle : titleFromMeta;
        const total = (thematicCardQuestionIds[i] ?? []).length;
        return {
          value: slotId,
          label: `${title} (${total})`,
          total,
        };
      }),
    [t, thematicCardQuestionIds, thematicCardTitles],
  );

  const idsBySlot = useMemo(() => {
    const map = new Map<string, readonly string[]>();
    for (let i = 0; i < THEMATIC_TOPIC_IDS.length; i += 1) {
      map.set(String(i + 1), thematicCardQuestionIds[i] ?? []);
    }
    return map;
  }, [thematicCardQuestionIds]);

  const preview = useMemo(() => {
    if (selectedSlots.length === 0) {
      return { poolSize: 0, examCount: 0, remainder: 0 };
    }
    const { poolSize, packs, remainder } = buildThemeExamPacks(idsBySlot, selectedSlots);
    return { poolSize, examCount: packs.length, remainder };
  }, [idsBySlot, selectedSlots]);

  const canGenerate = selectedSlots.length > 0 && preview.poolSize >= THEME_EXAM_QUESTIONS_PER_TEST;

  const handleGenerate = () => {
    if (!canGenerate) return;
    const { packs } = buildThemeExamPacks(idsBySlot, selectedSlots);
    if (packs.length === 0) return;
    const next: ThemeExamSession = {
      selectedTopicSlots: [...selectedSlots],
      packs,
      createdAt: Date.now(),
    };
    saveThemeExamSession(next);
    setSession(next);
  };

  const selectedTopicLabels = useMemo(() => {
    if (!session) return [];
    const bySlot = new Map(topicOptions.map((o) => [o.value, o.label]));
    return session.selectedTopicSlots.map((slot) => bySlot.get(slot) ?? slot);
  }, [session, topicOptions]);

  return (
    <div className="max-w-5xl mx-auto">
      <PanelPageHeader
        className="mb-4 sm:mb-6"
        title={t("themeExamsTitle")}
        subtitle={t("themeExamsSubtitle")}
      />

      {subnav}

      <Card className="rounded-xl border border-border p-4 sm:p-5 mb-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">{t("themeExamsSelectThemes")}</label>
          <MultiSelectDropdown
            options={topicOptions.map(({ value, label }) => ({ value, label }))}
            value={selectedSlots}
            onChange={setSelectedSlots}
            placeholder={t("themeExamsSelectPlaceholder")}
            ariaLabel={t("themeExamsSelectThemes")}
            maxVisibleLabels={2}
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-sm text-muted-foreground space-y-1">
            {selectedSlots.length === 0 ? (
              <p>{t("themeExamsHintSelect")}</p>
            ) : (
              <>
                <p>
                  {t("themeExamsPoolSummary")
                    .replace("{count}", String(preview.poolSize))
                    .replace("{exams}", String(preview.examCount))
                    .replace("{size}", String(THEME_EXAM_QUESTIONS_PER_TEST))}
                </p>
                {preview.poolSize > 0 && preview.poolSize < THEME_EXAM_QUESTIONS_PER_TEST ? (
                  <p className="text-amber-700 dark:text-amber-400">{t("themeExamsNeedMore")}</p>
                ) : null}
                {preview.remainder > 0 && preview.examCount > 0 ? (
                  <p>
                    {t("themeExamsRemainder")
                      .replace("{remainder}", String(preview.remainder))
                      .replace("{size}", String(THEME_EXAM_QUESTIONS_PER_TEST))}
                  </p>
                ) : null}
              </>
            )}
          </div>
          <Button type="button" onClick={handleGenerate} disabled={!canGenerate} className="shrink-0 gap-2">
            <Shuffle className="w-4 h-4" />
            {t("themeExamsGenerate")}
          </Button>
        </div>
      </Card>

      {session && session.packs.length > 0 ? (
        <>
          <div className="mb-3 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
            <div>
              <h2 className="text-xl font-bold text-foreground">{t("themeExamsGeneratedHeading")}</h2>
              {selectedTopicLabels.length > 0 ? (
                <p className="text-sm text-muted-foreground mt-1">
                  {t("themeExamsFromThemes")}: {selectedTopicLabels.map((l) => l.replace(/\s*\(\d+\)$/, "")).join(", ")}
                </p>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              {session.packs.length} × {THEME_EXAM_QUESTIONS_PER_TEST} {t("instructorQuestionsCountLabel")}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {session.packs.map((pack, i) => {
              const href = quizHrefForPack(i);
              return (
                <Reveal key={`${session.createdAt}-${i}`} delay={Math.min(i, 12) * 0.03}>
                  <Card className="rounded-xl sm:rounded-2xl border border-neutral-200/90 dark:border-border bg-card shadow-none transition-colors hover:bg-muted/30">
                    <Link href={href} className="flex items-center justify-between gap-4 px-4 py-3.5 sm:px-5 sm:py-4">
                      <p className="text-sm sm:text-[15px] font-medium text-neutral-800 dark:text-foreground leading-snug min-w-0">
                        {t("examTestsNumberedTitle")} {i + 1}
                      </p>
                      <p className="text-sm text-muted-foreground tabular-nums shrink-0">
                        {pack.length} {t("instructorQuestionsCountLabel")}
                      </p>
                    </Link>
                  </Card>
                </Reveal>
              );
            })}
          </div>
        </>
      ) : (
        <Card className="rounded-xl border border-dashed border-border p-6 text-center">
          <p className="text-sm text-muted-foreground">{t("themeExamsEmpty")}</p>
        </Card>
      )}
    </div>
  );
}
