import { Redirect } from "wouter";

/** Legacy combined fuel/km URL — use separate fuel section. */
export function DirectorRedirectFuelKmToFuel() {
  return <Redirect to="/admin/director/fuel" replace />;
}

/** Instructor lessons live under driver profile. */
export function DirectorRedirectInstructorHoursToDriverProfile() {
  return <Redirect to="/admin/director/driver-profile" replace />;
}
