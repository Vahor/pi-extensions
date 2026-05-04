import { resolve } from "node:path";
import type {
	ExtensionAPI,
	ExtensionContext,
} from "@mariozechner/pi-coding-agent";

export interface CommandEntry {
	command: string;
	cwd?: string;
	timeout?: number;
	print?: boolean;
}

const spinnerFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
let spinnerId = 0;

function formatCommand(command: string): string {
	return command.length > 60 ? `${command.slice(0, 57)}...` : command;
}

function startCommandSpinner(
	ctx: ExtensionContext,
	command: string,
	index: number,
): () => void {
	if (!ctx.hasUI) return () => {};

	const statusKey = `runner:${index}`;
	const theme = ctx.ui.theme;
	const text = `${theme.fg("dim", `[${index}] `)}${theme.fg("bashMode", formatCommand(command))}`;
	let frameIndex = 0;

	const render = (): void => {
		const frame = theme.fg("accent", spinnerFrames[frameIndex] ?? "⠋");
		ctx.ui.setStatus(statusKey, `${frame} ${text}`);
		frameIndex = (frameIndex + 1) % spinnerFrames.length;
	};

	render();
	const timer = setInterval(render, 100);

	return () => {
		clearInterval(timer);
		ctx.ui.setStatus(statusKey, undefined);
	};
}

export async function runCommands(
	commands: readonly CommandEntry[],
	cwd: string,
	pi: ExtensionAPI,
	ctx: ExtensionContext,
	label: string,
): Promise<void> {
	for (const {
		command,
		cwd: commandCwd,
		timeout = 30_000,
		print,
	} of commands) {
		const index = ++spinnerId;
		const notifyLabel = `[${index}] ${label}`;
		const resolvedCwd = commandCwd ? resolve(cwd, commandCwd) : cwd;

		const stopSpinner = startCommandSpinner(ctx, command, index);

		try {
			const result = await pi.exec("/bin/sh", ["-c", command], {
				cwd: resolvedCwd,
				timeout,
			});

			const output = (
				result.stderr.toString().trim() || result.stdout.toString().trim()
			).slice(0, 300);
			if (result.code !== 0) {
				ctx.ui.notify(
					`${notifyLabel} "${command}" failed (exit ${result.code})${output ? `:\n  ↳ ${output}` : ""}`,
					"error",
				);
			} else if (print) {
				ctx.ui.notify(
					`${notifyLabel} "${command}" succeeded${output ? `:\n  ↳ ${output}` : ""}`,
					"info",
				);
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			ctx.ui.notify(`${notifyLabel} "${command}" error: ${message}`, "error");
		} finally {
			stopSpinner();
		}
	}
}
