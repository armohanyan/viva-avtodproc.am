import LessonProgressBar from "src/components/LessonProgressBar";
import { useLang } from "src/lib/i18n";
import { formatShortDateFromIso } from "src/lib/adminFormat";
import { useStudentProgress, type ProgressLessonSnapshot } from "src/modules/dashboard/useStudentProgress";

function formatLessonWhen(snapshot: ProgressLessonSnapshot, lang: string): string {
  const date = formatShortDateFromIso(snapshot.dateIso, lang);
  const end = snapshot.endTime ? `–${snapshot.endTime}` : "";
  return `${date} · ${snapshot.time}${end}`;
}

export default function AdminStudentProgressBlock({ studentUserId }: { studentUserId: number }) {
  const { t, lang } = useLang();
  const { progress, loading, error } = useStudentProgress({ studentUserId });

  if (loading) {
    return <p className="text-sm text-muted-foreground py-2">{t("adminStudentProgressLoading")}</p>;
  }
  if (error) {
    return <p className="text-sm text-destructive py-2">{error}</p>;
  }
  if (!progress) {
    return null;
  }

  const o = progress.overall;

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-4">
      <h3 className="text-sm font-semibold text-foreground">{t("adminStudentProgressHeading")}</h3>
      {o.totalLessons > 0 ? (
        <LessonProgressBar
          label={t("dashboardProgressAllLessons")}
          completed={o.completedLessons}
          total={o.totalLessons}
          percent={o.progressPercent}
          remainingLabel={`${o.remainingLessons} ${t("dashboardProgressRemainingCount")}`}
          upcomingLabel={
            o.upcomingLessons > 0 ? `${o.upcomingLessons} ${t("dashboardProgressUpcomingCount")}` : undefined
          }
        />
      ) : (
        <p className="text-sm text-muted-foreground">{t("dashboardProgressOverallEmpty")}</p>
      )}
      <div className="space-y-3">
        <LessonProgressBar
          label={t("dashboardProgressPracticalHeading")}
          completed={progress.practical.completed}
          total={progress.practical.total}
          percent={progress.practical.progressPercent}
        />
        <LessonProgressBar
          label={t("dashboardProgressPersonalTheoryHeading")}
          completed={progress.personalTheory.completed}
          total={progress.personalTheory.total}
          percent={progress.personalTheory.progressPercent}
        />
        <LessonProgressBar
          label={t("dashboardProgressGroupTheoryHeading")}
          completed={progress.groupTheory.completed}
          total={progress.groupTheory.total}
          percent={progress.groupTheory.progressPercent}
        />
      </div>
      {(progress.lastCompletedLesson || progress.nextUpcomingLesson) && (
        <dl className="grid gap-2 text-xs sm:grid-cols-2 border-t border-border/80 pt-3">
          {progress.lastCompletedLesson ? (
            <div>
              <dt className="text-muted-foreground">{t("dashboardProgressLastCompleted")}</dt>
              <dd className="text-foreground font-medium">{progress.lastCompletedLesson.label}</dd>
              <dd className="text-muted-foreground tabular-nums">
                {formatLessonWhen(progress.lastCompletedLesson, lang)}
              </dd>
            </div>
          ) : null}
          {progress.nextUpcomingLesson ? (
            <div>
              <dt className="text-muted-foreground">{t("dashboardProgressNextUpcoming")}</dt>
              <dd className="text-foreground font-medium">{progress.nextUpcomingLesson.label}</dd>
              <dd className="text-muted-foreground tabular-nums">
                {formatLessonWhen(progress.nextUpcomingLesson, lang)}
              </dd>
            </div>
          ) : null}
        </dl>
      )}
    </div>
  );
}
