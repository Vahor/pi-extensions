import { spawn } from "node:child_process";
import { resolve } from "node:path";
import type {
	ExtensionAPI,
	ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { buildRenderedOutput, renderCommandResult } from "./renderer.js";

export { registerCommandRenderer } from "./renderer.js";

export interface CommandEntry {
	command: string;
	cwd?: string;
	timeout?: number;
	print?: boolean;
	context?: boolean;
	interactive?: boolean;
}

const spinnerFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
let spinnerId = 0;

interface CommandResult {
	stdout: string;
	stderr: string;
	code: number;
}

const MAX_CONTEXT_OUTPUT_LENGTH = 20_000;

function truncateOutput(output: string): string {
	if (output.length <= MAX_CONTEXT_OUTPUT_LENGTH) return output;

	const truncationNote = `…\n[output truncated to ${MAX_CONTEXT_OUTPUT_LENGTH} characters; showing tail]\n`;
	return `${truncationNote}${output.slice(
		-(MAX_CONTEXT_OUTPUT_LENGTH - truncationNote.length),
	)}`;
}

function formatCommand(command: string): string {
	return command.length > 60 ? `${command.slice(0, 57)}...` : command;
}

function startCommandSpinner(
	ctx: ExtensionContext,
	command: string,
	index: number,
	silent: boolean,
): () => void {
	if (!ctx.hasUI) return () => {};

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

async function runInteractiveCommand(
	command: string,
	cwd: string,
	ctx: ExtensionContext,
): Promise<CommandResult> {
	if (!ctx.hasUI || !process.stdin.isTTY || !process.stdout.isTTY) {
		const message = "interactive commands require pi's interactive TUI";
		return {
			stdout: "",
			stderr: message,
			code: 1,
		};
	}

	return ctx.ui.custom<CommandResult>((tui, _theme, _kb, done) => {
		const shell = process.env.SHELL || "/bin/sh";
		let completed = false;

		const finish = (result: CommandResult): void => {
			if (completed) return;
			completed = true;
			tui.start();
			tui.requestRender(true);
			done({
				...result,
				stderr: result.stderr || "interactive command output is not captured",
			});
		};

		tui.stop();

		const child = spawn(shell, ["-c", command], {
			cwd,
			stdio: "inherit",
			env: process.env,
		});

		child.on("error", (error) => {
			finish({ code: 1, stderr: error.message, stdout: "" });
		});
		child.on("exit", (code, signal) => {
			const message = signal ? `terminated by ${signal}` : undefined;
			finish({
				code: code ?? (signal ? 1 : 0),
				stderr: message ?? "",
				stdout: "",
			});
		});

		return { render: () => [], invalidate: () => {} };
	});
}

function formatContextMessage(
	command: string,
	cwd: string,
	stdout: string,
	stderr: string,
	code: number,
): string {
	const sections = [`Ran \`${command}\``, `Working directory: \`${cwd}\``];
	const truncatedStdout = truncateOutput(stdout);
	const truncatedStderr = truncateOutput(stderr);

	if (stdout) {
		sections.push(`stdout:\n\`\`\`\n${truncatedStdout}\n\`\`\``);
	}
	if (stderr) {
		sections.push(`stderr:\n\`\`\`\n${truncatedStderr}\n\`\`\``);
	}
	if (!stdout && !stderr) {
		sections.push("(no output)");
	}
	if (code !== 0) {
		sections.push(`Command exited with code ${code}.`);
	}

	return sections.join("\n\n");
}

function handleCommandResult(
	pi: ExtensionAPI,
	ctx: ExtensionContext,
	options: {
		command: string;
		cwd: string;
		print: boolean;
		context: boolean | undefined;
		result: CommandResult;
	},
): void {
	const { command, cwd, print, context, result } = options;

	if (print || context) {
		const content =
			context === true
				? formatContextMessage(
						command,
						cwd,
						result.stdout,
						result.stderr,
						result.code,
					)
				: "";
		renderCommandResult(
			pi,
			ctx,
			{
				command,
				cwd,
				code: result.code,
				output: buildRenderedOutput(result),
				includeInContext: context === true,
				silent: !print,
			},
			{ content, display: print },
		);
	}
}

export async function runCommands(
	commands: readonly CommandEntry[],
	cwd: string,
	pi: ExtensionAPI,
	ctx: ExtensionContext,
	_label: string,
): Promise<void> {
	for (const {
		command,
		cwd: commandCwd,
		timeout,
		print = true,
		context,
		interactive,
	} of commands) {
		const index = ++spinnerId;
		const resolvedCwd = commandCwd ? resolve(cwd, commandCwd) : cwd;
		const shell = process.env.SHELL || "/bin/sh";

		const stopSpinner = interactive
			? () => {}
			: startCommandSpinner(ctx, command, index, !print);

		try {
			const result = interactive
				? await runInteractiveCommand(command, resolvedCwd, ctx)
				: await pi.exec(shell, ["-c", command], {
						cwd: resolvedCwd,
						timeout: timeout ?? 30_000,
					});

			handleCommandResult(pi, ctx, {
				command,
				cwd: resolvedCwd,
				print,
				context,
				result,
			});
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			handleCommandResult(pi, ctx, {
				command,
				cwd: resolvedCwd,
				print,
				context,
				result: { code: 1, stdout: "", stderr: message },
			});
		} finally {
			stopSpinner();
		}
	}
}
