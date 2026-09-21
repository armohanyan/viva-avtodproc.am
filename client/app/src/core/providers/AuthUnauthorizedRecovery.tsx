import { useEffect, type ReactElement } from "react";
import { useAppNavigation } from "src/lib/navigation/AppNavigationContext";
import { registerAuthSessionRevokedHandler } from "src/lib/authUnauthorizedRecovery";
import { resolveAppShell } from "src/lib/navigation/appShell";
import { absWouterHref } from "src/lib/wouterFullPath";

/**
 * When `apiFetch` revokes the session after a 401 (refresh exhausted), navigate to login with return URL.
 * Skip marketing URLs (e.g. `/instructors` mis-routed onto the panel) - those belong on the Next app.
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
			// Public marketing paths must not bounce guests to `/login` if they briefly hit the panel.
			if (resolveAppShell(pathname) === "marketing") {
				return;
			}
			navigate(absWouterHref(`/login?redirect=${encodeURIComponent(here)}`));
		});
	}, [navigate]);

	return null;
}
