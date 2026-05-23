import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { TrieNode } from "@vahor/shared/trie";
import type { KeymapEntry } from "./config.js";
import { isValidKey, parseLeaderKeySegments } from "./keys.js";

export interface ValidatedKeymaps {
	direct: KeymapEntry[];
	leader: KeymapEntry[];
}

export function hasAction(entry: KeymapEntry | undefined): boolean {
	return Boolean(entry?.commands?.length || entry?.prompt !== undefined);
}

export function getEntryLabel(entry: KeymapEntry): string {
	return (
		entry.description ?? entry.commands?.[0]?.command ?? entry.prompt ?? ""
	);
}

export function validateKeymaps(
	entries: readonly KeymapEntry[],
	ctx: ExtensionContext,
): ValidatedKeymaps {
	const direct: KeymapEntry[] = [];
	const leader: KeymapEntry[] = [];

	for (const entry of entries) {
		if (entry.leader) {
			if (isValidLeaderEntry(entry, ctx)) leader.push(entry);
			continue;
		}

		if (isValidDirectEntry(entry, ctx)) direct.push(entry);
	}

	return { direct, leader };
}

export function warnDeadEnds(
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

function isValidDirectEntry(
	entry: KeymapEntry,
	ctx: ExtensionContext,
): boolean {
	if (!isValidKey(entry.leaderKey)) {
		ctx.ui.notify(`keymap: key "${entry.leaderKey}" is invalid`, "warning");
		return false;
	}

	if (!hasAction(entry)) {
		ctx.ui.notify(
			`keymap: "${entry.leaderKey}" has no commands or prompt (direct keymaps must have an action)`,
			"warning",
		);
		return false;
	}

	return true;
}

function isValidLeaderEntry(
	entry: KeymapEntry,
	ctx: ExtensionContext,
): boolean {
	let valid = true;
	for (const segment of parseLeaderKeySegments(entry.leaderKey)) {
		if (!isValidKey(segment)) {
			ctx.ui.notify(
				`keymap: leader sub-key "${segment}" in "<leader>${entry.leaderKey}" is invalid`,
				"warning",
			);
			valid = false;
		}
	}
	return valid;
}
