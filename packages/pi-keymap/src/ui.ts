import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { flattenTrieChildren, type TrieNode } from "@vahor/shared/trie";
import type { KeymapEntry } from "./config.js";
import { type LeaderEntry, WhichKeyOverlay } from "./which-key.js";

type LeaderAction =
	| { type: "prefix"; key: string }
	| { type: "run"; entry: KeymapEntry; label: string };

interface ShowLevelOptions {
	ctx: ExtensionContext;
	node: TrieNode<KeymapEntry>;
	prefixPath: string;
	leaderKey: string;
	hasAction: (entry: KeymapEntry | undefined) => boolean;
	getEntryLabel: (entry: KeymapEntry) => string;
	onRun: (entry: KeymapEntry, label: string) => Promise<void> | void;
	onDone: () => void;
}

export function showLevel(options: ShowLevelOptions): void {
	const {
		ctx,
		node,
		prefixPath,
		leaderKey,
		hasAction,
		getEntryLabel,
		onRun,
		onDone,
	} = options;

	const entries: LeaderEntry[] = flattenTrieChildren(node).map((c) => ({
		key: c.key,
		label: c.payload ? getEntryLabel(c.payload) : "",
		hasAction: c.payload ? hasAction(c.payload) : false,
		context:
			c.payload?.commands?.some((command) => command.context === true) ?? false,
		interactive:
			c.payload?.commands?.some((command) => command.interactive === true) ??
			false,
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

						const payload = childNode.payload;
						if (childNode.children.size > 0) {
							done({ type: "prefix", key: child.key });
						} else if (payload && hasAction(payload)) {
							done({
								type: "run",
								entry: payload,
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

				showLevel({
					...options,
					node: childNode,
					prefixPath: `${prefixPath}${action.key}`,
				});
				return;
			}

			onDone();
			setTimeout(() => {
				void onRun(action.entry, action.label);
			}, 5);
		})
		.catch((error) => {
			onDone();
			const message = error instanceof Error ? error.message : String(error);
			ctx.ui.notify(`keymap overlay error: ${message}`, "error");
		});
}
