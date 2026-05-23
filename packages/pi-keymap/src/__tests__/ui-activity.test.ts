import { describe, expect, test } from "bun:test";
import type { ExtensionUIContext } from "@earendil-works/pi-coding-agent";
import { installUiActivityTracker } from "../ui-activity.js";

function deferred<T>(): {
	promise: Promise<T>;
	resolve: (value: T) => void;
	reject: (error: unknown) => void;
} {
	let resolve!: (value: T) => void;
	let reject!: (error: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

function createUi(overrides: Partial<ExtensionUIContext>): ExtensionUIContext {
	return {
		select: async () => undefined,
		confirm: async () => false,
		input: async () => undefined,
		notify: () => {},
		onTerminalInput: () => () => {},
		setStatus: () => {},
		setWorkingMessage: () => {},
		setWorkingVisible: () => {},
		setWorkingIndicator: () => {},
		setHiddenThinkingLabel: () => {},
		setWidget: () => {},
		setFooter: () => {},
		setHeader: () => {},
		setTitle: () => {},
		custom: async () => undefined,
		pasteToEditor: () => {},
		setEditorText: () => {},
		getEditorText: () => "",
		editor: async () => undefined,
		addAutocompleteProvider: () => {},
		setEditorComponent: () => {},
		getEditorComponent: () => undefined,
		get theme() {
			return {} as ExtensionUIContext["theme"];
		},
		getAllThemes: () => [],
		getTheme: () => undefined,
		setTheme: () => ({ success: false }),
		getToolsExpanded: () => false,
		setToolsExpanded: () => {},
		...overrides,
	} as ExtensionUIContext;
}

describe("installUiActivityTracker", () => {
	test("reports active while custom UI is pending", async () => {
		const pending = deferred<string>();
		const ui = createUi({
			custom: <T>() => pending.promise as Promise<T>,
		});

		const isActive = installUiActivityTracker(ui);
		const result = ui.custom<string>(() => ({
			render: () => [],
			invalidate: () => {},
		}));

		expect(isActive()).toBe(true);
		pending.resolve("done");
		await expect(result).resolves.toBe("done");
		expect(isActive()).toBe(false);
	});

	test("does not double-wrap the same UI context", async () => {
		const pending = deferred<string>();
		let calls = 0;
		const ui = createUi({
			custom: <T>() => {
				calls++;
				return pending.promise as Promise<T>;
			},
		});

		const isActiveA = installUiActivityTracker(ui);
		const isActiveB = installUiActivityTracker(ui);
		const result = ui.custom<string>(() => ({
			render: () => [],
			invalidate: () => {},
		}));

		expect(calls).toBe(1);
		expect(isActiveA()).toBe(true);
		expect(isActiveB()).toBe(true);
		pending.resolve("text");
		await expect(result).resolves.toBe("text");
		expect(isActiveA()).toBe(false);
		expect(isActiveB()).toBe(false);
	});
});
