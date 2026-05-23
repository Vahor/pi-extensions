import { resolve } from "node:path";
import type {
	ExtensionAPI,
	ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import type { CommandEntry } from "./config.js";
import { formatContextMessage } from "./context.js";
import { runInteractiveCommand } from "./interactive.js";
import { buildRenderedOutput, renderCommandResult } from "./renderer.js";
import { startCommandSpinner } from "./spinner.js";
import type { CommandResult } from "./types.js";

export type { CommandEntry } from "./config.js";
export { registerCommandRenderer } from "./renderer.js";
export type { CommandResult } from "./types.js";

function resultFromError(error: unknown): CommandResult {
	return {
		code: 1,
		stdout: "",
		stderr: error instanceof Error ? error.message : String(error),
	};
}

function handleCommandResult(
	pi: ExtensionAPI,
	ctx: ExtensionContext,
	options: {
		command: string;
		cwd: string;
		print: boolean;
		context: boolean | undefined;
		result: CommandResult;
	},
): void {
	const { command, cwd, print, context, result } = options;

	if (!print && !context) return;

	const content = context ? formatContextMessage(command, cwd, result) : "";
	renderCommandResult(
		pi,
		ctx,
		{
			command,
			cwd,
			code: result.code,
			output: buildRenderedOutput(result),
			includeInContext: context === true,
			silent: !print,
		},
		{ content, display: print },
	);
}

async function executeCommand(
	entry: CommandEntry,
	cwd: string,
	pi: ExtensionAPI,
	ctx: ExtensionContext,
): Promise<{ cwd: string; result: CommandResult }> {
	const resolvedCwd = entry.cwd ? resolve(cwd, entry.cwd) : cwd;

	if (entry.interactive) {
		return {
			cwd: resolvedCwd,
			result: await runInteractiveCommand(
				entry.command,
				resolvedCwd,
				ctx,
				entry.timeout ?? 30_000,
			),
		};
	}

	const shell = process.env.SHELL || "/bin/sh";
	return {
		cwd: resolvedCwd,
		result: await pi.exec(shell, ["-c", entry.command], {
			cwd: resolvedCwd,
			timeout: entry.timeout ?? 30_000,
		}),
	};
}

export async function runCommands(
	commands: readonly CommandEntry[],
	cwd: string,
	pi: ExtensionAPI,
	ctx: ExtensionContext,
): Promise<void> {
	for (const entry of commands) {
		const print = entry.print ?? true;
		const stopSpinner = entry.interactive
			? () => {}
			: startCommandSpinner(ctx, entry.command, !print);

		try {
			const { cwd: commandCwd, result } = await executeCommand(
				entry,
				cwd,
				pi,
				ctx,
			);
			handleCommandResult(pi, ctx, {
				command: entry.command,
				cwd: commandCwd,
				print,
				context: entry.context,
				result,
			});
		} catch (error) {
			handleCommandResult(pi, ctx, {
				command: entry.command,
				cwd: entry.cwd ? resolve(cwd, entry.cwd) : cwd,
				print,
				context: entry.context,
				result: resultFromError(error),
			});
		} finally {
			stopSpinner();
		}
	}
}
