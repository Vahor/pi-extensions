import type {
	ExtensionAPI,
	ExtensionContext,
} from "@mariozechner/pi-coding-agent";
import { type KeyId, matchesKey } from "@mariozechner/pi-tui";
import { readConfig } from "@vahor/shared/config";
import { runCommands } from "@vahor/shared/runner";
import {
	buildTrie,
	flattenTrieChildren,
	type TrieNode,
} from "@vahor/shared/trie";
import { Effect } from "effect";
import type { KeymapEntry, KeymapsConfig } from "./config.js";
import { KeymapsConfigSchema } from "./config.js";
import { type LeaderEntry, WhichKeyOverlay } from "./which-key.js";

function loadConfig(cwd: string): KeymapsConfig {
	return Effect.runSync(readConfig("keymap.json", KeymapsConfigSchema, cwd));
}

export default function (pi: ExtensionAPI) {
	pi.on("session_start", (_event, ctx) => {
		const cwd = process.cwd();
		const config = loadConfig(cwd);

		const directKeymaps = config.keymaps.filter((k) => !k.leader);
		const leaderEntries = config.keymaps.filter((k) => k.leader);

		const { root, conflicts } = buildTrie<KeymapEntry>(
			leaderEntries.map((k) => ({ key: k.leaderKey, payload: k })),
		);

		for (const km of directKeymaps) {
			pi.registerShortcut(km.leaderKey as KeyId, {
				description: km.description ?? km.commands[0]?.command,
				handler: () => runCommands(km.commands, cwd, pi, ctx, "keymap"),
			});
		}

		for (const conflict of conflicts) {
			ctx.ui.notify(conflict, "warning");
		}

		if (root.children.size === 0) return;

		let leaderPressed = false;

		const unsubscribe = ctx.ui.onTerminalInput((data: string) => {
			if (!leaderPressed && matchesKey(data, config.leader as KeyId)) {
				leaderPressed = true;
				showLevel(ctx, root, "", config.leader, pi, cwd, () => {
					leaderPressed = false;
				});
				return { consume: true };
			}
			return;
		});

		pi.on("session_shutdown", () => {
			unsubscribe();
		});
	});
}

function showLevel(
	ctx: ExtensionContext,
	node: TrieNode<KeymapEntry>,
	prefixPath: string,
	leaderKey: string,
	pi: ExtensionAPI,
	cwd: string,
	onDone: () => void,
): void {
	const entries: LeaderEntry[] = flattenTrieChildren(node).map((c) => ({
		key: c.key,
		label:
			c.payload?.description ?? c.payload?.commands[0]?.command ?? "",
		commands: c.payload ? [...c.payload.commands] : [],
	}));

	const displayPrefix = prefixPath
		? `<${leaderKey}>${prefixPath}`
		: `<${leaderKey}>`;

	void ctx.ui.custom<void>((_tui, theme, _kb, done) => {
		const overlay = new WhichKeyOverlay(
			theme,
			entries,
			(child) => {
				const childNode = node.children.get(child.key);
				if (!childNode) {
					done();
					onDone();
					return;
				}

				if (childNode.children.size > 0) {
					done();
					showLevel(
						ctx,
						childNode,
						`${prefixPath}${child.key}`,
						leaderKey,
						pi,
						cwd,
						onDone,
					);
				} else if (childNode.payload) {
					done();
					onDone();
					void runCommands(
						childNode.payload.commands,
						cwd,
						pi,
						ctx,
						`keymap <leader>${prefixPath}${child.key}`,
					);
				}
			},
			() => {
				done();
				onDone();
			},
			displayPrefix,
		);

		return {
			render: (w: number) => overlay.render(w),
			handleInput: (data: string) => overlay.handleInput(data),
			invalidate: () => overlay.invalidate(),
		};
	});
}
