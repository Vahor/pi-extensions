import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
import type { KeymapEntry, KeymapsConfig } from "./config.js";
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
	| { type: "run"; entry: KeymapEntry; label: string };

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

function vimString(value: string): string {
	return `'${value.replaceAll("'", "''")}'`;
}

async function openPromptInVim(
	prompt: string,
	ctx: ExtensionContext,
): Promise<string | undefined> {
	if (!ctx.hasUI || !process.stdin.isTTY || !process.stdout.isTTY) {
		ctx.ui.notify("keymap prompt: vim requires pi's interactive TUI", "error");
		return undefined;
	}

	const dir = await mkdtemp(join(tmpdir(), "vahor-pi-keymap-"));
	const promptFile = join(dir, "prompt.md");
	const savedFile = join(dir, "saved");
	await writeFile(promptFile, prompt, "utf8");

	try {
		const result = await ctx.ui.custom<{ code: number; error?: string }>(
			(tui, _theme, _kb, done) => {
				let completed = false;

				const finish = (result: { code: number; error?: string }): void => {
					if (completed) return;
					completed = true;
					tui.start();
					tui.requestRender(true);
					done(result);
				};

				tui.stop();

				const child = spawn(
					"vim",
					[
						promptFile,
						"-c",
						`autocmd BufWritePost <buffer> call writefile(['saved'], ${vimString(savedFile)})`,
					],
					{
						cwd: process.cwd(),
						stdio: "inherit",
						env: process.env,
					},
				);

				child.on("error", (error) => {
					finish({ code: 1, error: error.message });
				});
				child.on("exit", (code, signal) => {
					finish({
						code: code ?? (signal ? 1 : 0),
						error: signal ? `vim terminated by ${signal}` : undefined,
					});
				});

				return { render: () => [], invalidate: () => {} };
			},
		);

		if (result.code !== 0) {
			ctx.ui.notify(
				`keymap prompt: vim failed${result.error ? `: ${result.error}` : ""}`,
				"error",
			);
			return undefined;
		}

		try {
			await stat(savedFile);
		} catch {
			return undefined;
		}

		return await readFile(promptFile, "utf8");
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}

function applyPrompt(
	pi: ExtensionAPI,
	ctx: ExtensionContext,
	content: string,
	send: boolean | undefined,
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
		ctx.ui.setEditorText(entry.prompt);
		return;
	}

	const content = await openPromptInVim(entry.prompt, ctx);
	if (content === undefined) return;

	applyPrompt(pi, ctx, content, entry.send);
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

	await runPrompt(entry, pi, ctx);
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
		label: c.payload ? getEntryLabel(c.payload) : "",
		hasAction: c.payload ? hasAction(c.payload) : false,
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
				void runEntry(action.entry, cwd, pi, ctx, action.label);
			}, 5);
		})
		.catch((error) => {
			onDone();
			const message = error instanceof Error ? error.message : String(error);
			ctx.ui.notify(`keymap overlay error: ${message}`, "error");
		});
}
