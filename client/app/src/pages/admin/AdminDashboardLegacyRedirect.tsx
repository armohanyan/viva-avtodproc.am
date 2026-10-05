import { Redirect } from "wouter";

export function AdminRedirectDashboardToCashRegister() {
  return <Redirect to="/admin/cash-register" replace />;
}

/** Marketing admin shell has no cash register route. */
export function AdminRedirectDashboardToNotifications() {
  return <Redirect to="/admin/notifications" replace />;
}
