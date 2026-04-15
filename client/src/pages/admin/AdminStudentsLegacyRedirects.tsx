import { Redirect } from "wouter";

/** Old `/admin/users` — use Students URL. */
export function AdminRedirectUsersToStudents() {
  return <Redirect to="/admin/students" replace />;
}

/** Old `/admin/users/analytics` — use Students analytics URL. */
export function AdminRedirectUsersAnalyticsToStudents() {
  return <Redirect to="/admin/students/analytics" replace />;
}

/** Old `/admin/learn/practical` — same page under Students; preserve query string. */
export function AdminRedirectLearnPracticalToStudents() {
  const search = typeof window !== "undefined" ? window.location.search : "";
  return <Redirect to={`/admin/students/practical${search}`} replace />;
}

/** Old `/admin/learn/theory` — same page under Students; preserve query string. */
export function AdminRedirectLearnTheoryToStudents() {
  const search = typeof window !== "undefined" ? window.location.search : "";
  return <Redirect to={`/admin/students/theory${search}`} replace />;
}
