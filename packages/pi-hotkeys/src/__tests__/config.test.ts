import { describe, expect, test } from "bun:test";
import { Schema } from "effect";
import { HotkeysConfigSchema } from "../config.js";

describe("HotkeysConfigSchema", () => {
	test("validates a correct config", () => {
		const result = Schema.decodeUnknownSync(HotkeysConfigSchema)({
			hotkeys: [
				{
					key: "ctrl+shift+l",
					commands: ["bun run lint"],
				},
			],
		});
		expect(result.hotkeys).toHaveLength(1);
		expect(result.hotkeys[0].key).toBe("ctrl+shift+l");
		expect(result.hotkeys[0].commands).toHaveLength(1);
	});

	test("validates commands with object form", () => {
		const result = Schema.decodeUnknownSync(HotkeysConfigSchema)({
			hotkeys: [
				{
					key: "alt+x",
					commands: [
						{ command: "echo hello", cwd: ".", timeout: 5000, print: true },
					],
				},
			],
		});
		expect(result.hotkeys[0].commands[0]).toEqual({
			command: "echo hello",
			cwd: ".",
			timeout: 5000,
			print: true,
		});
	});

	test("validates mixed string and object commands", () => {
		const result = Schema.decodeUnknownSync(HotkeysConfigSchema)({
			hotkeys: [
				{
					key: "ctrl+shift+t",
					commands: ["echo 'start'", { command: "bun test", timeout: 60000 }],
				},
			],
		});
		expect(result.hotkeys[0].commands).toHaveLength(2);
		expect(result.hotkeys[0].commands[0]).toEqual({ command: "echo 'start'" });
		expect(result.hotkeys[0].commands[1].command).toBe("bun test");
	});

	test("allows empty hotkeys array", () => {
		const result = Schema.decodeUnknownSync(HotkeysConfigSchema)({
			hotkeys: [],
		});
		expect(result.hotkeys).toEqual([]);
	});

	test("fails on missing key", () => {
		expect(() =>
			Schema.decodeUnknownSync(HotkeysConfigSchema)({
				hotkeys: [{ commands: ["echo"] }],
			}),
		).toThrow();
	});

	test("fails on missing commands", () => {
		expect(() =>
			Schema.decodeUnknownSync(HotkeysConfigSchema)({
				hotkeys: [{ key: "ctrl+x" }],
			}),
		).toThrow();
	});

	test("fails on empty commands array", () => {
		expect(() =>
			Schema.decodeUnknownSync(HotkeysConfigSchema)({
				hotkeys: [{ key: "ctrl+x", commands: [] }],
			}),
		).toThrow();
	});

	test("fails on missing hotkeys", () => {
		expect(() => Schema.decodeUnknownSync(HotkeysConfigSchema)({})).toThrow();
	});
});
