/** Normalized lesson occurrence for calendars across student / instructor / admin panels. */
export type LessonEventType = "practical" | "theory_personal" | "theory_group";

export type LessonEventSourceType = "booking" | "cohort_session";

export type LessonEvent = {
	id: string;
	type: LessonEventType;
	title: string;
	date: string;
	startTime: string;
	endTime: string;
	branchId: number;
	branchName: string;
	instructorId: number | null;
	instructorName: string;
	status: string;
	sourceId: number;
	sourceType: LessonEventSourceType;
	metadata: {
		bookingId?: number;
		bookingType?: string;
		theoryCohort?: {
			id: number;
			name: string;
			lessonIndex: number;
			totalLessons: number;
			enrolledCount?: number;
		};
	};
};

export const WEEKDAY_OPTIONS = [
	{ value: 0, key: "weekdayMon" as const },
	{ value: 1, key: "weekdayTue" as const },
	{ value: 2, key: "weekdayWed" as const },
	{ value: 3, key: "weekdayThu" as const },
	{ value: 4, key: "weekdayFri" as const },
	{ value: 5, key: "weekdaySat" as const },
	{ value: 6, key: "weekdaySun" as const },
] as const;
