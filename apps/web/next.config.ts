import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
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
};

export default nextConfig;
