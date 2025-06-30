#!/usr/bin/env node

import { execSync } from 'child_process'
import { readFileSync } from 'fs'
import process from 'process'

import chalk from 'chalk'

function log(message, type = 'info') {
	const colors = {
		info: chalk.blue,
		success: chalk.green,
		warning: chalk.yellow,
		error: chalk.red,
	}
	console.log(colors[type](`[${type.toUpperCase()}] ${message}`))
}

function runCommand(command, description) {
	log(`Running: ${description}`, 'info')
	try {
		execSync(command, { stdio: 'inherit' })
		log(`✓ ${description} completed`, 'success')
	} catch (error) {
		log(`✗ ${description} failed`, 'error')
		process.exit(1)
	}
}

function checkGitStatus() {
	log('Checking git status...', 'info')
	try {
		const status = execSync('git status --porcelain', { encoding: 'utf8' })
		if (status.trim()) {
			log(
				'Working directory is not clean. Please commit or stash changes first.',
				'error'
			)
			process.exit(1)
		}
		log('✓ Working directory is clean', 'success')
	} catch (error) {
		log('Failed to check git status', 'error')
		process.exit(1)
	}
}

function checkCurrentBranch() {
	log('Checking current branch...', 'info')
	try {
		const branch = execSync('git branch --show-current', {
			encoding: 'utf8',
		}).trim()
		if (branch !== 'main') {
			log(
				`Currently on branch '${branch}'. Please switch to 'main' branch first.`,
				'warning'
			)
			const answer = process.argv.includes('--force')
				? 'y'
				: execSync(
						'read -p "Continue anyway? (y/N): " answer && echo $answer',
						{ encoding: 'utf8', shell: true }
					).trim()
			if (answer.toLowerCase() !== 'y') {
				log('Publish cancelled', 'info')
				process.exit(0)
			}
		}
		log(`✓ Publishing from branch '${branch}'`, 'success')
	} catch (error) {
		log('Failed to check current branch', 'error')
		process.exit(1)
	}
}

function getCurrentVersion() {
	try {
		const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
		return packageJson.version
	} catch (error) {
		log('Failed to read current version from package.json', 'error')
		process.exit(1)
	}
}

async function main() {
	log('🚀 Starting publish process...', 'info')

	const currentVersion = getCurrentVersion()
	log(`Current version: ${currentVersion}`, 'info')

	// Get version bump type from command line argument
	const bumpType = process.argv[2] || 'patch'
	const validBumpTypes = ['patch', 'minor', 'major']

	if (!validBumpTypes.includes(bumpType)) {
		log(
			`Invalid bump type: ${bumpType}. Must be one of: ${validBumpTypes.join(', ')}`,
			'error'
		)
		process.exit(1)
	}

	log(`Bump type: ${bumpType}`, 'info')

	// Safety checks
	checkGitStatus()
	checkCurrentBranch()

	// Sync with remote
	runCommand('git fetch origin', 'Fetching latest changes from remote')

	// Build the project
	runCommand('pnpm run build', 'Building project')

	// Bump version and commit
	runCommand(
		`pnpm run version:${bumpType}`,
		`Bumping ${bumpType} version and committing`
	)

	// Get new version
	const newVersion = getCurrentVersion()
	log(`New version: ${newVersion}`, 'success')

	// Create and push tag
	runCommand('pnpm run tag', 'Creating and pushing git tag')

	// Push main branch
	runCommand('git push origin main', 'Pushing main branch')

	log(`🎉 Successfully published version ${newVersion}!`, 'success')
	log('The new version has been tagged and pushed to the repository.', 'info')
}

main().catch((error) => {
	log(`Publish failed: ${error.message}`, 'error')
	process.exit(1)
})
