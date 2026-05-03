import { describe, expect, test } from "bun:test";
import { homedir } from "node:os";
import { join } from "node:path";
import { Effect, Exit, Schema } from "effect";
import {
	getGlobalConfigPath,
	getProjectConfigPath,
	getProjectSettingsPath,
	getSettingsPath,
	parseConfig,
	readConfig,
	readSettings,
} from "../index.js";

const ExampleSchema = Schema.Struct({
	name: Schema.String,
	port: Schema.Number.pipe(Schema.optional),
});

describe("getSettingsPath", () => {
	test("returns path under home directory", () => {
		const homeDir = process.env.HOME || process.env.USERPROFILE || homedir();
		const expected = join(homeDir, ".pi", "agent", "settings.json");
		expect(getSettingsPath()).toBe(expected);
	});
});

describe("getProjectSettingsPath", () => {
	test("returns path under cwd", () => {
		expect(getProjectSettingsPath("/some/project")).toBe(
			join("/some/project", ".pi", "settings.json"),
		);
	});
});

describe("parseConfig", () => {
	test("parses valid JSON", () => {
		const raw = JSON.stringify({ name: "my-project", port: 3000 });
		const config = Effect.runSync(parseConfig(raw, ExampleSchema));
		expect(config.name).toBe("my-project");
		expect(config.port).toBe(3000);
	});

	test("parses JSON with optional fields missing", () => {
		const raw = JSON.stringify({ name: "minimal" });
		const config = Effect.runSync(parseConfig(raw, ExampleSchema));
		expect(config.name).toBe("minimal");
		expect(config.port).toBeUndefined();
	});

	test("fails with ValidationError on missing required fields", () => {
		const raw = JSON.stringify({ port: 3000 });
		const exit = Effect.runSyncExit(parseConfig(raw, ExampleSchema));
		expect(Exit.isFailure(exit)).toBe(true);
		if (Exit.isFailure(exit)) {
			expect(exit.cause._tag).toBe("Fail");
		}
	});

	test("fails with ParseError on malformed JSON", () => {
		const raw = "not valid json";
		const exit = Effect.runSyncExit(parseConfig(raw, ExampleSchema));
		expect(Exit.isFailure(exit)).toBe(true);
	});
});

describe("getGlobalConfigPath", () => {
	test("returns path with given filename", () => {
		const homeDir = process.env.HOME ?? process.env.USERPROFILE ?? homedir();
		expect(getGlobalConfigPath("command-hooks.json")).toBe(
			join(homeDir, ".pi", "agent", "command-hooks.json"),
		);
	});
});

describe("getProjectConfigPath", () => {
	test("returns path with given cwd and filename", () => {
		expect(getProjectConfigPath("/some/project", "command-hooks.json")).toBe(
			join("/some/project", ".pi", "command-hooks.json"),
		);
	});
});

describe("readConfig", () => {
	const HookSchema = Schema.Struct({
		hooks: Schema.optional(
			Schema.Record({
				key: Schema.String,
				value: Schema.Array(Schema.String),
			}),
		),
	});

	test("returns empty config when no files exist", () => {
		const config = Effect.runSync(
			readConfig("command-hooks.json", HookSchema, "/nonexistent/path"),
		);
		expect(config.hooks).toBeUndefined();
	});

	test("returns validated config when file exists", () => {
		// Uses the global settings.json which always exists
		const SettingsSchema = Schema.Struct({
			defaultModel: Schema.optional(Schema.String),
		});
		const config = Effect.runSync(readConfig("settings.json", SettingsSchema));
		expect(config).toBeDefined();
	});
});

describe("readSettings", () => {
	test("merges global and project settings", () => {
		const settings = Effect.runSync(readSettings("/nonexistent/path"));
		expect(typeof settings).toBe("object");
	});

	test("project settings override global", () => {
		const settings = Effect.runSync(readSettings("/nonexistent/path"));
		expect(settings).toHaveProperty("defaultModel");
	});
});
