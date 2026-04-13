import path from "path";
import tailwind from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import runableAnalyticsPlugin from "./vite/plugins/runable-analytics-plugin";

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");
	const apiProxyTarget = env.VITE_API_PROXY_TARGET || "http://127.0.0.1:3002";

	return {
		plugins: [react(), runableAnalyticsPlugin(), tailwind()],
		resolve: {
			alias: {
				src: path.resolve(__dirname, "./src"),
				"@": path.resolve(__dirname, "./src"),
				"@core": path.resolve(__dirname, "./src/core"),
				"@modules": path.resolve(__dirname, "./src/modules"),
				"@shared": path.resolve(__dirname, "./src/shared"),
			},
		},
		server: {
			port: 5173,
			strictPort: true,
			allowedHosts: true,
			proxy: {
				"/api": {
					target: apiProxyTarget,
					changeOrigin: true,
				},
			},
		},
	};
});
