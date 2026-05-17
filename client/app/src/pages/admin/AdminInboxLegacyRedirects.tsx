import { Redirect } from "wouter";

export function AdminRedirectContactRequestsToInbox() {
  return <Redirect to="/admin/inbox/contact-requests" replace />;
}

export function AdminRedirectBookedCallsToInbox() {
  return <Redirect to="/admin/inbox/booked-calls" replace />;
}

export function AdminRedirectTheoryPersonalRequestsToInbox() {
  return <Redirect to="/admin/inbox/theory-personal" replace />;
}
