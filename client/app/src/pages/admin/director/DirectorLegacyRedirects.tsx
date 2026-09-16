import { Redirect } from "wouter";

/** Root director URL used to be the dashboard — land on cash. */
export function DirectorRedirectRootToCash() {
  return <Redirect to="/admin/director/cash" replace />;
}

/** Legacy combined fuel/km URL — use separate fuel section. */
export function DirectorRedirectFuelKmToFuel() {
  return <Redirect to="/admin/director/fuel" replace />;
}

/** Instructor lessons live under driver profile. */
export function DirectorRedirectInstructorHoursToDriverProfile() {
  return <Redirect to="/admin/director/driver-profile" replace />;
}
