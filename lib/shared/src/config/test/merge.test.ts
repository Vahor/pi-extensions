import { describe, expect, test } from "bun:test";
import { mergeSettings } from "../merge";

describe("mergeSettings", () => {
	test("should merge settings", () => {
		const a = {
			leader: "bidule",
			keymaps: [
				{ key: "<leader>f", value: "foo" },
				{ key: "<leader>g", value: "bar" },
			],
		};
		const b = {
			leader: "space",
			keymaps: [{ key: "<leader>f", value: "baz" }],
		};
		const result = mergeSettings(a, b);
		expect(result).toEqual({
			leader: "space",
			keymaps: [
				{ key: "<leader>f", value: "baz" },
				{ key: "<leader>g", value: "bar" },
			],
		});
	});
});
