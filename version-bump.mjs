import { readFileSync, writeFileSync } from 'fs'
import process from 'process'

import { intro, outro, select, confirm, cancel } from '@clack/prompts'
import chalk from 'chalk'

function bumpVersion(version, type) {
	const parts = version.split('.').map(Number)
	switch (type) {
		case 'major':
			return `${parts[0] + 1}.0.0`
		case 'minor':
			return `${parts[0]}.${parts[1] + 1}.0`
		case 'patch':
		default:
			return `${parts[0]}.${parts[1]}.${parts[2] + 1}`
	}
}

// Get version bump type from command line argument OR prompt user
let bumpType = process.argv[2]
const validBumpTypes = ['patch', 'minor', 'major']

if (!bumpType || !validBumpTypes.includes(bumpType)) {
	intro(chalk.bgBlue(' Version Bump '))

	// Read current version to show in prompt
	const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
	const currentVersion = packageJson.version

	bumpType = await select({
		message: `Current version is ${chalk.cyan(currentVersion)}. What type of version bump?`,
		options: [
			{
				value: 'patch',
				label: 'Patch',
				hint: `Bug fixes (${currentVersion} → ${bumpVersion(currentVersion, 'patch')})`,
			},
			{
				value: 'minor',
				label: 'Minor',
				hint: `New features (${currentVersion} → ${bumpVersion(currentVersion, 'minor')})`,
			},
			{
				value: 'major',
				label: 'Major',
				hint: `Breaking changes (${currentVersion} → ${bumpVersion(currentVersion, 'major')})`,
			},
		],
	})

	if (bumpType === undefined) {
		cancel('Version bump cancelled')
		process.exit(0)
	}
}

// Read and update package.json version
let packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
const oldVersion = packageJson.version
const targetVersion = bumpVersion(oldVersion, bumpType)
packageJson.version = targetVersion
writeFileSync('package.json', JSON.stringify(packageJson, null, '\t'))

// read minAppVersion from manifest.json and bump version to target version
let manifest = JSON.parse(readFileSync('manifest.json', 'utf8'))
const { minAppVersion } = manifest
manifest.version = targetVersion
writeFileSync('manifest.json', JSON.stringify(manifest, null, '\t'))

// update versions.json with target version and minAppVersion from manifest.json
let versions = JSON.parse(readFileSync('versions.json', 'utf8'))
versions[targetVersion] = minAppVersion
writeFileSync('versions.json', JSON.stringify(versions, null, '\t'))

// Show completion message
outro(
	chalk.green(
		`✓ Version bumped from ${chalk.cyan(oldVersion)} to ${chalk.cyan(targetVersion)} (${chalk.yellow(bumpType)})`
	)
)
