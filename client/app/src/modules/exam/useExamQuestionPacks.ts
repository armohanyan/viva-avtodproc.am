import { useCallback, useEffect, useMemo, useState } from "react";
import type { ExamQuestion, ExamQuizMode } from "src/data/examSampleQuestions";
import { subscribeExamQuestionsUpdated } from "src/lib/examQuestions";
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
  return {
    id: q.id,
    text: q.text,
    options: q.options,
    explanation: q.explanation,
    correctIndex: q.correctIndex,
    category: q.category,
    topicId: q.topicId,
    imageUrl: q.imageUrl ?? undefined,
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
  /** `?topic=` when mode is `topics`. */
  thematicTopicId: string | undefined;
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
  const { mode, thematicTopicId, examTicketActive, examTicketMetaPending, examTicketQuestionIds } = opts;

  const ticketKey = useMemo(() => examTicketQuestionIds.join("\u0001"), [examTicketQuestionIds]);

  const [pool, setPool] = useState<ExamQuestion[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!mode) {
      setPool([]);
      setLoading(false);
      return;
    }

    if (mode === "full" && examTicketActive && examTicketMetaPending) {
      setPool([]);
      setLoading(true);
      return;
    }

    if (mode === "full" && examTicketActive && !examTicketMetaPending) {
      setLoading(true);
      try {
        const rows = await fetchPackByIds(examTicketQuestionIds);
        setPool(rows);
      } catch {
        setPool([]);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode === "topics") {
      setLoading(true);
      try {
        const rows = thematicTopicId
          ? await fetchPackThematic(thematicTopicId)
          : await fetchPackRulesSafety();
        setPool(rows);
      } catch {
        setPool([]);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode === "signs") {
      setLoading(true);
      try {
        setPool(await fetchPackSigns());
      } catch {
        setPool([]);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (mode === "full" && !examTicketActive) {
      setLoading(true);
      try {
        const [rulesSafety, signs] = await Promise.all([fetchPackRulesSafety(), fetchPackSigns()]);
        setPool(mergeUniqueById(rulesSafety, signs));
      } catch {
        setPool([]);
      } finally {
        setLoading(false);
      }
      return;
    }

    setPool([]);
    setLoading(false);
  }, [mode, thematicTopicId, examTicketActive, examTicketMetaPending, ticketKey]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => subscribeExamQuestionsUpdated(() => void load()), [load]);

  return { pool, loading };
}
