import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwind from "@tailwindcss/vite"
import path from "path";
import runableAnalyticsPlugin from "./vite/plugins/runable-analytics-plugin";

export default defineConfig({
	plugins: [react(), runableAnalyticsPlugin(), cloudflare(), tailwind()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src/web"),
			"@core": path.resolve(__dirname, "./src/web/core"),
			"@modules": path.resolve(__dirname, "./src/web/modules"),
			"@shared": path.resolve(__dirname, "./src/web/shared"),
		},
	},
	server: {
		allowedHosts: true,
	}
});
