import { describe, expect, test } from "bun:test";
import { Schema } from "effect";
import { CommandHooksConfigSchema } from "../config.js";

const decodeConfig = (value: unknown) =>
	Schema.decodeUnknownSync(CommandHooksConfigSchema, {
		onExcessProperty: "error",
	})(value);

describe("CommandHooksConfigSchema", () => {
	test("allows empty hooks object (all events optional)", () => {
		const result = decodeConfig({
			hooks: {},
		});
		expect(result.hooks).toEqual({});
	});

	test("allows editor schema URI", () => {
		const result = decodeConfig({
			$schema: "https://example.com/hooks.schema.json",
			hooks: {},
		});
		expect(result.$schema).toBe("https://example.com/hooks.schema.json");
	});

	test("fails on missing hooks key", () => {
		expect(() => decodeConfig({})).toThrow();
	});

	test("fails on unknown event names", () => {
		expect(() =>
			decodeConfig({
				hooks: { not_an_event: ["echo"] },
			}),
		).toThrow();
	});

	test("fails on invalid entry", () => {
		expect(() =>
			decodeConfig({
				hooks: { session_start: [42] },
			}),
		).toThrow();
	});
});
