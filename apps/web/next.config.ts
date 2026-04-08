import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
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
