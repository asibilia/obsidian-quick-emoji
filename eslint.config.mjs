import js from "@eslint/js";
// import importPlugin from "eslint-plugin-import";
// import prettier from "eslint-plugin-prettier";
import globals from "globals";
import typescript from "typescript-eslint";
import { defineConfig } from "eslint/config";

export default defineConfig([
	{
		files: ["**/*.{js,mjs,cjs,ts}"],
		plugins: { js },
		extends: ["js/recommended"],
		// rules: {
		// 	// Import
		// 	"import/order": [
		// 		"error",
		// 		{
		// 			groups: ["builtin", "external", "internal", "sibling"],
		// 			pathGroups: [
		// 				{
		// 					pattern: "obsidian",
		// 					group: "external",
		// 					position: "before",
		// 				},
		// 				{
		// 					pattern: "~/**",
		// 					group: "internal",
		// 				},
		// 			],
		// 			pathGroupsExcludedImportTypes: ["obsidian"],
		// 			"newlines-between": "always",
		// 			alphabetize: {
		// 				order: "asc",
		// 				caseInsensitive: true,
		// 			},
		// 		},
		// 	],
		// 	// Prettier
		// 	"prettier/prettier": [
		// 		"error",
		// 		{
		// 			semi: false,
		// 			singleQuote: true,
		// 			trailingComma: "es5",
		// 			endOfLine: "lf",
		// 			printWidth: 80,
		// 			tabWidth: 4,
		// 		},
		// 	],
		// },
	},
	{
		files: ["**/*.{js,mjs,cjs,ts}"],
		languageOptions: { globals: globals.browser },
	},
	...typescript.configs.recommended,
]);
