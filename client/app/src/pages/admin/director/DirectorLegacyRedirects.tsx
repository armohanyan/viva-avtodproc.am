import { Redirect } from "wouter";

/** Root director URL used to be the dashboard - land on cash. */
export function DirectorRedirectRootToCash() {
  return <Redirect to="/admin/director/cash" replace />;
}

/** Legacy combined fuel/km URL - use separate fuel section. */
export function DirectorRedirectFuelKmToFuel() {
  return <Redirect to="/admin/director/fuel" replace />;
}

/** Instructor lessons live under driver profile. */
export function DirectorRedirectInstructorHoursToDriverProfile() {
  return <Redirect to="/admin/director/driver-profile" replace />;
}

/** Archive moved from the admin panel into the director cabinet. */
export function DirectorRedirectLegacyAdminArchive() {
  return <Redirect to="/admin/director/archive" replace />;
}

/** Reports moved from the admin panel into the director cabinet. */
export function DirectorRedirectLegacyAdminReports() {
  return <Redirect to="/admin/director/reports" replace />;
}
