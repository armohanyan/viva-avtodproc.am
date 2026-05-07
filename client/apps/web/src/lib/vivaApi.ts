import { API_V1_PREFIX } from "src/constants/api.constants";
import { apiFetch, apiJson, getApiErrorMessage, type ApiJsonInit } from "src/lib/api";
import { loadAccountSession } from "src/modules/accounts/account.session";

function v1Path(suffix: string): string {
	const s = suffix.startsWith("/") ? suffix : `/${suffix}`;
	return `${API_V1_PREFIX}${s}`;
}

export function getStoredAccessToken(): string | null {
	const u = loadAccountSession();
	return u?.accessToken ?? null;
}

function withAuthHeaders(init: ApiJsonInit = {}): ApiJsonInit {
	const token = getStoredAccessToken();
	const headers = new Headers(init.headers);
	if (token && !headers.has("Authorization")) {
		headers.set("Authorization", `Bearer ${token}`);
	}
	return { ...init, headers };
}

/** `fetch` to `/api/v1/...` with optional Bearer token from the saved session. */
export function vivaApiFetch(suffix: string, init: ApiJsonInit = {}): Promise<Response> {
	return apiFetch(v1Path(suffix), withAuthHeaders(init));
}

export async function vivaApiJson<T>(suffix: string, init: ApiJsonInit = {}): Promise<T> {
	return apiJson<T>(v1Path(suffix), withAuthHeaders(init));
}

export { getApiErrorMessage };
