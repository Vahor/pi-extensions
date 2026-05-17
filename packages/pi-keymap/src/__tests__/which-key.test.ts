import { describe, expect, test } from "bun:test";
import type { Theme } from "@earendil-works/pi-coding-agent";
import { buildTrie, flattenTrieChildren } from "@vahor/shared/trie";
import type { KeymapCommand } from "../config.js";
import { parseLeaderKeySegments } from "../keys.js";
import { WhichKeyOverlay } from "../which-key.js";

type Payload = KeymapCommand[];

describe("trie (leader keymaps)", () => {
	test("builds a simple trie from flat entries", () => {
		const { root, conflicts } = buildTrie<Payload>([
			{ key: "t", payload: [{ command: "bun test" }] },
			{ key: "f", payload: [{ command: "bun run format" }] },
		]);
		expect(conflicts).toEqual([]);
		expect(root.children.size).toBe(2);
		expect(root.children.get("t")?.payload?.[0].command).toBe("bun test");
		expect(root.children.get("f")?.payload?.[0].command).toBe("bun run format");
	});

	test("builds nested entries (multi-char keys like ta, tb)", () => {
		const { root, conflicts } = buildTrie<Payload>([
			{ key: "ta", payload: [{ command: "bun test" }] },
			{ key: "tb", payload: [{ command: "bun run build" }] },
		]);
		expect(conflicts).toEqual([]);

		const t = root.children.get("t");
		expect(t).toBeDefined();
		expect(t?.payload).toBeUndefined();

		expect(t?.children.size).toBe(2);
		expect(t?.children.get("a")?.payload?.[0].command).toBe("bun test");
		expect(t?.children.get("b")?.payload?.[0].command).toBe("bun run build");
	});

	test("keeps shift+letter as one leader segment", () => {
		const { root, conflicts } = buildTrie<Payload>([
			{
				key: "shift+h",
				segments: parseLeaderKeySegments("shift+h"),
				payload: [{ command: "echo help" }],
			},
		]);

		expect(conflicts).toEqual([]);
		expect(root.children.has("s")).toBe(false);
		expect(root.children.get("shift+h")?.payload?.[0].command).toBe(
			"echo help",
		);
	});

	test("allows prefix node to have its own commands alongside children", () => {
		const { root, conflicts } = buildTrie<Payload>([
			{ key: "t", payload: [{ command: "bun test" }] },
			{ key: "ta", payload: [{ command: "bun test --all" }] },
		]);
		expect(conflicts).toEqual([]);

		const t = root.children.get("t");
		expect(t?.payload?.[0].command).toBe("bun test");
		expect(t?.children.get("a")?.payload?.[0].command).toBe("bun test --all");
	});

	test("detects conflict: two entries for the same leaf key", () => {
		const { root, conflicts } = buildTrie<Payload>([
			{ key: "t", payload: [{ command: "bun test" }] },
			{ key: "t", payload: [{ command: "bun test --other" }] },
		]);
		expect(conflicts).toHaveLength(1);
		expect(conflicts[0]).toContain("conflict");
		expect(root.children.get("t")?.payload?.[0].command).toBe(
			"bun test --other",
		);
	});

	test("deeply nested keys work (3+ levels)", () => {
		const { root, conflicts } = buildTrie<Payload>([
			{ key: "g", payload: [{ command: "git status" }] },
			{ key: "gp", payload: [{ command: "git push" }] },
			{ key: "gpf", payload: [{ command: "git push --force" }] },
		]);
		expect(conflicts).toEqual([]);

		const g = root.children.get("g");
		expect(g?.payload?.[0].command).toBe("git status");
		expect(g?.children.size).toBe(1);

		const p = g?.children.get("p");
		expect(p?.payload?.[0].command).toBe("git push");
		expect(p?.children.size).toBe(1);

		const f = p?.children.get("f");
		expect(f?.payload?.[0].command).toBe("git push --force");
		expect(f?.children.size).toBe(0);
	});
});

describe("parseLeaderKeySegments", () => {
	test("parses shift+letter as one segment only for letters", () => {
		expect(parseLeaderKeySegments("shift+h")).toEqual(["shift+h"]);
		expect(parseLeaderKeySegments("gshift+h")).toEqual(["g", "shift+h"]);
		expect(parseLeaderKeySegments("shift+1")).toEqual([
			"s",
			"h",
			"i",
			"f",
			"t",
			"+",
			"1",
		]);
	});
});

describe("flattenTrieChildren", () => {
	test("flattens with payloads", () => {
		const { root } = buildTrie<Payload>([
			{ key: "t", payload: [{ command: "bun test" }] },
			{ key: "f", payload: [{ command: "bun format" }] },
		]);
		const items = flattenTrieChildren(root);
		expect(items).toHaveLength(2);
		expect(items[0]?.key).toBe("t");
		expect(items[0]?.payload?.[0].command).toBe("bun test");
		expect(items[1]?.key).toBe("f");
	});

	test("prefix nodes have undefined payload", () => {
		const { root } = buildTrie<Payload>([
			{ key: "ta", payload: [{ command: "bun test" }] },
		]);
		const items = flattenTrieChildren(root);
		expect(items).toHaveLength(1);
		expect(items[0]?.key).toBe("t");
		expect(items[0]?.payload).toBeUndefined();
	});
});

describe("WhichKeyOverlay", () => {
	const plainTheme = {
		fg: (_color: string, text: string) => text,
		bold: (text: string) => text,
	} as unknown as Theme;

	const styledTheme = {
		fg: (color: string, text: string) => `<${color}>${text}</${color}>`,
		bold: (_text: string) => {
			throw new Error("bold should not be used");
		},
	} as unknown as Theme;

	test("displays shift+letter segments as uppercase letters", () => {
		const overlay = new WhichKeyOverlay(
			plainTheme,
			[
				{
					key: "shift+h",
					label: "Help",
					hasAction: true,
					context: false,
					interactive: false,
				},
			],
			() => {},
			() => {},
			"<space>",
		);

		try {
			const text = overlay.render(40).join("\n");
			expect(text).toContain("H       Help");
			expect(text).not.toContain("shift+h");
		} finally {
			overlay.dispose();
		}
	});

	test("does not bold command keys", () => {
		const overlay = new WhichKeyOverlay(
			styledTheme,
			[
				{
					key: "t",
					label: "Test",
					hasAction: true,
					context: false,
					interactive: false,
				},
			],
			() => {},
			() => {},
			"<space>",
		);

		try {
			expect(() => overlay.render(200)).not.toThrow();
		} finally {
			overlay.dispose();
		}
	});

	test("marks only the silent suffix as dim", () => {
		const overlay = new WhichKeyOverlay(
			styledTheme,
			[
				{
					key: "s",
					label: "Silent",
					hasAction: true,
					context: false,
					interactive: false,
					silent: true,
				},
			],
			() => {},
			() => {},
			"<space>",
		);

		try {
			const text = overlay.render(200).join("\n");
			expect(text).toContain(
				"<syntaxString>Silent</syntaxString><dim> (silent)</dim>",
			);
		} finally {
			overlay.dispose();
		}
	});
});
