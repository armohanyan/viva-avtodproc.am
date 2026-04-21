function trimTrailingSlashes(s: string): string {
	return s.replace(/\/+$/, "");
}

function viteApiBaseUrl(): string | undefined {
	const meta = import.meta as ImportMeta & { env?: { VITE_API_BASE_URL?: string } };
	return meta.env?.VITE_API_BASE_URL?.trim();
}

/**
 * Base URL for the REST API (no trailing slash).
 * - Leave `VITE_API_BASE_URL` unset in dev to use same-origin requests; Vite proxies `/api` to Express.
 * - Set `VITE_API_BASE_URL` when the UI and API run on different origins (e.g. production).
 * - Next.js: set `NEXT_PUBLIC_API_BASE_URL` (browser → API) and `INTERNAL_API_BASE_URL` for server-side fetches in Docker.
 */
export function getApiBaseUrl(): string {
	const isServer = typeof window === "undefined";

	if (isServer) {
		const internal =
			typeof process !== "undefined" && process.env.INTERNAL_API_BASE_URL
				? process.env.INTERNAL_API_BASE_URL.trim()
				: "";
		if (internal) {
			return trimTrailingSlashes(internal);
		}
	}

	const fromNext =
		typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_BASE_URL
			? process.env.NEXT_PUBLIC_API_BASE_URL.trim()
			: "";
	if (fromNext) {
		return trimTrailingSlashes(fromNext);
	}
	const fromVite = viteApiBaseUrl();
	if (fromVite) {
		return trimTrailingSlashes(fromVite);
	}
	return "";
}
