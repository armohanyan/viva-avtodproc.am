import { clearRefreshCookieBestEffort } from "src/lib/authSession";
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
 * Clears persisted auth and user data, clears the server refresh cookie, then notifies the app (navigation).
 * Call when the API returns 401 and refresh/retry cannot recover the session.
 */
export function revokeClientSessionAfterAuthorizationFailure(): void {
	clearAccountSession();
	clearRefreshCookieBestEffort();
	onSessionRevoked?.();
}
