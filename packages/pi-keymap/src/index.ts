import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { FileNotFoundError, readConfig } from "@vahor/shared/config";
import { registerCommandRenderer } from "@vahor/shared/runner";
import { Effect } from "effect";
import type { KeymapsConfig } from "./config.js";
import { EmptyKeymapsConfig, KeymapsConfigSchema } from "./config.js";
import { isValidKey } from "./keys.js";
import { registerDirectKeymaps, registerLeaderKeymaps } from "./shortcuts.js";
import { validateKeymaps } from "./validation.js";

function loadConfig(cwd: string): KeymapsConfig | undefined {
	return Effect.runSync(
		readConfig("keymap.json", KeymapsConfigSchema, cwd, {
			createIfMissing: EmptyKeymapsConfig,
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

	pi.on("session_start", (_event, ctx) => {
		const cwd = process.cwd();
		const config = loadConfig(cwd);
		if (!config) {
			ctx.ui.notify(
				"keymap: config not found (.pi/keymap.json); extension disabled",
				"warning",
			);
			return;
		}

		const leaderIsValid = isValidKey(config.leader);
		if (!leaderIsValid) {
			ctx.ui.notify(
				`keymap: leader key "${config.leader}" is invalid`,
				"warning",
			);
		}

		const { direct, leader } = validateKeymaps(config.keymaps, ctx);

		registerDirectKeymaps(direct, cwd, pi, ctx);
		if (leaderIsValid) registerLeaderKeymaps(leader, config, cwd, pi, ctx);
	});
}
