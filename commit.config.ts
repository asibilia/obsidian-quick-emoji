import { type CommitConfig } from '@alecsibilia/commit'

const config: CommitConfig = {
	types: [
		{ value: 'fix', label: 'fix: A bug fix' },
		{ value: 'feat', label: 'feat: A new feature' },
		{ value: 'chore', label: 'chore: Other changes' },
	],
	scopes: [
		{ value: 'root', label: 'root' },
		{ value: 'plugin', label: 'plugin' },
		{ value: 'build', label: 'build' },
		{ value: 'docs', label: 'docs' },
		{ value: 'tests', label: 'tests' },
		{ value: 'version', label: 'version' },
		{ value: 'tasks', label: 'tasks' },
	],
	git: {
		auto_add_all: true,
		auto_push: false,
	},
}

export default config
