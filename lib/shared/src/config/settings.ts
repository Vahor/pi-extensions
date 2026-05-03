import { readFileSync } from "node:fs";
import { Effect, Option, type Schema } from "effect";
import { type ConfigError, FileNotFoundError } from "./errors.js";
import { mergeSettings } from "./merge.js";
import { parseConfig } from "./parse.js";
import { getGlobalConfigPath, getProjectConfigPath } from "./paths.js";

const tryReadJSON = (path: string): Option.Option<Record<string, unknown>> => {
	try {
		const raw = readFileSync(path, "utf-8");
		return Option.some(JSON.parse(raw) as Record<string, unknown>);
	} catch (err) {
		if (
			typeof err === "object" &&
			err !== null &&
			"code" in err &&
			err.code === "ENOENT"
		) {
			return Option.none();
		}
		throw err;
	}
};

const readSettingsFile = (
	path: string,
): Effect.Effect<Option.Option<Record<string, unknown>>> =>
	Effect.sync(() => tryReadJSON(path));

const readConfigFiles = (
	cwd: string,
	filename: string,
): Effect.Effect<Record<string, unknown>> =>
	Effect.gen(function* () {
		const globalConfig = yield* readSettingsFile(getGlobalConfigPath(filename));
		const projectConfig = yield* readSettingsFile(
			getProjectConfigPath(cwd, filename),
		);

		return mergeSettings(
			Option.getOrElse(globalConfig, () => ({})),
			Option.getOrElse(projectConfig, () => ({})),
		);
	});

export const readSettings = (
	cwd: string = process.cwd(),
): Effect.Effect<Record<string, unknown>> =>
	readConfigFiles(cwd, "settings.json");

export const readConfig = <A, I>(
	filename: string,
	schema: Schema.Schema<A, I>,
	cwd: string = process.cwd(),
): Effect.Effect<A, ConfigError> =>
	Effect.gen(function* () {
		const globalPath = getGlobalConfigPath(filename);
		const projectPath = getProjectConfigPath(cwd, filename);

		const globalConfig = yield* readSettingsFile(globalPath);
		const projectConfig = yield* readSettingsFile(projectPath);

		if (Option.isNone(globalConfig) && Option.isNone(projectConfig)) {
			return yield* Effect.fail(new FileNotFoundError(projectPath));
		}

		const merged = mergeSettings(
			Option.getOrElse(globalConfig, () => ({})),
			Option.getOrElse(projectConfig, () => ({})),
		);

		const config = yield* parseConfig(
			projectPath,
			JSON.stringify(merged),
			schema,
		);

		return config;
	});
