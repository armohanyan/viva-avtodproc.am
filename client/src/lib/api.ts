import { API_V1_PREFIX } from "src/constants/api";
import { getApiBaseUrl } from "src/lib/apiBaseUrl";
import { tryRefreshAccessToken } from "src/lib/authSession";
import { revokeClientSessionAfterAuthorizationFailure } from "src/lib/authUnauthorizedRecovery";
import { loadAccountSession } from "src/modules/accounts/account.session";

export { getApiBaseUrl } from "src/lib/apiBaseUrl";

/**
 * Absolute path under the API host, e.g. `/api/v1/health`.
 */
export function apiPath(path: string): string {
	const p = path.startsWith("/") ? path : `/${path}`;
	return `${getApiBaseUrl()}${p}`;
}

function isAbsoluteHttpUrl(path: string): boolean {
	return /^https?:\/\//i.test(path);
}

/** Final URL passed to `fetch` (applies API base unless `path` is already absolute). */
function resolveApiFetchUrl(path: string): string {
	return isAbsoluteHttpUrl(path) ? path : apiPath(path);
}

/** Versioned REST prefix as configured for the Viva backend. */
export function apiV1Path(suffix: string): string {
	const s = suffix.startsWith("/") ? suffix : `/${suffix}`;
	return apiPath(`${API_V1_PREFIX}${s}`);
}

export type ApiJsonInit = Omit<RequestInit, "body"> & {
	body?: unknown;
	/** Internal: avoid infinite refresh loop on 401. */
	_authRetry?: boolean;
};

export class ApiRequestError extends Error {
	readonly status: number;
	readonly bodyText?: string;

	constructor(message: string, status: number, bodyText?: string) {
		super(message);
		this.name = "ApiRequestError";
		this.status = status;
		this.bodyText = bodyText;
	}
}

export function getApiErrorMessage(err: unknown): string {
	if (err instanceof ApiRequestError) return err.message;
	if (err instanceof Error) return err.message;
	return String(err);
}

/**
 * `fetch` against the API with JSON helpers. Uses `apiPath` for relative URLs.
 */
function shouldAttemptAuthRefreshRetry(path: string): boolean {
	const p = path.includes("?") ? path.slice(0, path.indexOf("?")) : path;
	return (
		typeof window !== "undefined" &&
		!p.endsWith("/auth/login") &&
		!p.endsWith("/auth/register") &&
		!p.endsWith("/auth/refresh") &&
		!p.endsWith("/auth/logout") &&
		!p.endsWith("/auth/verify-admin-mfa") &&
		!p.endsWith("/auth/resend-admin-mfa") &&
		!p.endsWith("/auth/setup-password") &&
		!p.endsWith("/auth/forgot-password") &&
		!p.endsWith("/auth/reset-password") &&
		!p.includes("/auth/student-invitation") &&
		!p.includes("/auth/password-reset")
	);
}

export async function apiFetch(path: string, init: ApiJsonInit = {}): Promise<Response> {
	const { body, headers, _authRetry, ...rest } = init;
	const hdrs = new Headers(headers);

	if (body !== undefined && body !== null && !(body instanceof FormData) && !hdrs.has("Content-Type")) {
		hdrs.set("Content-Type", "application/json");
	}

	const res = await fetch(resolveApiFetchUrl(path), {
		...rest,
		credentials: "include",
		headers: hdrs,
		body:
			body === undefined || body === null
				? undefined
				: body instanceof FormData || typeof body === "string"
					? (body as BodyInit)
					: JSON.stringify(body),
	});

	if (res.status === 401 && typeof window !== "undefined" && shouldAttemptAuthRefreshRetry(path)) {
		if (!_authRetry) {
			const refreshed = await tryRefreshAccessToken();
			if (refreshed === "rate_limited") {
				return res;
			}
			if (refreshed === "ok") {
				const retryHeaders = new Headers(headers);
				const token = loadAccountSession()?.accessToken;

				if (token) {
					retryHeaders.set("Authorization", `Bearer ${token}`);
				} else {
					retryHeaders.delete("Authorization");
				}

				return apiFetch(path, { ...init, _authRetry: true, headers: retryHeaders });
			}
		}
		revokeClientSessionAfterAuthorizationFailure();
	}

	return res;
}

/** Coalesce identical in-flight GET+JSON reads (e.g. React Strict Mode double-mount). */
const inFlightApiJson = new Map<string, Promise<unknown>>();

function apiJsonDedupeKey(path: string, init: ApiJsonInit): string | null {
	const method = (init.method ?? "GET").toUpperCase();
	if (method !== "GET") return null;
	if (init.body !== undefined && init.body !== null) return null;
	if (init.signal !== undefined) return null;
	const hdrs = new Headers(init.headers);
	const auth = hdrs.get("Authorization") ?? "";
	return `${resolveApiFetchUrl(path)}\u0000${auth}`;
}

async function apiJsonOnce<T>(path: string, init: ApiJsonInit = {}): Promise<T> {
	const res = await apiFetch(path, init);
	const text = await res.text();
	if (!res.ok) {
		let message = text || res.statusText;
		if (text) {
			try {
				const j = JSON.parse(text) as { message?: string };
				if (typeof j.message === "string" && j.message.trim()) {
					message = j.message.trim();
				}
			} catch {
				/* keep raw message */
			}
		}
		throw new ApiRequestError(message, res.status, text || undefined);
	}
	if (!text) {
		return undefined as T;
	}
	return JSON.parse(text) as T;
}

export async function apiJson<T>(path: string, init: ApiJsonInit = {}): Promise<T> {
	const key = apiJsonDedupeKey(path, init);
	if (!key) {
		return apiJsonOnce<T>(path, init);
	}
	const existing = inFlightApiJson.get(key);
	if (existing) {
		return existing as Promise<T>;
	}
	const created = apiJsonOnce<T>(path, init).finally(() => {
		inFlightApiJson.delete(key);
	});
	inFlightApiJson.set(key, created);
	return created;
}
