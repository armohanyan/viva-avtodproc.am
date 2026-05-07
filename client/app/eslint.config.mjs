import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
	{
		ignores: [
			"**/node_modules/**",
			"**/dist/**",
			"**/.vite/**",
			"../marketing/**",
			"**/coverage/**",
		],
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		files: ["src/**/*.{ts,tsx}"],
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.es2020,
			},
		},
		plugins: {
			"react-hooks": reactHooks,
			"react-refresh": reactRefresh,
		},
		rules: {
			...reactHooks.configs.recommended.rules,
			/** React Compiler preview rules: too noisy for this codebase until migration. */
			"react-hooks/set-state-in-effect": "off",
			"react-hooks/static-components": "off",
			"react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
			"@typescript-eslint/no-unused-vars": [
				"warn",
				{ argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
			],
			"@typescript-eslint/no-explicit-any": "warn",
		},
	},
	{
		files: ["vite.config.ts", "vite/**/*.ts"],
		languageOptions: {
			globals: {
				...globals.node,
			},
		},
	},
);
