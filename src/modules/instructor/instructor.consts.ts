import type { InstructorNavigationLink } from "./instructor.types";

/** Logged-in instructor email shown in the panel sidebar (until auth is wired). */
export const INSTRUCTOR_PANEL_EMAIL = "instructor@vivadrive.am";

export const INSTRUCTOR_NAV_LINKS: readonly InstructorNavigationLink[] = [
  { href: "/instructor/dashboard", translationKey: "dashboard" },
  { href: "/instructor/students", translationKey: "instructorNavStudents" },
  { href: "/instructor/bookings", translationKey: "bookings" },
  { href: "/instructor/cars", translationKey: "instructorCarsTitle" },
  { href: "/instructor/profile", translationKey: "profile" },
];
