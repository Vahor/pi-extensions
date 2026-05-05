import { describe, expect, test } from "bun:test";
import { Schema } from "effect";
import { CommandHooksConfigSchema } from "../config.js";

describe("CommandHooksConfigSchema", () => {
	test("allows empty hooks object (all events optional)", () => {
		const result = Schema.decodeUnknownSync(CommandHooksConfigSchema)({
			hooks: {},
		});
		expect(result.hooks).toEqual({});
	});

	test("fails on missing hooks key", () => {
		expect(() =>
			Schema.decodeUnknownSync(CommandHooksConfigSchema)({}),
		).toThrow();
	});

	test("silently drops unknown event names", () => {
		const result = Schema.decodeUnknownSync(CommandHooksConfigSchema)({
			hooks: { not_an_event: ["echo"] },
		});
		expect(result.hooks).toEqual({});
	});

	test("fails on invalid entry", () => {
		expect(() =>
			Schema.decodeUnknownSync(CommandHooksConfigSchema)({
				hooks: { session_start: [42] },
			}),
		).toThrow();
	});
});
