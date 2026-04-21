import { API_V1_PREFIX } from "src/constants/api";
import { getApiBaseUrl } from "src/lib/apiBaseUrl";
import { memoryAccessTokenLooksValid } from "src/lib/accessTokenMemory";
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
export function clearRefreshCookieBestEffort(): void {
	if (typeof window === "undefined") return;
	void fetch(authV1Url("/auth/logout"), { method: "POST", credentials: "include" });
}

export type RefreshAttempt = "ok" | "failed" | "rate_limited";

let refreshChain: Promise<RefreshAttempt> | null = null;

/**
 * Uses httpOnly refresh cookie; on success stores a new access token in memory and user snapshot in
 * localStorage (never persists the access token to localStorage).
 *
 * Coalesces concurrent callers onto one refresh request. If the in-memory access token is already
 * valid, skips the network call so parallel 401 retries do not rotate the refresh cookie repeatedly.
 */
export async function tryRefreshAccessToken(): Promise<RefreshAttempt> {
	if (typeof window === "undefined") return "failed";
	if (memoryAccessTokenLooksValid(45)) {
		return "ok";
	}
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
				user?: { id: string | number; email: string; name: string; accountType: string };
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
