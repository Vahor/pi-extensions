import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { FileNotFoundError, readConfig } from "@vahor/shared/config";
import { registerCommandRenderer, runCommands } from "@vahor/shared/runner";
import { Effect } from "effect";
import type { CommandHooksConfig } from "./config.js";
import {
	CommandHooksConfigSchema,
	EmptyCommandHooksConfig,
	PiEvent,
} from "./config.js";

function loadConfig(cwd: string): CommandHooksConfig | undefined {
	return Effect.runSync(
		readConfig("hooks.json", CommandHooksConfigSchema, cwd, {
			createIfMissing: EmptyCommandHooksConfig,
		}).pipe(
			Effect.catchIf(
				(error) => error instanceof FileNotFoundError,
				() => Effect.succeed(undefined),
			),
		),
	);
}

export default function (pi: ExtensionAPI) {
	registerCommandRenderer(pi);
	const cwd = process.cwd();
	const config = loadConfig(cwd);

	if (!config) {
		pi.on("session_start", (_event, ctx) => {
			ctx.ui.notify(
				"hooks: config not found (.pi/hooks.json); extension disabled",
				"warning",
			);
		});
		return;
	}

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
