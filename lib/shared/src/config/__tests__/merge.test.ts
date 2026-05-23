import { describe, expect, test } from "bun:test";
import { mergeSettings } from "../merge";

describe("mergeSettings", () => {
	test("merges objects recursively and lets override win", () => {
		const result = mergeSettings(
			{
				leader: "bidule",
				nested: { a: 1, b: 2 },
			},
			{
				leader: "space",
				nested: { b: 3 },
			},
		);

		expect(result).toEqual({
			leader: "space",
			nested: { a: 1, b: 3 },
		});
	});

	test("merges keyed arrays by default", () => {
		const result = mergeSettings(
			{ keymaps: [{ key: "<leader>f", value: "foo" }] },
			{ keymaps: [{ key: "<leader>g", value: "bar" }] },
		);

		expect(result).toEqual({
			keymaps: [
				{ key: "<leader>f", value: "foo" },
				{ key: "<leader>g", value: "bar" },
			],
		});
	});

	test("project keyed array entries override global entries", () => {
		const result = mergeSettings(
			{
				leader: "bidule",
				keymaps: [
					{ key: "<leader>f", value: "foo" },
					{ key: "<leader>g", value: "bar" },
				],
			},
			{
				leader: "space",
				keymaps: [{ key: "<leader>f", value: "baz" }],
			},
		);

		expect(result).toEqual({
			leader: "space",
			keymaps: [
				{ key: "<leader>f", value: "baz" },
				{ key: "<leader>g", value: "bar" },
			],
		});
	});
});
