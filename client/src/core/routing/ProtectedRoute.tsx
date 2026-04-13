import { useEffect, type ComponentType } from "react";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import type { AccountType } from "src/modules/accounts";
import { useAccount } from "src/modules/accounts";
import { defaultHomePathForAccountType } from "src/modules/accounts/accountRouting";

type Props = {
  readonly component: ComponentType;
  readonly allowedAccountTypes?: readonly AccountType[];
};

export function ProtectedRoute({ component: C, allowedAccountTypes }: Props) {
  const { user, hydrated } = useAccount();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!hydrated) return;
    if (!allowedAccountTypes?.length) return;
    if (!user) {
      setLocation(`/login?redirect=${encodeURIComponent(location)}`);
      return;
    }
    if (!allowedAccountTypes.includes(user.accountType)) {
      setLocation(defaultHomePathForAccountType(user.accountType));
    }
  }, [hydrated, user, allowedAccountTypes, location, setLocation]);

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
    return null;
  }

  return <C />;
}
