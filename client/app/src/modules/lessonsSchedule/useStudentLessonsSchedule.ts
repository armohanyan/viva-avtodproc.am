import { useCallback, useEffect, useState } from "react";
import {
	yerevanMonthRangeContaining,
	yerevanWeekRangeContaining,
} from "src/lib/yerevanLessonCalendar";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import type {
	StudentLessonFilter,
	StudentScheduleResponse,
	StudentScheduleView,
} from "./studentLessonsSchedule.types";

type Options = {
	view: StudentScheduleView;
	anchorIso: string;
	lessonType: StudentLessonFilter;
};

export function useStudentLessonsSchedule({ view, anchorIso, lessonType }: Options) {
	const [data, setData] = useState<StudentScheduleResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const p = new URLSearchParams();
			p.set("view", view);
			if (view === "day") {
				p.set("startDate", anchorIso);
				p.set("endDate", anchorIso);
			} else if (view === "week") {
				const r = yerevanWeekRangeContaining(anchorIso);
				p.set("startDate", r.start);
				p.set("endDate", r.end);
			} else {
				const r = yerevanMonthRangeContaining(anchorIso);
				p.set("startDate", r.start);
				p.set("endDate", r.end);
			}
			if (lessonType !== "all") {
				p.set("lessonType", lessonType === "theory" ? "theory_group" : lessonType);
			}
			const res = await vivaApiJson<StudentScheduleResponse>(`/student/lessons-schedule?${p.toString()}`);
			setData(res);
		} catch (e) {
			setError(getApiErrorMessage(e));
			setData(null);
		} finally {
			setLoading(false);
		}
	}, [view, anchorIso, lessonType]);

	useEffect(() => {
		void load();
	}, [load]);

	return { data, loading, error, refresh: load };
}
