"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { ExamQuestion } from "src/data/examSampleQuestions";
import { useLang } from "src/lib/i18n";
import { roadSignCopyFromQuestion, signHasDescription } from "src/lib/roadSignCopy";
import { Card } from "src/components/ui/card";

type Props = {
  questions: readonly ExamQuestion[];
};

export default function RoadSignCatalog({ questions }: Props) {
  const { t } = useLang();
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {questions.map((question) => {
        const copy = roadSignCopyFromQuestion(question);
        const title = copy.title || question.id;
        const expandable = signHasDescription(copy);
        const open = openId === question.id;
        return (
          <Card key={question.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-start gap-4">
              {question.imageUrl ? (
                <img
                  src={question.imageUrl}
                  alt={title}
                  className="h-16 w-12 shrink-0 object-contain"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="h-16 w-12 shrink-0 rounded-md border border-dashed border-border bg-muted/40" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold leading-snug text-foreground">{title}</p>
                {expandable ? (
                  <button
                    type="button"
                    className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                    aria-expanded={open}
                    onClick={() => setOpenId(open ? null : question.id)}
                  >
                    {open ? <ChevronUp className="size-3.5" aria-hidden /> : <ChevronDown className="size-3.5" aria-hidden />}
                    <span>{open ? t("roadSignClose") : t("roadSignMore")}</span>
                  </button>
                ) : null}
                {open && expandable ? (
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{copy.fullText}</p>
                ) : null}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
