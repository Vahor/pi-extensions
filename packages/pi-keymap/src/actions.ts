import type {
	ExtensionAPI,
	ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { runCommands } from "@vahor/shared/runner";
import type { KeymapEntry } from "./config.js";

function applyPrompt(
	pi: ExtensionAPI,
	ctx: ExtensionContext,
	content: string,
	send: boolean,
): void {
	if (send) {
		pi.sendUserMessage(content);
		return;
	}

	ctx.ui.setEditorText(content);
}

async function runPrompt(
	entry: KeymapEntry,
	pi: ExtensionAPI,
	ctx: ExtensionContext,
): Promise<void> {
	if (entry.prompt === undefined) return;

	if (entry.open === false) {
		applyPrompt(pi, ctx, entry.prompt, entry.send ?? false);
		return;
	}

	const content = await ctx.ui.editor(
		entry.description ?? "Editor",
		entry.prompt,
	);
	if (content === undefined) return;

	applyPrompt(pi, ctx, content, entry.send ?? false);
}

export async function runEntry(
	entry: KeymapEntry,
	cwd: string,
	pi: ExtensionAPI,
	ctx: ExtensionContext,
	label: string,
): Promise<void> {
	if (entry.commands?.length) {
		await runCommands(entry.commands, cwd, pi, ctx);
		return;
	}

	if (entry.prompt !== undefined) {
		await runPrompt(entry, pi, ctx);
		return;
	}

	ctx.ui.notify(`${label} has no commands or prompt`, "warning");
}
