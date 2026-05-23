import type { ExtensionUIContext } from "@earendil-works/pi-coding-agent";

// Pi does not expose a public "custom UI is active" flag.
// Store our tracker on the shared UI context so we install it once, even after reloads.
const activitySymbol = Symbol.for("@vahor/pi-keymap.ui-activity");

interface UiActivityState {
	active: number;
	isActive: () => boolean;
}

type TrackedUiContext = ExtensionUIContext & {
	[activitySymbol]?: UiActivityState;
};

function trackCustomUi<T>(
	state: UiActivityState,
	run: () => Promise<T>,
): Promise<T> {
	// Raw terminal listeners run before the focused overlay receives input.
	// Count pending custom UI promises so the leader listener can ignore keys during them.
	state.active++;

	try {
		return Promise.resolve(run()).finally(() => {
			state.active = Math.max(0, state.active - 1);
		});
	} catch (error) {
		state.active = Math.max(0, state.active - 1);
		throw error;
	}
}

/**
 * Track pending `ctx.ui.custom()` calls so the leader-key raw terminal listener
 * can ignore keys while another extension owns the UI focus.
 *
 * This prevents compatibility issues with overlay extensions such as `/mcp`,
 * where pressing Space inside their modal should toggle an item instead of
 * opening pi-keymap's which-key overlay.
 */
export function installUiActivityTracker(
	ui: ExtensionUIContext,
): () => boolean {
	const trackedUi = ui as TrackedUiContext;
	const existing = trackedUi[activitySymbol];
	if (existing) return existing.isActive;

	const state: UiActivityState = {
		active: 0,
		isActive: () => state.active > 0,
	};
	trackedUi[activitySymbol] = state;

	const custom = ui.custom.bind(ui);
	trackedUi.custom = ((factory, options) =>
		trackCustomUi(state, () =>
			custom(factory, options),
		)) as ExtensionUIContext["custom"];

	return state.isActive;
}
