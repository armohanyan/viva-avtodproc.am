import { Redirect } from "wouter";

/** Old `/admin/cohorts` — use Learn → Groups URL. */
export function AdminRedirectCohortsToLearn() {
  return <Redirect to="/admin/learn/groups" replace />;
}

/** Old `/admin/packages` — use Learn → Packages URL. */
export function AdminRedirectPackagesToLearn() {
  return <Redirect to="/admin/learn/packages" replace />;
}
