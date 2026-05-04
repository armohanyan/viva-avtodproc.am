import { Loader2 } from "lucide-react";
import { Redirect } from "wouter";
import { useAccount } from "src/modules/accounts";

/** Old `/admin/cohorts` — super admins go to Groups; regular admins cannot access Groups, so send them to the Learn hub. */
export function AdminRedirectCohortsToLearn() {
  const { user, hydrated } = useAccount();
  if (!hydrated) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center bg-background" aria-busy="true">
        <Loader2 className="w-7 h-7 text-primary animate-spin" aria-hidden />
      </div>
    );
  }
  const to = user?.accountType === "super_admin" ? "/admin/learn/groups" : "/admin/learn";
  return <Redirect to={to} replace />;
}

/** Old `/admin/packages` — use Learn → Packages URL. */
export function AdminRedirectPackagesToLearn() {
  return <Redirect to="/admin/learn/packages" replace />;
}
