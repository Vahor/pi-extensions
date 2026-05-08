import type {
	ExtensionAPI,
	ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { type KeyId, matchesKey } from "@earendil-works/pi-tui";
import { FileNotFoundError, readConfig } from "@vahor/shared/config";
import { runCommands } from "@vahor/shared/runner";
import { buildTrie, type TrieNode } from "@vahor/shared/trie";
import { Effect } from "effect";
import type { KeymapEntry, KeymapsConfig } from "./config.js";
import { KeymapsConfigSchema } from "./config.js";
import { isValidKey } from "./keys.js";
import { showLevel } from "./ui.js";

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

function hasAction(entry: KeymapEntry | undefined): boolean {
	return Boolean(entry?.commands?.length || entry?.prompt !== undefined);
}

function getEntryLabel(entry: KeymapEntry): string {
	return (
		entry.description ?? entry.commands?.[0]?.command ?? entry.prompt ?? ""
	);
}

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
			if (!hasAction(km)) {
				ctx.ui.notify(
					`keymap: "${km.leaderKey}" has no commands or prompt (direct keymaps must have an action)`,
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
		if (!hasAction(child.payload) && child.children.size === 0) {
			ctx.ui.notify(
				`keymap: "${childPath}" has no commands, prompt, or children`,
				"warning",
			);
		}
		warnDeadEnds(child, childPath, ctx);
	}
}

function applyPrompt(
	pi: ExtensionAPI,
	ctx: ExtensionContext,
	content: string,
	send: boolean,
): void {
	if (send) {
		pi.sendUserMessage(content);
		return;
	}

	ctx.ui.setEditorText(content);
}

async function runPrompt(
	entry: KeymapEntry,
	pi: ExtensionAPI,
	ctx: ExtensionContext,
): Promise<void> {
	if (entry.prompt === undefined) return;

	if (entry.open === false) {
		if (entry.send) {
			pi.sendUserMessage(entry.prompt);
		}
		ctx.ui.setEditorText(entry.prompt);
		return;
	}

	const content = await ctx.ui.editor(
		entry.description ?? "Editor",
		entry.prompt,
	);
	if (content === undefined) return;

	applyPrompt(pi, ctx, content, entry.send ?? true);
}

async function runEntry(
	entry: KeymapEntry,
	cwd: string,
	pi: ExtensionAPI,
	ctx: ExtensionContext,
	label: string,
): Promise<void> {
	if (entry.commands?.length) {
		await runCommands(entry.commands, cwd, pi, ctx, label);
		return;
	}

	if (entry.prompt !== undefined) {
		await runPrompt(entry, pi, ctx);
		return;
	}

	ctx.ui.notify(`${label} has no commands or prompt`, "warning");
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
				description: getEntryLabel(km),
				handler: () => runEntry(km, cwd, pi, ctx, "keymap"),
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
			showLevel({
				ctx,
				node: root,
				prefixPath: "",
				leaderKey: config.leader,
				hasAction,
				getEntryLabel,
				onRun: (entry, label) => runEntry(entry, cwd, pi, ctx, label),
				onDone: () => {
					leaderPressed = false;
				},
			});
			return { consume: true };
		});

		pi.on("session_shutdown", () => {
			unsubscribe();
		});
	});
}
