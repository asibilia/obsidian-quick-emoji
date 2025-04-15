import { select, text } from "@clack/prompts";
import chalk from "chalk";

async function main() {
	const type = (await select({
		message: "Select the type of change",
		options: [
			{ value: "fix", label: "fix: A bug fix" },
			{ value: "feat", label: "feat: A new feature" },
			{ value: "chore", label: "chore: Other changes" },
		],
	})) as string;

	const scope = (await select({
		message: "Select the scope",
		options: [
			{ value: "root", label: "root" },
			{ value: "plugin", label: "plugin" },
			{ value: "build", label: "build" },
			{ value: "docs", label: "docs" },
			{ value: "tests", label: "tests" },
			{ value: "version", label: "version" },
		],
	})) as string;

	const message = (await text({
		message: "Enter your commit message",
		validate: (value) => {
			if (!value) return "Please enter a commit message";
			return undefined;
		},
	})) as string;

	const commitMessage = `${type}(${scope}): ${message}`;

	// Add all changes
	const addProcess = Bun.spawn(["git", "add", "."]);
	await addProcess.exited;

	// Execute git commit command
	const commitProcess = Bun.spawn(["git", "commit", "-m", commitMessage]);
	const output = await new Response(commitProcess.stdout).text();
	await commitProcess.exited;

	if (commitProcess.exitCode === 0) {
		console.log("\n" + chalk.green("✓ Successfully committed changes"));
		console.log(chalk.green("└─ ") + chalk.dim.yellow(output.trim()));
	} else {
		console.error("\n" + chalk.red("✗ Failed to commit changes"));
		const errorOutput = await new Response(commitProcess.stderr).text();
		console.error(chalk.red("└─ ") + chalk.dim(errorOutput.trim()));
	}
}

main().catch(console.error);
