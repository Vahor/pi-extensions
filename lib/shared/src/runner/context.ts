import type { CommandResult } from "./types.js";

const MAX_CONTEXT_OUTPUT_LENGTH = 20_000;

function truncateContextOutput(output: string): string {
	if (output.length <= MAX_CONTEXT_OUTPUT_LENGTH) return output;

	const truncationNote = `…\n[output truncated to ${MAX_CONTEXT_OUTPUT_LENGTH} characters; showing tail]\n`;
	return `${truncationNote}${output.slice(
		-(MAX_CONTEXT_OUTPUT_LENGTH - truncationNote.length),
	)}`;
}

function escapeCodeFenceContent(output: string): string {
	return output.replaceAll("```", "`" + "\u200b" + "``");
}

export function formatContextMessage(
	command: string,
	cwd: string,
	result: CommandResult,
): string {
	const sections = [`Ran \`${command}\``, `Working directory: \`${cwd}\``];
	const stdout = escapeCodeFenceContent(truncateContextOutput(result.stdout));
	const stderr = escapeCodeFenceContent(truncateContextOutput(result.stderr));

	if (result.stdout) {
		sections.push(`stdout:\n\`\`\`\n${stdout}\n\`\`\``);
	}
	if (result.stderr) {
		sections.push(`stderr:\n\`\`\`\n${stderr}\n\`\`\``);
	}
	if (!result.stdout && !result.stderr) {
		sections.push("(no output)");
	}
	if (result.code !== 0) {
		sections.push(`Command exited with code ${result.code}.`);
	}

	return sections.join("\n\n");
}
