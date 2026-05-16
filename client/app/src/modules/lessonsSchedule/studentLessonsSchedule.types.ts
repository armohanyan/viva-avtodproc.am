export type StudentScheduleView = "day" | "week" | "month";

export type StudentLessonType = "practical" | "theory" | "theory_personal";

export type StudentLessonFilter = "all" | StudentLessonType;

export type StudentScheduleItem = {
	id: string;
	bookingId: number;
	lessonType: StudentLessonType;
	bookingType: "single" | "package" | "group" | "personal_theory";
	status: string;
	date: string;
	startTime: string;
	endTime: string;
	instructor: { id: number | null; name: string };
	branch: { id: number; name: string; address: string };
	package: { id: number; name: string; isIncludedLesson: boolean } | null;
	payment: { status: "paid" | "free" | "pending" | "not_required" };
	notes: string;
	cancellationRequestedAt: string | null;
	lessonPassedSuccessfully: boolean | null;
	totalPriceAmd: number | null;
	car: { label: string; transmission: string } | null;
	theoryCohort: { id: number; name: string; lessonIndex: number; totalLessons: number } | null;
	sourceType?: "booking" | "cohort_session";
	sourceId?: number;
	cancelRefundEligible: boolean;
	paymentRequiredAt: string | null;
	paymentRequiredNow: boolean;
	holdExpiresAt: string | null;
	hoursUntilLesson: number;
	meetLink: string | null;
};

export type StudentScheduleResponse = {
	items: StudentScheduleItem[];
	meta: { view: string; startDate: string; endDate: string; total: number };
};

/** Student calendar colors: practical=blue, personal theory=green, group theory=purple. */
export const STUDENT_LESSON_TYPE_STYLES: Record<
	StudentLessonType,
	{ chip: string; border: string; icon: string }
> = {
	practical: {
		chip: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-100 dark:border-blue-900",
		border: "border-l-blue-500",
		icon: "text-blue-600 dark:text-blue-400",
	},
	theory_personal: {
		chip: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-100 dark:border-emerald-900",
		border: "border-l-emerald-500",
		icon: "text-emerald-600 dark:text-emerald-400",
	},
	theory: {
		chip: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-100 dark:border-purple-900",
		border: "border-l-purple-500",
		icon: "text-purple-600 dark:text-purple-400",
	},
};
