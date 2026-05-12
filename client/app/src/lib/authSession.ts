import { API_V1_PREFIX } from "src/constants/api.constants";
import { getApiBaseUrl } from "src/lib/apiBaseUrl";
import { saveAccountSession } from "src/modules/accounts/account.session";
import type { AccountSessionUser, AccountType } from "src/modules/accounts/account.types";

function isAccountType(v: string): v is AccountType {
	return v === "super_admin" || v === "admin" || v === "instructor" || v === "student";
}

/** Must match `apiFetch` host so httpOnly refresh cookies are sent with `/auth/refresh` and `/auth/logout`. */
function authV1Url(suffix: string): string {
	const base = getApiBaseUrl();
	const path = `${API_V1_PREFIX}${suffix.startsWith("/") ? suffix : `/${suffix}`}`;
	return base ? `${base}${path}` : path;
}

function authRefreshUrl(): string {
	return authV1Url("/auth/refresh");
}

/**
 * Clears the httpOnly refresh cookie on the server (best-effort). Use after local session is cleared
 * so the browser does not keep a valid refresh token without a matching client session.
 */
export async function clearRefreshCookieAwait(): Promise<void> {
	if (typeof window === "undefined") return;
	try {
		await fetch(authV1Url("/auth/logout"), { method: "POST", credentials: "include" });
	} catch {
		/* ignore */
	}
}

export function clearRefreshCookieBestEffort(): void {
	void clearRefreshCookieAwait();
}

export type RefreshAttempt = "ok" | "failed" | "rate_limited";

let refreshChain: Promise<RefreshAttempt> | null = null;

/**
 * Uses httpOnly refresh cookie; on success stores a new access token in memory and user snapshot in
 * localStorage (never persists the access token to localStorage).
 *
 * Coalesces concurrent callers onto one refresh request.
 *
 * Important: this is used after the API already returned **401**. Returning `"ok"` without hitting
 * the refresh endpoint would make `apiFetch` retry the same Bearer token, get 401 again, and then
 * revoke the client session — e.g. right after MFA when the server rejects the access JWT for a
 * reason the client `exp` check does not reflect.
 */
export async function tryRefreshAccessToken(): Promise<RefreshAttempt> {
	if (typeof window === "undefined") return "failed";
	if (refreshChain) {
		return refreshChain;
	}
	refreshChain = (async (): Promise<RefreshAttempt> => {
		try {
			const res = await fetch(authRefreshUrl(), { method: "POST", credentials: "include" });
			const text = await res.text();

			if (res.status === 429) {
				return "rate_limited";
			}
			if (!res.ok) {
				return "failed";
			}

			const data = JSON.parse(text) as {
				accessToken?: string;
				user?: {
					id: string | number;
					email: string;
					name: string;
					accountType: string;
					hasPassword?: boolean;
				};
			};

			if (!data.accessToken || !data.user || !isAccountType(data.user.accountType)) {
				return "failed";
			}

			const next: AccountSessionUser = {
				id: String(data.user.id),
				email: data.user.email,
				name: data.user.name,
				accountType: data.user.accountType,
				accessToken: data.accessToken,
				...(typeof data.user.hasPassword === "boolean" ? { hasPassword: data.user.hasPassword } : {}),
			};
			saveAccountSession(next);
			return "ok";
		} catch {
			return "failed";
		} finally {
			refreshChain = null;
		}
	})();
	return refreshChain;
}
