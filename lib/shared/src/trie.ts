/**
 * Generic key-sequence trie for leader keymaps and similar use cases.
 * Each node holds an optional payload and a map of child nodes keyed by segment.
 */

export interface TrieNode<T> {
	/** Short display key for this segment (single char for leader keys) */
	segment: string;
	/** Optional payload at this node (undefined = pure prefix, has value = leaf or combined) */
	payload?: T;
	children: Map<string, TrieNode<T>>;
}

/** A sequence entry: key string split into segments + payload */
export interface TrieEntry<T> {
	key: string;
	payload: T;
}

/**
 * Build a trie from entries, detecting conflicts where the same key path
 * already has a payload.
 *
 * Each entry's `key` is split into individual characters as segments.
 * Last-write-wins for conflicts, but conflicts are reported.
 *
 * @returns the root node and a list of conflict messages
 */
export function buildTrie<T>(entries: TrieEntry<T>[]): {
	root: TrieNode<T>;
	conflicts: string[];
} {
	const root: TrieNode<T> = { segment: "", children: new Map() };
	const conflicts: string[] = [];

	for (const entry of entries) {
		let node = root;
		const segments = [...entry.key];

		for (let i = 0; i < segments.length; i++) {
			const seg = segments[i];
			if (seg === undefined) continue;
			const isLast = i === segments.length - 1;

			if (isLast) {
				const existing = node.children.get(seg);
				if (existing === undefined) {
					node.children.set(seg, {
						segment: seg,
						payload: entry.payload,
						children: new Map(),
					});
				} else {
					if (existing.payload !== undefined) {
						conflicts.push(
							`${entry.key} conflicts with another mapping at the same key`,
						);
					}
					existing.payload = entry.payload;
				}
			} else {
				let child = node.children.get(seg);
				if (!child) {
					child = { segment: seg, children: new Map() };
					node.children.set(seg, child);
				}
				node = child;
			}
		}
	}

	return { root, conflicts };
}

/**
 * Flatten a node's children into an array of { key (segment), payload } entries.
 * Nodes without payload are included with undefined payload.
 */
export function flattenTrieChildren<T>(
	node: TrieNode<T>,
): { key: string; payload: T | undefined }[] {
	const result: { key: string; payload: T | undefined }[] = [];
	for (const child of node.children.values()) {
		result.push({ key: child.segment, payload: child.payload });
	}
	return result;
}
