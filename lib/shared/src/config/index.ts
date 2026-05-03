export {
	type ConfigError,
	FileNotFoundError,
	ParseError,
	ValidationError,
} from "./errors.js";
export { mergeSettings } from "./merge.js";
export { parseConfig } from "./parse.js";
export {
	getGlobalConfigPath,
	getProjectConfigPath,
	getProjectSettingsPath,
	getSettingsPath,
} from "./paths.js";
export { readConfig, readSettings } from "./settings.js";
