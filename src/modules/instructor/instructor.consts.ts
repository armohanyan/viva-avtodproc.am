import type { InstructorNavigationLink } from "./instructor.types";

export const INSTRUCTOR_NAV_LINKS: readonly InstructorNavigationLink[] = [
  { href: "/instructor/dashboard", translationKey: "dashboard" },
  { href: "/instructor/students", translationKey: "instructorNavStudents" },
  { href: "/instructor/bookings", translationKey: "bookings" },
  { href: "/instructor/cars", translationKey: "instructorCarsTitle" },
  { href: "/instructor/profile", translationKey: "profile" },
];
