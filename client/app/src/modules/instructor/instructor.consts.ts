import type { InstructorNavigationLink } from "./instructor.types";

export const INSTRUCTOR_NAV_LINKS: readonly InstructorNavigationLink[] = [
  { href: "/instructor/dashboard", translationKey: "dashboard" },
  { href: "/instructor/students", translationKey: "instructorNavStudents" },
  { href: "/instructor/class-schedule", translationKey: "instructorClassSchedule" },
  { href: "/instructor/cars", translationKey: "instructorCarsTitle" },
  { href: "/instructor/reports", translationKey: "instructorReportsNav" },
  { href: "/instructor/fuel-expenses", translationKey: "instructorFuelNav" },
  { href: "/instructor/profile", translationKey: "profile" },
];
