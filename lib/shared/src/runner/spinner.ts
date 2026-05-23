import type { ExtensionContext } from "@earendil-works/pi-coding-agent";

const spinnerFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
let spinnerId = 0;

function formatCommand(command: string): string {
	return command.length > 60 ? `${command.slice(0, 57)}...` : command;
}

export function startCommandSpinner(
	ctx: ExtensionContext,
	command: string,
	silent: boolean,
): () => void {
	if (!ctx.hasUI) return () => {};

	const index = ++spinnerId;
	const statusKey = `runner:${index}`;
	const theme = ctx.ui.theme;
	const displayCommand = silent
		? `${formatCommand(command)} (silent)`
		: formatCommand(command);
	const text = `${theme.fg("dim", `[${index}] `)}${theme.fg("bashMode", displayCommand)}`;
	let frameIndex = 0;

	const render = (): void => {
		const frame = theme.fg("accent", spinnerFrames[frameIndex] ?? "⠋");
		ctx.ui.setStatus(statusKey, `${frame} ${text}`);
		frameIndex = (frameIndex + 1) % spinnerFrames.length;
	};

	render();
	const timer = setInterval(render, 100);

	return () => {
		clearInterval(timer);
		ctx.ui.setStatus(statusKey, undefined);
	};
}
