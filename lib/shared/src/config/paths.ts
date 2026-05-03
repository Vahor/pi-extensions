import { homedir } from "node:os";
import { join } from "node:path";

const homeDir = process.env.HOME ?? process.env.USERPROFILE ?? homedir();

export const getGlobalConfigPath = (filename: string): string =>
	join(homeDir, ".pi", "agent", filename);

export const getProjectConfigPath = (cwd: string, filename: string): string =>
	join(cwd, ".pi", filename);

export const getSettingsPath = (): string =>
	getGlobalConfigPath("settings.json");

export const getProjectSettingsPath = (cwd: string): string =>
	getProjectConfigPath(cwd, "settings.json");
