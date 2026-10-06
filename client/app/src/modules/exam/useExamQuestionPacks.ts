import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ExamQuestion, ExamQuizMode } from "src/data/examSampleQuestions";
import { subscribeExamQuestionsUpdated } from "src/lib/examQuestions";
import { sameOriginStaffUploadUrl } from "src/lib/sameOriginStaffUploadUrl";
import { vivaApiJson } from "src/lib/vivaApi";

type ExamDto = {
  id: string;
  text: Record<string, string>;
  options: Record<string, string[]>;
  explanation?: string;
  correctIndex: number;
  category: "rules" | "signs" | "safety";
  topicId?: string;
  imageUrl?: string | null;
};

function mapDto(q: ExamDto): ExamQuestion {
  const image = sameOriginStaffUploadUrl(q.imageUrl ?? null);
  return {
    id: q.id,
    text: q.text,
    options: q.options,
    explanation: q.explanation,
    correctIndex: q.correctIndex,
    category: q.category,
    topicId: q.topicId,
    imageUrl: image ?? undefined,
  };
}

async function fetchPackThematic(topicId: string): Promise<ExamQuestion[]> {
  const rows = await vivaApiJson<ExamDto[]>(`/exam-questions/pack/thematic/${encodeURIComponent(topicId)}`);
  return Array.isArray(rows) ? rows.map(mapDto) : [];
}

async function fetchPackSigns(): Promise<ExamQuestion[]> {
  const rows = await vivaApiJson<ExamDto[]>("/exam-questions/pack/signs");
  return Array.isArray(rows) ? rows.map(mapDto) : [];
}

async function fetchPackSignCategory(topicId: string): Promise<ExamQuestion[]> {
  const rows = await vivaApiJson<ExamDto[]>(
    `/exam-questions/pack/signs-category/${encodeURIComponent(topicId)}`,
  );
  return Array.isArray(rows) ? rows.map(mapDto) : [];
}

async function fetchPackRulesSafety(): Promise<ExamQuestion[]> {
  const rows = await vivaApiJson<ExamDto[]>("/exam-questions/pack/rules-safety");
  return Array.isArray(rows) ? rows.map(mapDto) : [];
}

async function fetchPackByIds(ids: string[]): Promise<ExamQuestion[]> {
  const rows = await vivaApiJson<ExamDto[]>("/exam-questions/pack/by-ids", {
    method: "POST",
    body: { ids },
  });
  return Array.isArray(rows) ? rows.map(mapDto) : [];
}

function mergeUniqueById(a: readonly ExamQuestion[], b: readonly ExamQuestion[]): ExamQuestion[] {
  const byId = new Map<string, ExamQuestion>();
  for (const q of a) byId.set(q.id, q);
  for (const q of b) byId.set(q.id, q);
  return [...byId.values()];
}

export type ExamQuizPoolOpts = {
  mode: ExamQuizMode | null;
  /** `?topic=` when mode is `topics` (thematic chapters). */
  thematicTopicId: string | undefined;
  /** `?topic=` when mode is `topics` on road-signs routes (category slot 1..10). */
  signCategoryTopicId: string | undefined;
  /** True when URL has `?ticket=` for a full exam card. */
  examTicketActive: boolean;
  /** While meta for exam cards is still loading. */
  examTicketMetaPending: boolean;
  /** When `examTicketActive` and meta is ready: id list for that ticket (may be empty). Ignored when not ticket mode. */
  examTicketQuestionIds: string[];
};

/**
 * Loads only the question bodies needed for the current quiz route
 * (thematic topic pack, signs pack, rules+safety merge for full practice, or by-ids for exam tickets).
 */
export function useExamQuizQuestionPool(opts: ExamQuizPoolOpts): { pool: ExamQuestion[]; loading: boolean } {
  const { mode, thematicTopicId, signCategoryTopicId, examTicketActive, examTicketMetaPending, examTicketQuestionIds } =
    opts;

  const ticketKey = useMemo(() => examTicketQuestionIds.join("\u0001"), [examTicketQuestionIds]);
  const requestKey = [
    mode ?? "",
    thematicTopicId ?? "",
    signCategoryTopicId ?? "",
    examTicketActive ? "1" : "0",
    examTicketMetaPending ? "1" : "0",
    ticketKey,
  ].join("\u0001");

  const [pool, setPool] = useState<ExamQuestion[]>([]);
  const [readyKey, setReadyKey] = useState<string | null>(null);
  const [ticketIds, setTicketIds] = useState(examTicketQuestionIds);
  if (ticketIds.join("\u0001") !== ticketKey) setTicketIds(examTicketQuestionIds);
  // True on the same render the route changes, before the fetch starts, so the page
  // does not paint an empty list and drop the scrollbar in between categories.
  const loading = mode != null && readyKey !== requestKey;
  const requestSeq = useRef(0);

  const load = useCallback(async () => {
    const seq = ++requestSeq.current;

    if (!mode) {
      setPool([]);
      setReadyKey(requestKey);
      return;
    }

    if (mode === "full" && examTicketActive && examTicketMetaPending) {
      setPool([]);
      return;
    }

    const finish = (rows: ExamQuestion[]) => {
      if (seq !== requestSeq.current) return;
      setPool(rows);
      setReadyKey(requestKey);
    };

    try {
      if (mode === "full" && examTicketActive && !examTicketMetaPending) {
        finish(await fetchPackByIds(ticketIds));
        return;
      }
      if (mode === "topics") {
        const rows = signCategoryTopicId
          ? await fetchPackSignCategory(signCategoryTopicId)
          : thematicTopicId
            ? await fetchPackThematic(thematicTopicId)
            : await fetchPackRulesSafety();
        finish(rows);
        return;
      }
      if (mode === "signs") {
        finish(await fetchPackSigns());
        return;
      }
      if (mode === "full" && !examTicketActive) {
        const [rulesSafety, signs] = await Promise.all([fetchPackRulesSafety(), fetchPackSigns()]);
        finish(mergeUniqueById(rulesSafety, signs));
        return;
      }
      finish([]);
    } catch {
      finish([]);
    }
  }, [mode, thematicTopicId, signCategoryTopicId, examTicketActive, examTicketMetaPending, requestKey, ticketIds]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => subscribeExamQuestionsUpdated(() => void load()), [load]);

  return { pool, loading };
}
