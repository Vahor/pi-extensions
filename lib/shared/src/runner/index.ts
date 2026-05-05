import { spawn } from "node:child_process";
import { resolve } from "node:path";
import type {
	ExtensionAPI,
	ExtensionContext,
} from "@mariozechner/pi-coding-agent";

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
	notifyOutput?: string;
}

function formatCommand(command: string): string {
	return command.length > 60 ? `${command.slice(0, 57)}...` : command;
}

function formatContextMessage(
	command: string,
	cwd: string,
	stdout: string,
	stderr: string,
	code: number,
): string {
	const sections = [`Ran \`${command}\``, `Working directory: \`${cwd}\``];

	if (stdout) {
		sections.push(`stdout:\n\`\`\`\n${stdout}\n\`\`\``);
	}
	if (stderr) {
		sections.push(`stderr:\n\`\`\`\n${stderr}\n\`\`\``);
	}
	if (!stdout && !stderr) {
		sections.push("(no output)");
	}
	if (code !== 0) {
		sections.push(`Command exited with code ${code}.`);
	}

	return sections.join("\n\n");
}

function sendCommandContext(
	pi: ExtensionAPI,
	command: string,
	cwd: string,
	stdout: string,
	stderr: string,
	code: number,
): void {
	pi.sendMessage({
		customType: "command-context",
		content: formatContextMessage(command, cwd, stdout, stderr, code),
		display: true,
		details: { command, cwd, stdout, stderr, code },
	});
}

function startCommandSpinner(
	ctx: ExtensionContext,
	command: string,
	index: number,
): () => void {
	if (!ctx.hasUI) return () => {};

	const statusKey = `runner:${index}`;
	const theme = ctx.ui.theme;
	const text = `${theme.fg("dim", `[${index}] `)}${theme.fg("bashMode", formatCommand(command))}`;
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
			notifyOutput: message,
		};
	}

	return ctx.ui.custom<CommandResult>((tui, _theme, _kb, done) => {
		const shell = process.env.SHELL || "/bin/sh";
		let completed = false;

		const finish = (result: Omit<CommandResult, "stdout" | "stderr">): void => {
			if (completed) return;
			completed = true;
			tui.start();
			tui.requestRender(true);
			done({
				stdout: "",
				stderr:
					result.notifyOutput || "interactive command output is not captured",
				...result,
			});
		};

		tui.stop();

		const child = spawn(shell, ["-c", command], {
			cwd,
			stdio: "inherit",
			env: process.env,
		});

		child.on("error", (error) => {
			finish({ code: 1, notifyOutput: error.message });
		});
		child.on("exit", (code, signal) => {
			const message = signal ? `terminated by ${signal}` : undefined;
			finish({
				code: code ?? (signal ? 1 : 0),
				notifyOutput: message ?? "",
			});
		});

		return { render: () => [], invalidate: () => {} };
	});
}

function handleCommandResult(
	pi: ExtensionAPI,
	ctx: ExtensionContext,
	options: {
		command: string;
		cwd: string;
		notifyLabel: string;
		print: boolean;
		context: boolean | undefined;
		successVerb: string;
		result: CommandResult;
	},
): void {
	const { command, cwd, notifyLabel, print, context, successVerb, result } =
		options;
	const output = (
		result.notifyOutput ??
		(result.stderr.toString().trim() || result.stdout.toString().trim())
	).slice(0, 400);

	if (context) {
		sendCommandContext(
			pi,
			command,
			cwd,
			result.stdout.trim(),
			result.stderr.trim(),
			result.code,
		);
	}

	if (result.code !== 0) {
		ctx.ui.notify(
			`${notifyLabel} "${command}" failed (exit ${result.code})${output ? `:\n  ↳ ${output}` : ""}`,
			"error",
		);
	} else if (print) {
		ctx.ui.notify(
			`${notifyLabel} "${command}" ${successVerb}${output ? `:\n  ↳ ${output}` : ""}`,
			"info",
		);
	}
}

export async function runCommands(
	commands: readonly CommandEntry[],
	cwd: string,
	pi: ExtensionAPI,
	ctx: ExtensionContext,
	label: string,
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
		const notifyLabel = `[${index}] ${label}`;
		const resolvedCwd = commandCwd ? resolve(cwd, commandCwd) : cwd;
		const shell = process.env.SHELL || "/bin/sh";

		const stopSpinner = interactive
			? () => {}
			: startCommandSpinner(ctx, command, index);

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
				notifyLabel,
				print,
				context,
				successVerb: interactive ? "completed" : "succeeded",
				result,
			});
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			if (context) {
				sendCommandContext(pi, command, resolvedCwd, "", message, 1);
			}
			ctx.ui.notify(`${notifyLabel} "${command}" error: ${message}`, "error");
		} finally {
			stopSpinner();
		}
	}
}
