import { API_V1_PREFIX } from "src/constants/api";
import { loadAccountSession, saveAccountSession } from "src/modules/accounts/account.session";
import type { AccountSessionUser, AccountType } from "src/modules/accounts/account.types";

function isAccountType(v: string): v is AccountType {
	return v === "super_admin" || v === "admin" || v === "instructor" || v === "student";
}

/** Same-origin as `api.ts` when `VITE_API_BASE_URL` is unset (Vite proxy). */
function authV1Url(suffix: string): string {
	const meta = import.meta as ImportMeta & { env?: { VITE_API_BASE_URL?: string } };
	const base = meta.env?.VITE_API_BASE_URL?.trim().replace(/\/+$/, "") ?? "";
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

let inFlight: Promise<boolean> | null = null;

/**
 * Uses httpOnly refresh cookie; on success persists access token + user in local session.
 */
export async function tryRefreshAccessToken(): Promise<boolean> {
	if (inFlight) {
		return inFlight;
	}
	inFlight = (async () => {
		try {
			const res = await fetch(authRefreshUrl(), { method: "POST", credentials: "include" });
			const text = await res.text();

			if (!res.ok) {
				return false;
			}

			const data = JSON.parse(text) as {
				accessToken?: string;
				user?: { id: string; email: string; name: string; accountType: string };
			};

			if (!data.accessToken || !data.user || !isAccountType(data.user.accountType)) {
				return false;
			}

			const next: AccountSessionUser = {
				id: data.user.id,
				email: data.user.email,
				name: data.user.name,
				accountType: data.user.accountType,
				accessToken: data.accessToken,
			};
			saveAccountSession(next);
			return true;
		} catch {
			return false;
		} finally {
			inFlight = null;
		}
	})();
	return inFlight;
}
