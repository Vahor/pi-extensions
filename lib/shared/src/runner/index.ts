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

interface InteractiveCommandResult {
	code: number;
	killed: boolean;
	message?: string;
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
	killed: boolean,
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
	if (killed) {
		sections.push("Command was killed.");
	} else if (code !== 0) {
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
	killed: boolean,
): void {
	pi.sendMessage({
		customType: "command-context",
		content: formatContextMessage(command, cwd, stdout, stderr, code, killed),
		display: true,
		details: { command, cwd, stdout, stderr, code, killed },
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
	timeout: number | undefined,
	ctx: ExtensionContext,
): Promise<InteractiveCommandResult> {
	if (!ctx.hasUI || !process.stdin.isTTY || !process.stdout.isTTY) {
		return {
			code: 1,
			killed: false,
			message: "interactive commands require pi's interactive TUI",
		};
	}

	return ctx.ui.custom<InteractiveCommandResult>((tui, _theme, _kb, done) => {
		const shell = process.env.SHELL || "/bin/sh";
		let completed = false;
		let killed = false;
		let forceKillTimer: ReturnType<typeof setTimeout> | undefined;
		let timeoutTimer: ReturnType<typeof setTimeout> | undefined;

		const finish = (result: InteractiveCommandResult): void => {
			if (completed) return;
			completed = true;
			if (timeoutTimer) clearTimeout(timeoutTimer);
			if (forceKillTimer) clearTimeout(forceKillTimer);
			tui.start();
			tui.requestRender(true);
			done(result);
		};

		tui.stop();
		process.stdout.write("\x1b[2J\x1b[H");

		const child = spawn(shell, ["-c", command], {
			cwd,
			stdio: "inherit",
			env: process.env,
		});

		const killChild = (): void => {
			if (killed) return;
			killed = true;
			child.kill("SIGTERM");
			forceKillTimer = setTimeout(() => {
				if (!child.killed) child.kill("SIGKILL");
			}, 5000);
		};

		if (timeout && timeout > 0) {
			timeoutTimer = setTimeout(killChild, timeout);
		}

		child.on("error", (error) => {
			finish({ code: 1, killed, message: error.message });
		});
		child.on("exit", (code, signal) => {
			finish({
				code: code ?? (signal ? 1 : 0),
				killed,
				message: signal ? `terminated by ${signal}` : undefined,
			});
		});

		return { render: () => [], invalidate: () => {} };
	});
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

		const stopSpinner = interactive
			? () => {}
			: startCommandSpinner(ctx, command, index);

		try {
			if (interactive) {
				const result = await runInteractiveCommand(
					command,
					resolvedCwd,
					timeout,
					ctx,
				);

				if (context) {
					sendCommandContext(
						pi,
						command,
						resolvedCwd,
						"",
						result.message ?? "interactive command output is not captured",
						result.code,
						result.killed,
					);
				}

				if (result.code !== 0) {
					ctx.ui.notify(
						`${notifyLabel} "${command}" failed (exit ${result.code})${result.message ? `:\n  ↳ ${result.message}` : ""}`,
						"error",
					);
				} else if (print) {
					ctx.ui.notify(`${notifyLabel} "${command}" completed`, "info");
				}
				continue;
			}

			const result = await pi.exec("/bin/sh", ["-c", command], {
				cwd: resolvedCwd,
				timeout: timeout ?? 30_000,
			});

			const output = (
				result.stderr.toString().trim() || result.stdout.toString().trim()
			).slice(0, 300);
			if (context) {
				sendCommandContext(
					pi,
					command,
					resolvedCwd,
					result.stdout.trim(),
					result.stderr.trim(),
					result.code,
					result.killed,
				);
			}

			if (result.code !== 0) {
				ctx.ui.notify(
					`${notifyLabel} "${command}" failed (exit ${result.code})${output ? `:\n  ↳ ${output}` : ""}`,
					"error",
				);
			} else if (print) {
				ctx.ui.notify(
					`${notifyLabel} "${command}" succeeded${output ? `:\n  ↳ ${output}` : ""}`,
					"info",
				);
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			if (context) {
				sendCommandContext(pi, command, resolvedCwd, "", message, 1, false);
			}
			ctx.ui.notify(`${notifyLabel} "${command}" error: ${message}`, "error");
		} finally {
			stopSpinner();
		}
	}
}
