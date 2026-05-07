import { Redirect } from "wouter";

/** Old `/admin/users` — use Students URL. */
export function AdminRedirectUsersToStudents() {
  return <Redirect to="/admin/students" replace />;
}

/** Old `/admin/users/analytics` — Students list opens analytics modal. */
export function AdminRedirectUsersAnalyticsToStudents() {
  return <Redirect to="/admin/students?analytics=1" replace />;
}

/** Old `/admin/students/analytics` bookmark — same as opening analytics from Students. */
export function AdminRedirectLegacyStudentsAnalytics() {
  return <Redirect to="/admin/students?analytics=1" replace />;
}

/** Old `/admin/learn/practical` — bookings flow; preserve student/branch query. */
export function AdminRedirectLearnPracticalToStudents() {
  const search = typeof window !== "undefined" ? window.location.search : "";
  const p = new URLSearchParams(search);
  const next = new URLSearchParams();
  const student = p.get("student");
  const branch = p.get("branch");
  if (student) next.set("student", student);
  if (branch) next.set("branch", branch);
  next.set("new", "1");
  const q = next.toString();
  return <Redirect to={`/admin/bookings${q ? `?${q}` : ""}`} replace />;
}

/** Old `/admin/learn/theory` — bookings flow; preserve student query. */
export function AdminRedirectLearnTheoryToStudents() {
  const search = typeof window !== "undefined" ? window.location.search : "";
  const p = new URLSearchParams(search);
  const next = new URLSearchParams();
  const student = p.get("student");
  if (student) next.set("student", student);
  next.set("new", "1");
  const q = next.toString();
  return <Redirect to={`/admin/bookings${q ? `?${q}` : ""}`} replace />;
}
