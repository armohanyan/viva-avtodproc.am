import type { AccountType } from "src/modules/accounts";
import type { AppRoute } from "src/types/router.types";
import {
	InstructorDashboardPage,
	InstructorStudentsPage,
	InstructorCarsPage,
	InstructorProfilePage,
	InstructorNotificationsPage,
	InstructorClassSchedulePage,
	InstructorReportsPage,
	InstructorFuelExpensesPage,
	InstructorQuestionsPage,
	InstructorQuestionsCategoryPage,
	InstructorQuestionPresentPage,
	InstructorThemeExamsPage,
	InstructorThemeExamQuizPage,
} from "src/pages/instructor";

const INSTRUCTOR: readonly AccountType[] = ["instructor"];

export const instructorRoutes: readonly AppRoute[] = [
	{ path: "/instructor/dashboard", component: InstructorDashboardPage, allowedAccountTypes: INSTRUCTOR },
	{ path: "/instructor/students", component: InstructorStudentsPage, allowedAccountTypes: INSTRUCTOR },
	{ path: "/instructor/class-schedule", component: InstructorClassSchedulePage, allowedAccountTypes: INSTRUCTOR },
	// More specific present routes before category routes.
	{
		path: "/instructor/questions/thematic/:slotId/present",
		component: InstructorQuestionPresentPage,
		allowedAccountTypes: INSTRUCTOR,
	},
	{
		path: "/instructor/questions/signs/:slotId/present",
		component: InstructorQuestionPresentPage,
		allowedAccountTypes: INSTRUCTOR,
	},
	{
		path: "/instructor/questions/thematic/:slotId",
		component: InstructorQuestionsCategoryPage,
		allowedAccountTypes: INSTRUCTOR,
	},
	{
		path: "/instructor/questions/signs/:slotId",
		component: InstructorQuestionsCategoryPage,
		allowedAccountTypes: INSTRUCTOR,
	},
	{
		path: "/instructor/questions/theme-exams/quiz/:mode",
		component: InstructorThemeExamQuizPage,
		allowedAccountTypes: INSTRUCTOR,
	},
	{
		path: "/instructor/questions/theme-exams",
		component: InstructorThemeExamsPage,
		allowedAccountTypes: INSTRUCTOR,
	},
	{ path: "/instructor/questions", component: InstructorQuestionsPage, allowedAccountTypes: INSTRUCTOR },
	{ path: "/instructor/cars", component: InstructorCarsPage, allowedAccountTypes: INSTRUCTOR },
	{ path: "/instructor/reports", component: InstructorReportsPage, allowedAccountTypes: INSTRUCTOR },
	{ path: "/instructor/fuel-expenses", component: InstructorFuelExpensesPage, allowedAccountTypes: INSTRUCTOR },
	{ path: "/instructor/profile", component: InstructorProfilePage, allowedAccountTypes: INSTRUCTOR },
	{ path: "/instructor/notifications", component: InstructorNotificationsPage, allowedAccountTypes: INSTRUCTOR },
];
