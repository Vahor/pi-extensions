import { readFileSync } from "node:fs";
import { Effect, type Schema } from "effect";
import type { ConfigError } from "./errors.js";
import { mergeSettings } from "./merge.js";
import { parseConfig } from "./parse.js";
import { getGlobalConfigPath, getProjectConfigPath } from "./paths.js";

const readSettingsFile = (path: string): Record<string, unknown> => {
	try {
		const raw = readFileSync(path, "utf-8");
		return JSON.parse(raw);
	} catch {
		return {};
	}
};

const readConfigFiles = (
	cwd: string,
	filename: string,
): Effect.Effect<Record<string, unknown>> =>
	Effect.sync(() =>
		mergeSettings(
			readSettingsFile(getGlobalConfigPath(filename)),
			readSettingsFile(getProjectConfigPath(cwd, filename)),
		),
	);

export const readSettings = (
	cwd: string = process.cwd(),
): Effect.Effect<Record<string, unknown>> =>
	readConfigFiles(cwd, "settings.json");

export const readConfig = <A, I>(
	filename: string,
	schema: Schema.Schema<A, I>,
	cwd: string = process.cwd(),
): Effect.Effect<A, ConfigError> =>
	readConfigFiles(cwd, filename).pipe(
		Effect.flatMap((merged) => parseConfig(JSON.stringify(merged), schema)),
	);
