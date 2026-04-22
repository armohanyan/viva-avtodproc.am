import type { NextConfig } from "next";
import path from "path";

/** Where the Next server can reach Express (Docker: `http://backend:3001`; local: unset → 127.0.0.1:3001). */
function uploadProxyOrigin(): string {
	const internal = process.env.INTERNAL_API_BASE_URL?.trim();
	if (internal) {
		return internal.replace(/\/+$/, "");
	}
	const publicBase = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
	if (publicBase) {
		return publicBase.replace(/\/+$/, "");
	}
	return "http://127.0.0.1:3001";
}

const nextConfig: NextConfig = {
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
   * Staff uploads return `{API_PUBLIC_URL}/upload/…` (often the marketing origin in dev).
   * The Vite panel proxies `/upload` to the API; Next must do the same or image URLs 404.
   */
  async rewrites() {
    const api = uploadProxyOrigin();
    return [{ source: "/upload/:path*", destination: `${api}/upload/:path*` }];
  },
};

export default nextConfig;
