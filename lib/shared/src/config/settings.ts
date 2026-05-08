import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { Effect, Option, Schema } from "effect";
import { type ConfigError, FileNotFoundError, WriteError } from "./errors.js";
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

const writeConfigFile = (
	path: string,
	value: Readonly<Record<string, unknown>>,
): Effect.Effect<void, ConfigError> =>
	Effect.try({
		try: () => {
			mkdirSync(dirname(path), { recursive: true });
			writeFileSync(path, `${JSON.stringify(value, null, "\t")}\n`, "utf-8");
		},
		catch: (err) => new WriteError(path, err),
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

export interface ReadConfigOptions {
	readonly createIfMissing?: Readonly<Record<string, unknown>>;
}

export const readConfig = <A, I>(
	filename: string,
	schema: Schema.Schema<A, I>,
	cwd: string = process.cwd(),
	options: ReadConfigOptions = {},
): Effect.Effect<A, ConfigError> =>
	Effect.gen(function* () {
		const globalPath = getGlobalConfigPath(filename);
		const projectPath = getProjectConfigPath(cwd, filename);

		const globalConfig = yield* readConfigFile(globalPath);
		const projectConfig = yield* readConfigFile(projectPath);

		if (Option.isNone(globalConfig) && Option.isNone(projectConfig)) {
			if (options.createIfMissing === undefined) {
				return yield* Effect.fail(new FileNotFoundError(projectPath));
			}

			yield* writeConfigFile(projectPath, options.createIfMissing);
			return yield* decodeConfig(options.createIfMissing, schema);
		}

		const merged = mergeSettings(
			Option.getOrElse(globalConfig, () => ({})),
			Option.getOrElse(projectConfig, () => ({})),
		);

		const config = yield* decodeConfig(merged, schema);

		return config;
	});
