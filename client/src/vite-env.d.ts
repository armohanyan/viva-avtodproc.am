/// <reference types="vite/client" />

interface ImportMetaEnv {
	/** Full API origin (no trailing slash). Unset in dev → same-origin + Vite `/api` proxy. */
	readonly VITE_API_BASE_URL?: string;
	/** Dev-only: where Vite proxies `/api` (default `http://127.0.0.1:3002`). */
	readonly VITE_API_PROXY_TARGET?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
