import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite"
import path from "path";
import runableAnalyticsPlugin from "./vite/plugins/runable-analytics-plugin";

export default defineConfig({
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
		allowedHosts: true,
	}
});
