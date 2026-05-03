import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import type { KeyId } from "@mariozechner/pi-tui";
import { readConfig } from "@vahor/shared/config";
import { runCommands } from "@vahor/shared/runner";
import { Effect } from "effect";
import type { HotkeysConfig } from "./config.js";
import { HotkeysConfigSchema } from "./config.js";

function loadConfig(cwd: string): HotkeysConfig {
	return Effect.runSync(readConfig("hotkeys.json", HotkeysConfigSchema, cwd));
}

export default function (pi: ExtensionAPI) {
	const cwd = process.cwd();
	const config = loadConfig(cwd);

	if (!config.hotkeys || config.hotkeys.length === 0) {
		return;
	}

	for (const { key, commands } of config.hotkeys) {
		if (!key || !commands || commands.length === 0) continue;

		pi.registerShortcut(key as KeyId, {
			description: commands
				.map((c) => (typeof c === "string" ? c : c.command))
				.join("; "),
			handler: async (ctx) => {
				await runCommands(commands, cwd, pi, ctx, `Hotkey [${key}]`);
			},
		});
	}
}
