import { resolve } from "node:path";
import type {
	ExtensionAPI,
	ExtensionContext,
} from "@mariozechner/pi-coding-agent";
import type { HookEntry } from "./config.js";

export function normalizeEntry(
	entry: HookEntry,
): Extract<HookEntry, { command: string }> {
	if (typeof entry === "string") {
		return { command: entry };
	}
	return entry;
}

export async function runCommands(
	entries: readonly HookEntry[],
	cwd: string,
	pi: ExtensionAPI,
	ctx: ExtensionContext,
	eventName: string,
): Promise<void> {
	for (const entry of entries) {
		const {
			command,
			cwd: entryCwd,
			timeout = 30_000,
			print,
		} = normalizeEntry(entry);
		const resolvedCwd = entryCwd ? resolve(cwd, entryCwd) : cwd;

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
					`Hook [${eventName}] "${command}" failed (exit ${result.code})${errOutput ? `:\n  ↳ ${errOutput}` : ""}`,
					"error",
				);
			} else if (print) {
				const output = result.stdout.toString().trim();
				ctx.ui.notify(
					`Hook [${eventName}] "${command}" succeeded${output ? `:\n  ↳ ${output}` : ""}`,
					"info",
				);
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			ctx.ui.notify(
				`Hook [${eventName}] "${command}" error: ${message}`,
				"error",
			);
		}
	}
}
