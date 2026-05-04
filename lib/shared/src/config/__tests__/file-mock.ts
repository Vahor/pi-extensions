import { mock } from "bun:test";

const files = new Map<string, string>();

export const readFileSyncMock = mock((path: string | URL): string => {
	const key = path.toString();
	const value = files.get(key);
	if (value !== undefined) return value;

	const error = new Error(
		`ENOENT: no such file or directory, open '${key}'`,
	) as NodeJS.ErrnoException;
	error.code = "ENOENT";
	throw error;
});

mock.module("node:fs", () => ({
	readFileSync: readFileSyncMock,
}));

export const writeText = (path: string, content: string): void => {
	files.set(path, content);
};

export const writeJson = (path: string, value: unknown): void => {
	writeText(path, JSON.stringify(value));
};

export const resetFileMock = (): void => {
	files.clear();
	readFileSyncMock.mockClear();
};
