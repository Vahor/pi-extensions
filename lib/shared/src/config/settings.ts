import { readFileSync } from "node:fs";
import { Effect, Option, Schema } from "effect";
import { type ConfigError, FileNotFoundError } from "./errors.js";
import { mergeSettings } from "./merge.js";
import { decodeConfig, parseJson } from "./parse.js";
import { getGlobalConfigPath, getProjectConfigPath } from "./paths.js";

const JsonObjectSchema = Schema.Record({
	key: Schema.String,
	value: Schema.Unknown,
});

const isEnoent = (err: unknown): boolean =>
	typeof err === "object" &&
	err !== null &&
	"code" in err &&
	err.code === "ENOENT";

const tryReadFile = (path: string): Option.Option<string> => {
	try {
		return Option.some(readFileSync(path, "utf-8"));
	} catch (err) {
		if (isEnoent(err)) return Option.none();
		throw err;
	}
};

const readConfigFile = (
	path: string,
): Effect.Effect<Option.Option<Record<string, unknown>>, ConfigError> =>
	Effect.gen(function* () {
		const raw = yield* Effect.sync(() => tryReadFile(path));

		if (Option.isNone(raw)) return Option.none();

		const parsed = yield* parseJson(path, raw.value);
		const object = yield* decodeConfig(parsed, JsonObjectSchema);
		return Option.some(object);
	});

const readConfigFiles = (
	cwd: string,
	filename: string,
): Effect.Effect<Record<string, unknown>, ConfigError> =>
	Effect.gen(function* () {
		const globalConfig = yield* readConfigFile(getGlobalConfigPath(filename));
		const projectConfig = yield* readConfigFile(
			getProjectConfigPath(cwd, filename),
		);

		return mergeSettings(
			Option.getOrElse(globalConfig, () => ({})),
			Option.getOrElse(projectConfig, () => ({})),
		);
	});

export const readSettings = (
	cwd: string = process.cwd(),
): Effect.Effect<Record<string, unknown>, ConfigError> =>
	readConfigFiles(cwd, "settings.json");

export const readConfig = <A, I>(
	filename: string,
	schema: Schema.Schema<A, I>,
	cwd: string = process.cwd(),
): Effect.Effect<A, ConfigError> =>
	Effect.gen(function* () {
		const globalPath = getGlobalConfigPath(filename);
		const projectPath = getProjectConfigPath(cwd, filename);

		const globalConfig = yield* readConfigFile(globalPath);
		const projectConfig = yield* readConfigFile(projectPath);

		if (Option.isNone(globalConfig) && Option.isNone(projectConfig)) {
			return yield* Effect.fail(new FileNotFoundError(projectPath));
		}

		const merged = mergeSettings(
			Option.getOrElse(globalConfig, () => ({})),
			Option.getOrElse(projectConfig, () => ({})),
		);

		const config = yield* decodeConfig(merged, schema);

		return config;
	});
