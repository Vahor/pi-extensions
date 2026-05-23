import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { homedir } from "node:os";
import { join } from "node:path";
import { Cause, Effect, Exit, Schema } from "effect";
import {
	mkdirSyncMock,
	readText,
	resetFileMock,
	writeFileSyncMock,
	writeJson,
	writeText,
} from "./file-mock.js";

const {
	FileNotFoundError,
	getGlobalConfigPath,
	getProjectConfigPath,
	getProjectSettingsPath,
	getSettingsPath,
	ParseError,
	parseConfig,
	readConfig,
	readSettings,
	ValidationError,
} = await import("../index.js");

const ExampleSchema = Schema.Struct({
	name: Schema.String,
	port: Schema.Number.pipe(Schema.optional),
});

let homeDir = "";
let projectDir = "";
const originalHome = process.env.HOME;
const originalUserProfile = process.env.USERPROFILE;

beforeEach(() => {
	resetFileMock();
	homeDir = join("/", "mock-home");
	projectDir = join("/", "mock-project");
	process.env.HOME = homeDir;
	delete process.env.USERPROFILE;
});

afterAll(() => {
	if (originalHome === undefined) delete process.env.HOME;
	else process.env.HOME = originalHome;
	if (originalUserProfile === undefined) delete process.env.USERPROFILE;
	else process.env.USERPROFILE = originalUserProfile;
});

describe("getSettingsPath", () => {
	test("returns path under home directory", () => {
		expect(getSettingsPath()).toBe(
			join(homeDir, ".pi", "agent", "settings.json"),
		);
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
		const config = Effect.runSync(
			parseConfig("config.json", raw, ExampleSchema),
		);
		expect(config.name).toBe("my-project");
		expect(config.port).toBe(3000);
	});

	test("parses JSON with optional fields missing", () => {
		const raw = JSON.stringify({ name: "minimal" });
		const config = Effect.runSync(
			parseConfig("config.json", raw, ExampleSchema),
		);
		expect(config.name).toBe("minimal");
		expect(config.port).toBeUndefined();
	});

	test("fails with ValidationError on missing required fields", () => {
		const raw = JSON.stringify({ port: 3000 });
		const exit = Effect.runSyncExit(
			parseConfig("config.json", raw, ExampleSchema),
		);
		expect(Exit.isFailure(exit)).toBe(true);
		if (Exit.isFailure(exit) && Cause.isFailType(exit.cause)) {
			expect(exit.cause.error).toBeInstanceOf(ValidationError);
		}
	});

	test("fails with ParseError on malformed JSON", () => {
		const raw = "not valid json";
		const exit = Effect.runSyncExit(
			parseConfig("config.json", raw, ExampleSchema),
		);
		expect(Exit.isFailure(exit)).toBe(true);
		if (Exit.isFailure(exit) && Cause.isFailType(exit.cause)) {
			expect(exit.cause.error).toBeInstanceOf(ParseError);
		}
	});
});

describe("getGlobalConfigPath", () => {
	test("returns path with given filename", () => {
		expect(getGlobalConfigPath("command-hooks.json")).toBe(
			join(homeDir, ".pi", "agent", "command-hooks.json"),
		);
	});

	test("falls back to os homedir when HOME and USERPROFILE are unset", () => {
		delete process.env.HOME;
		delete process.env.USERPROFILE;
		expect(getGlobalConfigPath("settings.json")).toBe(
			join(homedir(), ".pi", "agent", "settings.json"),
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
		$schema: Schema.optional(Schema.String),
		hooks: Schema.optional(
			Schema.Record({
				key: Schema.String,
				value: Schema.Array(Schema.String),
			}),
		),
	});

	test("fails with FileNotFoundError when no config files exist", () => {
		const exit = Effect.runSyncExit(
			readConfig("command-hooks.json", HookSchema, projectDir),
		);
		expect(Exit.isFailure(exit)).toBe(true);
		if (Exit.isFailure(exit) && Cause.isFailType(exit.cause)) {
			expect(exit.cause.error).toBeInstanceOf(FileNotFoundError);
		}
	});

	test("creates and returns a default project config when no config files exist", () => {
		const path = getProjectConfigPath(projectDir, "command-hooks.json");
		const config = Effect.runSync(
			readConfig("command-hooks.json", HookSchema, projectDir, {
				createIfMissing: {
					$schema: "https://example.com/command-hooks.schema.json",
					hooks: {},
				},
			}),
		);

		expect(config.hooks).toEqual({});
		expect(JSON.parse(readText(path) ?? "")).toEqual({
			$schema: "https://example.com/command-hooks.schema.json",
			hooks: {},
		});
		expect(mkdirSyncMock).toHaveBeenCalledWith(join(projectDir, ".pi"), {
			recursive: true,
		});
		expect(writeFileSyncMock).toHaveBeenCalledWith(
			path,
			expect.any(String),
			"utf-8",
		);
	});

	test("returns validated project config when file exists", () => {
		writeJson(getProjectConfigPath(projectDir, "command-hooks.json"), {
			hooks: { session_start: ["echo hello"] },
		});

		const config = Effect.runSync(
			readConfig("command-hooks.json", HookSchema, projectDir),
		);
		expect(config.hooks?.session_start).toEqual(["echo hello"]);
	});

	test("merges global and project config with project override", () => {
		writeJson(getGlobalConfigPath("command-hooks.json"), {
			hooks: { session_start: ["global"], agent_end: ["global-end"] },
		});
		writeJson(getProjectConfigPath(projectDir, "command-hooks.json"), {
			hooks: { session_start: ["project"] },
		});

		const config = Effect.runSync(
			readConfig("command-hooks.json", HookSchema, projectDir),
		);
		expect(config.hooks).toEqual({
			session_start: ["project"],
			agent_end: ["global-end"],
		});
	});

	test("fails with ParseError on malformed JSON file", () => {
		writeText(getProjectConfigPath(projectDir, "command-hooks.json"), "{");

		const exit = Effect.runSyncExit(
			readConfig("command-hooks.json", HookSchema, projectDir),
		);
		expect(Exit.isFailure(exit)).toBe(true);
		if (Exit.isFailure(exit) && Cause.isFailType(exit.cause)) {
			expect(exit.cause.error).toBeInstanceOf(ParseError);
		}
	});
});

describe("readSettings", () => {
	test("merges global and project settings", () => {
		writeJson(getGlobalConfigPath("settings.json"), {
			defaultModel: "global-model",
			nested: { a: 1, b: 2 },
		});
		writeJson(getProjectConfigPath(projectDir, "settings.json"), {
			defaultModel: "project-model",
			nested: { b: 3 },
			local: true,
		});

		const settings = Effect.runSync(readSettings(projectDir));
		expect(settings).toEqual({
			defaultModel: "project-model",
			nested: { a: 1, b: 3 },
			local: true,
		});
	});

	test("returns empty object when no settings files exist", () => {
		const settings = Effect.runSync(readSettings(projectDir));
		expect(settings).toEqual({});
	});
});
