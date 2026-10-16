import { API_V1_PREFIX } from "src/constants/api.constants";
import { getAccessTokenInMemory, memoryAccessTokenLooksValid } from "src/lib/accessTokenMemory";
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

const SKIP_SESSION_REFRESH_KEY = "viva-skip-session-refresh";

/** Set just before leaving the panel so the next /login load does not restore the old account. */
export function armSkipSessionRefreshOnce(): void {
	if (typeof window === "undefined") return;
	try {
		sessionStorage.setItem(SKIP_SESSION_REFRESH_KEY, "1");
	} catch {
		/* private mode */
	}
}

/**
 * /login and /register only. Other pages must not consume the flag, or the real login
 * visit would refresh the cookie we just tried to drop.
 */
export function consumeSkipSessionRefreshOnAuthEntry(): boolean {
	if (typeof window === "undefined") return false;
	const path = window.location.pathname.replace(/\/+$/, "") || "/";
	if (path !== "/login" && path !== "/register") return false;
	try {
		if (sessionStorage.getItem(SKIP_SESSION_REFRESH_KEY) !== "1") return false;
		sessionStorage.removeItem(SKIP_SESSION_REFRESH_KEY);
		return true;
	} catch {
		return false;
	}
}

/**
 * Revokes the httpOnly refresh cookie. `keepalive` so a following navigation cannot cancel it.
 * Waits up to 8s, then continues; the request is left running.
 */
export async function clearRefreshCookieAwait(): Promise<void> {
	if (typeof window === "undefined") return;
	const logout = fetch(authV1Url("/auth/logout"), {
		method: "POST",
		credentials: "include",
		keepalive: true,
		cache: "no-store",
	}).then(
		() => undefined,
		() => undefined,
	);
	await Promise.race([logout, new Promise<void>((r) => setTimeout(r, 8000))]);
}

export function clearRefreshCookieBestEffort(): void {
	void clearRefreshCookieAwait();
}

export type RefreshAttempt = "ok" | "failed" | "rate_limited";

export type TryRefreshOptions = {
	/**
	 * Access token that just received HTTP 401. When set, a different in-memory token
	 * (e.g. from a login that completed while refresh was in flight) counts as success
	 * without rotating the refresh cookie again.
	 */
	failedAccessToken?: string | null;
};

let refreshChain: Promise<RefreshAttempt> | null = null;

const REFRESH_LOCK_NAME = "viva-auth-refresh";

function sleep(ms: number): Promise<void> {
	return new Promise((r) => setTimeout(r, ms));
}

async function postRefreshAndApplySession(): Promise<RefreshAttempt> {
	let res: Response;
	try {
		res = await fetch(authRefreshUrl(), { method: "POST", credentials: "include" });
	} catch {
		await sleep(300);
		try {
			res = await fetch(authRefreshUrl(), { method: "POST", credentials: "include" });
		} catch {
			return "failed";
		}
	}

	const text = await res.text();

	if (res.status === 429) {
		return "rate_limited";
	}
	if (!res.ok) {
		return "failed";
	}

	let data: {
		accessToken?: string;
		user?: {
			id: string | number;
			email: string;
			name: string;
			accountType: string;
			hasPassword?: boolean;
		};
	};
	try {
		data = JSON.parse(text) as typeof data;
	} catch {
		return "failed";
	}

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
}

/**
 * True only when a *different* access token appeared after a known 401.
 * Do NOT treat "any valid in-memory token" as success when `failedAccessToken` is unset —
 * that skipped `/auth/refresh` after Google OAuth and left the callback page stuck on success.
 */
function sessionRecoveredAfterFailure(failedAccessToken?: string | null): boolean {
	if (failedAccessToken == null || failedAccessToken === "") {
		return false;
	}
	const current = getAccessTokenInMemory();
	if (!current || !memoryAccessTokenLooksValid(45)) {
		return false;
	}
	return current !== failedAccessToken;
}

async function runRefreshAttempt(opts?: TryRefreshOptions): Promise<RefreshAttempt> {
	if (sessionRecoveredAfterFailure(opts?.failedAccessToken)) {
		return "ok";
	}

	const outcome = await postRefreshAndApplySession();
	if (outcome === "ok" || outcome === "rate_limited") {
		return outcome;
	}

	// Refresh failed, but login may have completed while the request was in flight.
	if (sessionRecoveredAfterFailure(opts?.failedAccessToken)) {
		return "ok";
	}
	return "failed";
}

async function withRefreshLock<T>(fn: () => Promise<T>): Promise<T> {
	const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
	if (!locks?.request) {
		return fn();
	}
	return locks.request(REFRESH_LOCK_NAME, fn);
}

/**
 * Uses httpOnly refresh cookie; on success stores a new access token in memory and user snapshot in
 * localStorage (never persists the access token to localStorage).
 *
 * Coalesces concurrent callers onto one refresh request and serializes across tabs via Web Locks
 * so rotating refresh tokens are not presented twice (which previously revoked all sessions).
 *
 * Important: after an API **401**, pass `failedAccessToken` so we still hit `/auth/refresh` when the
 * rejected JWT is the one still in memory (e.g. MFA / server-side invalidation). Returning `"ok"`
 * without refreshing in that case would retry the same Bearer and then revoke the client session.
 */
export async function tryRefreshAccessToken(opts?: TryRefreshOptions): Promise<RefreshAttempt> {
	if (typeof window === "undefined") return "failed";
	if (refreshChain) {
		const shared = await refreshChain;
		if (shared === "ok" || shared === "rate_limited") {
			return shared;
		}
		// Shared attempt failed — still allow recovery if login landed a new token.
		if (sessionRecoveredAfterFailure(opts?.failedAccessToken)) {
			return "ok";
		}
		return shared;
	}
	refreshChain = (async (): Promise<RefreshAttempt> => {
		try {
			return await withRefreshLock(() => runRefreshAttempt(opts));
		} finally {
			refreshChain = null;
		}
	})();
	return refreshChain;
}
