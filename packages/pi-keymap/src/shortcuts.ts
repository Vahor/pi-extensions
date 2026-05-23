import type {
	ExtensionAPI,
	ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { type KeyId, matchesKey } from "@earendil-works/pi-tui";
import { buildTrie } from "@vahor/shared/trie";
import { runEntry } from "./actions.js";
import type { KeymapEntry, KeymapsConfig } from "./config.js";
import { parseLeaderKeySegments } from "./keys.js";
import { showLevel } from "./ui.js";
import { installUiActivityTracker } from "./ui-activity.js";
import { getEntryLabel, hasAction, warnDeadEnds } from "./validation.js";

export function registerDirectKeymaps(
	entries: readonly KeymapEntry[],
	cwd: string,
	pi: ExtensionAPI,
	ctx: ExtensionContext,
): void {
	for (const entry of entries) {
		pi.registerShortcut(entry.leaderKey as KeyId, {
			description: getEntryLabel(entry),
			handler: () => runEntry(entry, cwd, pi, ctx, "keymap"),
		});
	}
}

export function registerLeaderKeymaps(
	entries: readonly KeymapEntry[],
	config: KeymapsConfig,
	cwd: string,
	pi: ExtensionAPI,
	ctx: ExtensionContext,
): void {
	const { root, conflicts } = buildTrie<KeymapEntry>(
		entries.map((entry) => ({
			key: entry.leaderKey,
			segments: parseLeaderKeySegments(entry.leaderKey),
			payload: entry,
		})),
	);

	warnDeadEnds(root, "<leader>", ctx);

	for (const conflict of conflicts) {
		ctx.ui.notify(conflict, "warning");
	}

	if (root.children.size === 0) return;

	let leaderPressed = false;
	const isUiActive = installUiActivityTracker(ctx.ui);

	const unsubscribe = ctx.ui.onTerminalInput((data: string) => {
		if (leaderPressed) return;
		if (!matchesKey(data, config.leader as KeyId)) return;
		if (isUiActive()) return;
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
}
