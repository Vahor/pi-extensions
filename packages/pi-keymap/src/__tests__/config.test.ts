import { describe, expect, test } from "bun:test";
import { Schema } from "effect";
import { KeymapsConfigSchema } from "../config.js";

const decodeConfig = (value: unknown) =>
	Schema.decodeUnknownSync(KeymapsConfigSchema, {
		onExcessProperty: "error",
	})(value);

describe("KeymapsConfigSchema", () => {
	test("validates a correct config", () => {
		const result = decodeConfig({
			leader: "space",
			keymaps: [
				{
					key: "ctrl+shift+l",
					commands: ["bun run lint"],
				},
			],
		});
		expect(result.keymaps).toHaveLength(1);
		expect(result.keymaps?.[0].leaderKey).toBe("ctrl+shift+l");
		expect(result.keymaps?.[0].leader).toBe(false);
	});

	test("validates commands with object form", () => {
		const result = decodeConfig({
			leader: "space",
			keymaps: [
				{
					key: "alt+x",
					commands: [
						{
							command: "echo hello",
							cwd: ".",
							timeout: 5000,
							print: true,
							context: true,
							interactive: true,
						},
					],
				},
			],
		});
		expect(result.keymaps?.[0].commands?.[0]).toEqual({
			command: "echo hello",
			cwd: ".",
			timeout: 5000,
			print: true,
			context: true,
			interactive: true,
		});
	});

	test("inherits entry-level options for string commands", () => {
		const result = decodeConfig({
			leader: "space",
			keymaps: [
				{
					key: "<leader>g",
					commands: ["echo hello"],
					print: true,
					context: true,
					interactive: true,
				},
			],
		});

		expect(result.keymaps?.[0].commands?.[0]).toEqual({
			command: "echo hello",
			print: true,
			context: true,
			interactive: true,
		});
	});

	test("validates mixed string and object commands", () => {
		const result = decodeConfig({
			leader: "space",
			keymaps: [
				{
					key: "ctrl+shift+t",
					commands: ["echo 'start'", { command: "bun test", timeout: 60000 }],
				},
			],
		});
		expect(result.keymaps).toHaveLength(1);
		expect(result.keymaps?.[0].commands).toHaveLength(2);
		expect(result.keymaps?.[0].commands?.[0]).toEqual({
			command: "echo 'start'",
		});
		expect(result.keymaps?.[0].commands?.[1]?.command).toBe("bun test");
	});

	test("allows empty keymaps array", () => {
		const result = decodeConfig({
			leader: "space",
			keymaps: [],
		});
		expect(result.keymaps).toEqual([]);
	});

	test("fails on unknown config keys", () => {
		expect(() =>
			decodeConfig({
				leader: "space",
				keymaps: [],
				extra: true,
			}),
		).toThrow();
	});

	test("resolves leader prefix into leaderKey with leader: true", () => {
		const result = decodeConfig({
			leader: "space",
			keymaps: [
				{ key: "<leader>t", commands: ["bun run test"] },
				{ key: "<leader>f", commands: ["bun run format"] },
			],
		});
		expect(result.keymaps).toHaveLength(2);
		expect(result.keymaps?.[0].leaderKey).toBe("t");
		expect(result.keymaps?.[0].leader).toBe(true);
		expect(result.keymaps?.[1].leaderKey).toBe("f");
		expect(result.keymaps?.[1].leader).toBe(true);
	});

	test("mixed leader and direct keymaps", () => {
		const result = decodeConfig({
			leader: "space",
			keymaps: [
				{ key: "<leader>t", commands: ["bun run test"] },
				{ key: "ctrl+shift+l", commands: ["bun run lint"] },
			],
		});
		expect(result.keymaps).toHaveLength(2);
		expect(result.keymaps?.[0].leader).toBe(true);
		expect(result.keymaps?.[1].leader).toBe(false);
	});

	test("carries through optional description", () => {
		const result = decodeConfig({
			leader: "space",
			keymaps: [
				{
					key: "<leader>t",
					description: "Run tests",
					commands: ["bun test"],
				},
				{ key: "<leader>f", commands: ["bun format"] },
			],
		});
		expect(result.keymaps).toHaveLength(2);
		expect(result.keymaps?.[0].description).toBe("Run tests");
		expect(result.keymaps?.[1].description).toBeUndefined();
	});

	test("encode round-trips correctly", () => {
		const decoded = decodeConfig({
			leader: "space",
			keymaps: [
				{ key: "<leader>t", commands: ["bun test"] },
				{ key: "ctrl+shift+l", commands: ["bun lint"] },
			],
		});
		const encoded = Schema.encodeSync(KeymapsConfigSchema)(decoded);
		expect(encoded.keymaps).toHaveLength(2);
		expect(encoded.keymaps?.[0].key).toBe("<leader>t");
		expect(encoded.keymaps?.[1].key).toBe("ctrl+shift+l");
	});

	test("fails on missing key", () => {
		expect(() =>
			decodeConfig({
				leader: "space",
				keymaps: [{ commands: ["echo"] }],
			}),
		).toThrow();
	});

	test("allows missing commands (prefix-only node)", () => {
		const result = decodeConfig({
			leader: "space",
			keymaps: [{ key: "<leader>t", description: "Test prefix" }],
		});
		expect(result.keymaps).toHaveLength(1);
		expect(result.keymaps?.[0].commands).toBeUndefined();
		expect(result.keymaps?.[0].description).toBe("Test prefix");
	});

	test("fails when commands and prompt are both present", () => {
		expect(() =>
			decodeConfig({
				leader: "space",
				keymaps: [{ key: "ctrl+x", commands: ["echo"], prompt: "text" }],
			}),
		).toThrow();
	});

	test("fails on empty commands array", () => {
		expect(() =>
			decodeConfig({
				leader: "space",
				keymaps: [{ key: "ctrl+x", commands: [] }],
			}),
		).toThrow();
	});
});
