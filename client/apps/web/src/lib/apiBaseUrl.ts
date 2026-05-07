function trimTrailingSlashes(s: string): string {
	return s.replace(/\/+$/, "");
}

/**
 * API base must be an origin (or host:port) only. Request paths already start with `/api/...`
 * (e.g. `/api/v1/health`). If env mistakenly ends with `/api`, concatenation becomes `/api/api/...`.
 */
export function normalizeApiBaseUrl(base: string): string {
	const s = trimTrailingSlashes(base);
	if (s.endsWith("/api")) {
		return s.slice(0, -4);
	}
	return s;
}

function viteApiBaseUrl(): string | undefined {
	return import.meta.env.VITE_API_BASE_URL?.trim();
}

/**
 * Base URL for the REST API (no trailing slash, no `/api` suffix).
 * - Leave `VITE_API_BASE_URL` unset in dev to use same-origin requests; Vite proxies `/api` to Express.
 * - Set `VITE_API_BASE_URL` to the API host origin only, e.g. `https://app.example.com` (not `.../api`).
 * - Next.js: `NEXT_PUBLIC_API_BASE_URL` same rule; `INTERNAL_API_BASE_URL` is the backend origin for rewrites/SSR.
 */
export function getApiBaseUrl(): string {
	const isServer = typeof window === "undefined";

	if (isServer) {
		const internal =
			typeof process !== "undefined" && process.env.INTERNAL_API_BASE_URL
				? process.env.INTERNAL_API_BASE_URL.trim()
				: "";
		if (internal) {
			return normalizeApiBaseUrl(internal);
		}
	}

	const fromNext =
		typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_BASE_URL
			? process.env.NEXT_PUBLIC_API_BASE_URL.trim()
			: "";
	if (fromNext) {
		return normalizeApiBaseUrl(fromNext);
	}
	const fromVite = viteApiBaseUrl();
	if (fromVite) {
		return normalizeApiBaseUrl(fromVite);
	}
	return "";
}
