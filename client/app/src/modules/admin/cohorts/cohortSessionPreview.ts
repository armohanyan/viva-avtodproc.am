import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";

export type CohortSessionPreviewRow = {
	dateIso: string;
	startTime: string;
	endTime: string;
	lessonIndex: number;
};

export async function fetchCohortSessionPreview(body: {
	startDateIso: string;
	endDateIso: string;
	lessonWeekdays: number[];
	sessionStartTime: string;
	sessionEndTime: string;
	totalLessons: number;
}): Promise<CohortSessionPreviewRow[]> {
	const data = await vivaApiJson<CohortSessionPreviewRow[]>("/theory-cohorts/preview-sessions", {
		method: "POST",
		body,
	});
	return Array.isArray(data) ? data : [];
}

export function cohortPreviewErrorMessage(e: unknown): string {
	return getApiErrorMessage(e);
}
