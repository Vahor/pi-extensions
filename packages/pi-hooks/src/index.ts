/**
 * Command Hooks Extension
 *
 * Runs shell commands in response to pi events, configured via
 * `.pi/hooks.json` (project) or `~/.pi/agent/hooks.json` (global).
 *
 * Project config overrides global config per-event.
 *
 * When a command exits with a non-zero code, an error notification is shown in
 * the pi UI with the command name, exit code, and captured stderr/stdout.
 *
 * ## Config format (JSON):
 *
 * ```json
 * {
 *   "hooks": {
 *     "tool_call": [
 *       "echo 'tool called'",
 *       { "command": "bun run lint", "cwd": ".", "timeout": 30000 }
 *     ],
 *     "turn_end": ["bun run typecheck"],
 *     "session_shutdown": ["echo 'bye'"]
 *   }
 * }
 * ```
 *
 * Each hook entry can be a plain string (command) or an object with:
 * - `command` (required): the shell command to run
 * - `cwd` (optional): working directory, relative to project root
 * - `timeout` (optional): timeout in milliseconds (default: 30_000)
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { readConfig } from "@vahor/shared/config";
import { Effect } from "effect";
import { CommandHooksConfigSchema, PiEvent } from "./config.js";
import { runCommands } from "./runner.js";

function loadConfig(cwd: string) {
	return Effect.runSync(
		readConfig("hooks.json", CommandHooksConfigSchema, cwd),
	);
}

export default function (pi: ExtensionAPI) {
	const cwd = process.cwd();
	const config = loadConfig(cwd);

	if (!config.hooks || Object.keys(config.hooks).length === 0) {
		return;
	}

	for (const eventName of PiEvent.literals) {
		const entries = config.hooks[eventName];
		if (!entries || entries.length === 0) continue;

		pi.on(eventName as Parameters<typeof pi.on>[0], async (_event, ctx) => {
			await runCommands(entries, cwd, pi, ctx, eventName);
		});
	}
}
