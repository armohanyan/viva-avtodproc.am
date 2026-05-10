import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";
import path from "path";

/** Monorepo client root (`client/`) — same as `outputFileTracingRoot`. Next only auto-loads `.env*` from `apps/web`. */
const clientRoot = path.join(__dirname, "../..");
loadEnvConfig(clientRoot);

/** Same rule as `src/lib/apiBaseUrl.ts` `normalizeApiBaseUrl` — rewrites append `/api/:path*`. */
function normalizeBackendOrigin(s: string): string {
	const t = s.replace(/\/+$/, "");
	if (t.endsWith("/api")) {
		return t.slice(0, -4);
	}
	return t;
}

/**
 * Where the Next server can reach Express for rewrites (Docker: `http://backend:3001`).
 * Order matches `vite.config.ts` intent: internal URL first, then public API base, then Vite proxy target from `client/.env`.
 * Must be origin only (no `/api`); rewrites append `/api/:path*`.
 */
function backendProxyOrigin(): string {
	const internal = process.env.INTERNAL_API_BASE_URL?.trim();
	if (internal) {
		return normalizeBackendOrigin(internal);
	}
	const publicBase = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
	if (publicBase) {
		return normalizeBackendOrigin(publicBase);
	}
	const viteProxy = process.env.VITE_API_PROXY_TARGET?.trim();
	if (viteProxy) {
		return normalizeBackendOrigin(viteProxy);
	}
	return "http://127.0.0.1:3001";
}

const nextConfig: NextConfig = {
  /** Baseline HTTP headers for security review / acquiring partner questionnaires. */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
    ];
  },
  output: "standalone",
  // Monorepo: trace files from repo root so production `next start` / standalone
  // bundles include code and deps pulled in from `../../src`.
  outputFileTracingRoot: path.join(__dirname, "../.."),
  experimental: {
    externalDir: true,
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      src: path.resolve(__dirname, "../../src"),
    };
    return config;
  },
  turbopack: {
    root: path.resolve(__dirname, "../.."),
    resolveAlias: {
      src: path.resolve(__dirname, "../../src"),
    },
  },
  /**
   * Mirror `client/vite.config.ts` server proxy so production `next start` works like Vite dev:
   * - `/api/*` → Express (`/api/v1/...`, `/api/admin/...`)
   * - `/upload/*` → staff static files (same-origin `/upload/…` in the UI)
   */
  async rewrites() {
    const api = backendProxyOrigin();
    return [
      { source: "/api/:path*", destination: `${api}/api/:path*` },
      { source: "/upload/:path*", destination: `${api}/upload/:path*` },
    ];
  },
};

export default nextConfig;
