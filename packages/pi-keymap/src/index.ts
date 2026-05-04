import type {
	ExtensionAPI,
	ExtensionContext,
} from "@mariozechner/pi-coding-agent";
import { type KeyId, matchesKey } from "@mariozechner/pi-tui";
import { FileNotFoundError, readConfig } from "@vahor/shared/config";
import { runCommands } from "@vahor/shared/runner";
import {
	buildTrie,
	flattenTrieChildren,
	type TrieNode,
} from "@vahor/shared/trie";
import { Effect } from "effect";
import type { KeymapCommand, KeymapEntry, KeymapsConfig } from "./config.js";
import { KeymapsConfigSchema } from "./config.js";
import { isValidKey } from "./keys.js";
import { type LeaderEntry, WhichKeyOverlay } from "./which-key.js";

function loadConfig(cwd: string): KeymapsConfig | undefined {
	return Effect.runSync(
		readConfig("keymap.json", KeymapsConfigSchema, cwd).pipe(
			Effect.catchIf(
				(error) => error instanceof FileNotFoundError,
				() => Effect.succeed(undefined),
			),
		),
	);
}

interface ValidatedKeymaps {
	direct: KeymapEntry[];
	leader: KeymapEntry[];
}

type LeaderAction =
	| { type: "prefix"; key: string }
	| { type: "run"; commands: readonly KeymapCommand[]; label: string };

function validateKeymaps(
	entries: readonly KeymapEntry[],
	ctx: ExtensionContext,
): ValidatedKeymaps {
	const direct: KeymapEntry[] = [];
	const leader: KeymapEntry[] = [];

	for (const km of entries) {
		if (!km.leader) {
			if (!isValidKey(km.leaderKey)) {
				ctx.ui.notify(`keymap: key "${km.leaderKey}" is invalid`, "warning");
				continue;
			}
			if (!km.commands) {
				ctx.ui.notify(
					`keymap: "${km.leaderKey}" has no commands (direct keymaps must have commands)`,
					"warning",
				);
				continue;
			}
			direct.push(km);
		} else {
			let invalid = false;
			for (const ch of km.leaderKey) {
				if (!isValidKey(ch)) {
					ctx.ui.notify(
						`keymap: leader sub-key "${ch}" in "<leader>${km.leaderKey}" is invalid`,
						"warning",
					);
					invalid = true;
				}
			}
			if (!invalid) leader.push(km);
		}
	}

	return { direct, leader };
}

function warnDeadEnds(
	node: TrieNode<KeymapEntry>,
	path: string,
	ctx: ExtensionContext,
): void {
	for (const child of node.children.values()) {
		const childPath = `${path}${child.segment}`;
		if (!child.payload?.commands?.length && child.children.size === 0) {
			ctx.ui.notify(
				`keymap: "${childPath}" has no commands and no children`,
				"warning",
			);
		}
		warnDeadEnds(child, childPath, ctx);
	}
}

export default function (pi: ExtensionAPI) {
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

		if (!isValidKey(config.leader)) {
			ctx.ui.notify(
				`keymap: leader key "${config.leader}" is invalid`,
				"warning",
			);
		}

		const { direct, leader } = validateKeymaps(config.keymaps, ctx);

		const { root, conflicts } = buildTrie<KeymapEntry>(
			leader.map((k) => ({ key: k.leaderKey, payload: k })),
		);

		warnDeadEnds(root, "<leader>", ctx);

		for (const km of direct) {
			pi.registerShortcut(km.leaderKey as KeyId, {
				description: km.description ?? km.commands?.[0]?.command,
				handler: () => runCommands(km.commands ?? [], cwd, pi, ctx, "keymap"),
			});
		}

		for (const conflict of conflicts) {
			ctx.ui.notify(conflict, "warning");
		}

		if (root.children.size === 0) return;

		let leaderPressed = false;

		const unsubscribe = ctx.ui.onTerminalInput((data: string) => {
			if (leaderPressed) return;
			if (!matchesKey(data, config.leader as KeyId)) return;
			// Only trigger when editor is empty (not while typing)
			if (ctx.hasUI && ctx.ui.getEditorText().trim() !== "") return;

			leaderPressed = true;
			showLevel(ctx, root, "", config.leader, pi, cwd, () => {
				leaderPressed = false;
			});
			return { consume: true };
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
		label: c.payload?.description ?? c.payload?.commands?.[0]?.command ?? "",
		commands: c.payload?.commands ?? [],
	}));

	const displayPrefix = prefixPath
		? `<${leaderKey}>${prefixPath}`
		: `<${leaderKey}>`;

	void ctx.ui
		.custom<LeaderAction | undefined>(
			(_tui, theme, _kb, done) => {
				const overlay = new WhichKeyOverlay(
					theme,
					entries,
					(child) => {
						const childNode = node.children.get(child.key);
						if (!childNode) {
							done(undefined);
							return;
						}

						if (childNode.children.size > 0) {
							done({ type: "prefix", key: child.key });
						} else if (childNode.payload?.commands?.length) {
							done({
								type: "run",
								commands: childNode.payload.commands,
								label: `keymap <leader>${prefixPath}${child.key}`,
							});
						} else {
							done(undefined);
						}
					},
					() => done(undefined),
					displayPrefix,
				);

				return {
					render: (w: number) => overlay.render(w),
					handleInput: (data: string) => overlay.handleInput(data),
					invalidate: () => overlay.invalidate(),
					dispose: () => overlay.dispose(),
				};
			},
			{
				overlay: true,
				overlayOptions: {
					anchor: "bottom-center",
					width: "90%",
					margin: { bottom: 4 },
				},
			},
		)
		.then((action) => {
			if (!action) {
				onDone();
				return;
			}

			if (action.type === "prefix") {
				const childNode = node.children.get(action.key);
				if (!childNode) {
					onDone();
					return;
				}

				showLevel(
					ctx,
					childNode,
					`${prefixPath}${action.key}`,
					leaderKey,
					pi,
					cwd,
					onDone,
				);
				return;
			}

			onDone();
			setTimeout(() => {
				void runCommands(action.commands, cwd, pi, ctx, action.label);
			}, 5);
		})
		.catch((error) => {
			onDone();
			const message = error instanceof Error ? error.message : String(error);
			ctx.ui.notify(`keymap overlay error: ${message}`, "error");
		});
}
