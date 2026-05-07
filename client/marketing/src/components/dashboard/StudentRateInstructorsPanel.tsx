import { Star } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "src/components/ui/button";
import { Card } from "src/components/ui/card";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";

export type InstructorRatingStatus = {
  pending: { instructorUserId: string; instructorName: string; lastCompletedDateIso: string }[];
  myRatings: { instructorUserId: string; instructorName: string; stars: number }[];
};

type Props = { studentUserId: string | undefined };

function StarPicker({
  value,
  onChange,
  disabled,
  ariaLabel,
}: {
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  return (
    <div className="flex items-center gap-0.5" role="group" aria-label={ariaLabel}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onChange(n)}
          className="p-1 rounded-md hover:bg-muted/60 disabled:opacity-50 transition-colors"
          aria-label={`${ariaLabel} ${n}`}
        >
          <Star
            className={`w-7 h-7 sm:w-8 sm:h-8 ${
              n <= value ? "text-primary fill-primary" : "text-muted-foreground fill-muted/30"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function StaticStars({ value, ariaLabel }: { value: number; ariaLabel: string }) {
  return (
    <div className="flex items-center gap-0.5" role="img" aria-label={`${ariaLabel}: ${value} / 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`w-6 h-6 sm:w-7 sm:h-7 ${
            n <= value ? "text-primary fill-primary" : "text-muted-foreground fill-muted/30"
          }`}
        />
      ))}
    </div>
  );
}

export default function StudentRateInstructorsPanel({ studentUserId }: Props) {
  const { t } = useLang();
  const { showToast } = useToast();
  const [status, setStatus] = useState<InstructorRatingStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [draftPending, setDraftPending] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    if (!studentUserId) {
      setStatus(null);
      return;
    }
    setLoading(true);
    try {
      const data = await vivaApiJson<InstructorRatingStatus>(
        `/students/${encodeURIComponent(studentUserId)}/instructor-ratings/status`,
      );
      setStatus({
        pending: Array.isArray(data?.pending) ? data.pending : [],
        myRatings: Array.isArray(data?.myRatings) ? data.myRatings : [],
      });
    } catch {
      setStatus({ pending: [], myRatings: [] });
    } finally {
      setLoading(false);
    }
  }, [studentUserId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!status) return;
    setDraftPending((prev) => {
      const next = { ...prev };
      for (const p of status.pending) {
        if (next[p.instructorUserId] === undefined) next[p.instructorUserId] = 5;
      }
      return next;
    });
  }, [status]);

  const submit = async (instructorUserId: string, stars: number) => {
    if (!studentUserId) return;
    setSubmitting(instructorUserId);
    try {
      await vivaApiJson(`/students/${encodeURIComponent(studentUserId)}/instructor-ratings`, {
        method: "POST",
        body: { instructorUserId, stars },
      });
      showToast(t("instructorRatingSavedToast"), "success");
      await load();
    } catch (e) {
      showToast(getApiErrorMessage(e) || t("fillRequired"), "error");
    } finally {
      setSubmitting(null);
    }
  };

  if (!studentUserId) return null;
  if (loading || !status) return null;

  const hasContent = status.pending.length > 0 || status.myRatings.length > 0;
  if (!hasContent) return null;

  return (
    <Card className="p-4 sm:p-5 border-border mb-6 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-foreground">{t("instructorRateYourInstructorTitle")}</h2>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{t("instructorRatePromptSub")}</p>
      </div>

      {status.pending.map((p) => {
        const stars = draftPending[p.instructorUserId] ?? 5;
        const busy = submitting === p.instructorUserId;
        return (
          <div key={p.instructorUserId} className="rounded-lg border border-border bg-muted/10 p-4 space-y-3">
            <div>
              <p className="text-sm font-semibold text-foreground">{p.instructorName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t("instructorRateLastLessonHint")}</p>
            </div>
            <StarPicker
              value={stars}
              onChange={(n) => setDraftPending((d) => ({ ...d, [p.instructorUserId]: n }))}
              disabled={busy}
              ariaLabel={t("instructorRateStarsAria")}
            />
            <Button
              type="button"
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={busy}
              onClick={() => void submit(p.instructorUserId, stars)}
            >
              {busy ? t("saving") : t("instructorRateSubmit")}
            </Button>
          </div>
        );
      })}

      {status.myRatings.length > 0 ? (
        <div className="space-y-3 pt-1 border-t border-border">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("instructorRateYouRated")}</p>
          {status.myRatings.map((m) => (
            <div
              key={m.instructorUserId}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-border/80 p-3"
            >
              <p className="text-sm font-medium text-foreground shrink-0">{m.instructorName}</p>
              <StaticStars value={m.stars} ariaLabel={t("instructorRateStarsAria")} />
            </div>
          ))}
          <p className="text-xs text-muted-foreground leading-relaxed">{t("instructorRateSubmittedLockedHint")}</p>
        </div>
      ) : null}
    </Card>
  );
}
