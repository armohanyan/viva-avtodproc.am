import { useState } from "react";
import { AppModal } from "src/components/AppModal";
import { Button } from "src/components/ui/button";
import { useLang } from "src/lib/i18n";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { useToast } from "src/lib/toast";
import type { Instructor } from "src/data/instructors";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instructor: Instructor | null;
  branchId: string;
  selectedThemes: readonly string[];
  onSubmitted: () => void;
};

export function TheoryPersonalRequestModal({
  open,
  onOpenChange,
  instructor,
  branchId,
  selectedThemes,
  onSubmitted,
}: Props) {
  const { t } = useLang();
  const { showToast } = useToast();
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setNote("");
      setSubmitted(false);
    }
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    if (!instructor || !branchId) return;
    setSubmitting(true);
    try {
      await vivaApiJson("/personal-theory-lesson-requests", {
        method: "POST",
        body: {
          instructorId: Number(instructor.id),
          branchId: Number(branchId),
          note: note.trim() || null,
          selectedThemes: selectedThemes.length > 0 ? [...selectedThemes] : undefined,
        },
      });
      setSubmitted(true);
      showToast(t("theoryPersonalRequestSuccessToast"), "success");
      onSubmitted();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppModal
      open={open}
      onOpenChange={handleOpenChange}
      title={submitted ? t("theoryPersonalRequestModalSuccessTitle") : t("theoryPersonalRequestModalTitle")}
      description={
        submitted
          ? undefined
          : instructor
            ? t("theoryPersonalRequestModalHint").replace("{name}", instructor.name)
            : undefined
      }
      contentClassName="sm:max-w-md"
      footer={
        submitted ? (
          <div className="flex justify-end px-6 pb-6">
            <Button type="button" onClick={() => handleOpenChange(false)}>
              {t("cancel")}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col-reverse gap-2 px-6 pb-6 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
              {t("cancel")}
            </Button>
            <Button type="button" onClick={() => void handleSubmit()} disabled={submitting || !instructor}>
              {submitting ? t("loading") : t("theoryPersonalSendRequest")}
            </Button>
          </div>
        )
      }
    >
      {submitted ? (
        <p className="text-sm text-muted-foreground leading-relaxed">{t("theoryPersonalRequestSuccessBody")}</p>
      ) : (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-muted-foreground" htmlFor="theory-personal-request-note">
            {t("theoryPersonalRequestNoteLabel")}
          </label>
          <textarea
            id="theory-personal-request-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            maxLength={4000}
            placeholder={t("theoryPersonalRequestNotePlaceholder")}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground resize-y min-h-[6rem]"
            disabled={submitting}
          />
        </div>
      )}
    </AppModal>
  );
}
