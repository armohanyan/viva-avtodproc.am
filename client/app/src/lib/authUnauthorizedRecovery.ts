import { clearAccountSession } from "src/modules/accounts/account.session";

let onSessionRevoked: (() => void) | null = null;

/**
 * Register a callback (e.g. redirect to login) when the client session is revoked after a 401.
 * Returns an unsubscribe function.
 */
export function registerAuthSessionRevokedHandler(handler: () => void): () => void {
	onSessionRevoked = handler;
	return () => {
		if (onSessionRevoked === handler) {
			onSessionRevoked = null;
		}
	};
}

/**
 * Clears local auth state and notifies the app (navigation).
 *
 * Important: does NOT call `/auth/logout`. A parallel/stale 401 recovery must not revoke the
 * browser's current refresh cookie (that was wiping brand-new logins). Explicit sign-out still
 * clears the cookie via `signOut`.
 */
export function revokeClientSessionAfterAuthorizationFailure(): void {
	clearAccountSession();
	onSessionRevoked?.();
}
