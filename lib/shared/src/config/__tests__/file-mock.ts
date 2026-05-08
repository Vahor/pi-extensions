import { mock } from "bun:test";

const files = new Map<string, string>();

export const mkdirSyncMock = mock((): void => {});

export const writeFileSyncMock = mock(
	(path: string | URL, content: string): void => {
		files.set(path.toString(), content);
	},
);

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
	mkdirSync: mkdirSyncMock,
	readFileSync: readFileSyncMock,
	writeFileSync: writeFileSyncMock,
}));

export const writeText = (path: string, content: string): void => {
	files.set(path, content);
};

export const writeJson = (path: string, value: unknown): void => {
	writeText(path, JSON.stringify(value));
};

export const readText = (path: string): string | undefined => files.get(path);

export const resetFileMock = (): void => {
	files.clear();
	mkdirSyncMock.mockClear();
	readFileSyncMock.mockClear();
	writeFileSyncMock.mockClear();
};
