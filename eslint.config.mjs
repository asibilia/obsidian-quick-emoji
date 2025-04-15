import js from '@eslint/js'
import { defineConfig } from 'eslint/config'
import importPlugin from 'eslint-plugin-import'
import prettier from 'eslint-plugin-prettier'
import globals from 'globals'
import typescript from 'typescript-eslint'

export default defineConfig([
	{
		files: ['**/*.{js,mjs,cjs,ts}'],
		plugins: { js, prettier, import: importPlugin },
		extends: ['js/recommended'],
	},
	{
		files: ['**/*.{js,mjs,cjs,ts}'],
		languageOptions: { globals: globals.browser },
	},
	...typescript.configs.recommended,
	// RULES
	{
		files: ['**/*.{js,mjs,cjs,ts}'],
		rules: {
			// Typescript
			'@typescript-eslint/no-unused-vars': [
				'warn',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
			],
			// Prettier
			'prettier/prettier': [
				'error',
				{
					semi: false,
					singleQuote: true,
					trailingComma: 'es5',
					endOfLine: 'lf',
					printWidth: 80,
					tabWidth: 4,
				},
			],
			// Import
			'import/order': [
				'error',
				{
					groups: ['builtin', 'external', 'internal', 'sibling'],
					pathGroups: [
						{
							pattern: 'obsidian',
							group: 'external',
							position: 'before',
						},
						{
							pattern: '~/**',
							group: 'internal',
						},
					],
					pathGroupsExcludedImportTypes: ['obsidian'],
					'newlines-between': 'always',
					alphabetize: {
						order: 'asc',
						caseInsensitive: true,
					},
				},
			],
		},
	},
])
