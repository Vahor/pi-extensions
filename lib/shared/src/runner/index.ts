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
		const resolvedCwd = commandCwd ? resolve(cwd, commandCwd) : cwd;

		try {
			const result = await pi.exec("/bin/sh", ["-c", command], {
				cwd: resolvedCwd,
				timeout,
			});

			if (result.code !== 0) {
				const errOutput = (
					result.stderr.toString().trim() || result.stdout.toString().trim()
				).slice(0, 300);
				ctx.ui.notify(
					`${label} "${command}" failed (exit ${result.code})${errOutput ? `:\n  ↳ ${errOutput}` : ""}`,
					"error",
				);
			} else if (print) {
				const output = result.stdout.toString().trim();
				ctx.ui.notify(
					`${label} "${command}" succeeded${output ? `:\n  ↳ ${output}` : ""}`,
					"info",
				);
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			ctx.ui.notify(`${label} "${command}" error: ${message}`, "error");
		}
	}
}
