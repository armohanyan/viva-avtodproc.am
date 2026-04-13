import { useCallback, useEffect, useState } from "react";
import type { ExamQuestion } from "src/data/examSampleQuestions";
import { subscribeExamQuestionsUpdated } from "src/lib/examQuestions";
import { vivaApiJson } from "src/lib/vivaApi";

type ExamDto = {
	id: string;
	text: Record<string, string>;
	options: Record<string, string[]>;
	optionExplanations?: Record<string, (string | null)[]>;
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
		optionExplanations: q.optionExplanations,
		correctIndex: q.correctIndex,
		category: q.category,
		topicId: q.topicId,
		imageUrl: q.imageUrl ?? undefined,
	};
}

export function useExamQuestionPool(): ExamQuestion[] {
	const [pool, setPool] = useState<ExamQuestion[]>([]);

	const load = useCallback(async () => {
		try {
			const rows = await vivaApiJson<ExamDto[]>("/exam-questions");
			if (Array.isArray(rows) && rows.length > 0) {
				setPool(rows.map(mapDto));
			} else {
				setPool([]);
			}
		} catch {
			setPool([]);
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	useEffect(() => subscribeExamQuestionsUpdated(() => void load()), [load]);

	return pool;
}
