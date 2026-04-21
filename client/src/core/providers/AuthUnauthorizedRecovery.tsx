import { useEffect, type ReactElement } from "react";
import { useAppNavigation } from "src/lib/navigation/AppNavigationContext";
import { registerAuthSessionRevokedHandler } from "src/lib/authUnauthorizedRecovery";
import { absWouterHref } from "src/lib/wouterFullPath";

/**
 * When `apiFetch` revokes the session after a 401 (refresh exhausted), navigate to login with return URL.
 */
export function AuthUnauthorizedRecovery(): ReactElement | null {
	const { navigate } = useAppNavigation();

	useEffect(() => {
		return registerAuthSessionRevokedHandler(() => {
			const { pathname, search } = window.location;
			const here = `${pathname}${search}`;
			if (
				pathname.startsWith("/login") ||
				pathname.startsWith("/register") ||
				pathname.startsWith("/forgot-password") ||
				pathname.startsWith("/reset-password") ||
				pathname.startsWith("/setup-password")
			) {
				return;
			}
			navigate(absWouterHref(`/login?redirect=${encodeURIComponent(here)}`));
		});
	}, [navigate]);

	return null;
}
