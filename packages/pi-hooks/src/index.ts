import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { readConfig } from "@vahor/shared/config";
import { runCommands } from "@vahor/shared/runner";
import { Effect } from "effect";
import { CommandHooksConfigSchema, PiEvent } from "./config.js";

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
			await runCommands(entries, cwd, pi, ctx, `Hook [${eventName}]`);
		});
	}
}
