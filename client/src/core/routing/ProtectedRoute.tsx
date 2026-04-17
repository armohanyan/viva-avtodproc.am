import { useEffect, type ComponentType } from "react";
import { Loader2 } from "lucide-react";
import { useLocation, useRouter } from "wouter";
import type { AccountType } from "src/modules/accounts";
import { useAccount } from "src/modules/accounts";
import { defaultHomePathForAccountType } from "src/modules/accounts/accountRouting";
import { absWouterHref, fullBrowserPathFromRouter } from "src/lib/wouterFullPath";

type Props = {
  readonly component: ComponentType;
  readonly allowedAccountTypes?: readonly AccountType[];
};

export function ProtectedRoute({ component: C, allowedAccountTypes }: Props) {
  const { user, hydrated } = useAccount();
  const router = useRouter();
  const [location, setLocation] = useLocation();
  const redirectPath = fullBrowserPathFromRouter(router, location);

  useEffect(() => {
    if (!hydrated) return;
    if (!allowedAccountTypes?.length) return;
    if (!user) {
      setLocation(absWouterHref(`/login?redirect=${encodeURIComponent(redirectPath)}`));
      return;
    }
    if (!allowedAccountTypes.includes(user.accountType)) {
      setLocation(absWouterHref(defaultHomePathForAccountType(user.accountType)));
    }
  }, [hydrated, user, allowedAccountTypes, redirectPath, setLocation]);

  if (!hydrated) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center bg-background" aria-busy="true">
        <Loader2 className="w-7 h-7 text-primary animate-spin" aria-hidden />
      </div>
    );
  }

  if (!allowedAccountTypes?.length) {
    return <C />;
  }

  if (!user || !allowedAccountTypes.includes(user.accountType)) {
    // Avoid a blank frame while `useEffect` sends guests to login or wrong-role users home.
    return (
      <div className="min-h-[50vh] flex items-center justify-center bg-background" aria-busy="true">
        <Loader2 className="w-7 h-7 text-primary animate-spin" aria-hidden />
      </div>
    );
  }

  return <C />;
}
