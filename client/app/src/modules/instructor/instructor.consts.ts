import type { InstructorNavigationLink } from "./instructor.types";

export const INSTRUCTOR_NAV_LINKS: readonly InstructorNavigationLink[] = [
	{ href: "/instructor/dashboard", translationKey: "dashboard", scope: "shared" },
	{ href: "/instructor/students", translationKey: "instructorNavStudents", scope: "practical" },
	{ href: "/instructor/class-schedule", translationKey: "instructorClassSchedule", scope: "shared" },
	{ href: "/instructor/questions", translationKey: "instructorQuestionsNav", scope: "theory" },
	{ href: "/instructor/cars", translationKey: "instructorCarsTitle", scope: "practical" },
	{ href: "/instructor/reports", translationKey: "instructorReportsNav", scope: "shared" },
	{ href: "/instructor/fuel-expenses", translationKey: "instructorFuelNav", scope: "practical" },
	{ href: "/instructor/profile", translationKey: "profile", scope: "shared" },
];

export function filterInstructorNavLinks(
	links: readonly InstructorNavigationLink[],
	opts: { teachesPractical: boolean; teachesTheory: boolean },
): InstructorNavigationLink[] {
	return links.filter((link) => {
		if (link.scope === "shared") return true;
		if (link.scope === "practical") return opts.teachesPractical;
		if (link.scope === "theory") return opts.teachesTheory;
		return true;
	});
}
