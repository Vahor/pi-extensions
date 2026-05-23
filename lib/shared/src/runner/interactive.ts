import { spawn } from "node:child_process";
import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { CommandResult } from "./types.js";

export async function runInteractiveCommand(
	command: string,
	cwd: string,
	ctx: ExtensionContext,
	timeout = 30_000,
): Promise<CommandResult> {
	if (!ctx.hasUI || !process.stdin.isTTY || !process.stdout.isTTY) {
		return {
			stdout: "",
			stderr: "interactive commands require pi's interactive TUI",
			code: 1,
		};
	}

	return ctx.ui.custom<CommandResult>((tui, _theme, _kb, done) => {
		const shell = process.env.SHELL || "/bin/sh";
		let completed = false;
		let exited = false;
		let timeoutTimer: ReturnType<typeof setTimeout> | undefined;
		let killTimer: ReturnType<typeof setTimeout> | undefined;

		const clearTimeoutTimer = (): void => {
			if (!timeoutTimer) return;
			clearTimeout(timeoutTimer);
			timeoutTimer = undefined;
		};

		const clearKillTimer = (): void => {
			if (!killTimer) return;
			clearTimeout(killTimer);
			killTimer = undefined;
		};

		const finish = (
			result: CommandResult,
			options: { clearKillTimer?: boolean } = {},
		): void => {
			if (completed) return;
			completed = true;
			clearTimeoutTimer();
			if (options.clearKillTimer ?? true) clearKillTimer();
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

		const killChild = (signal: NodeJS.Signals): void => {
			if (child.pid === undefined || exited) return;
			try {
				child.kill(signal);
			} catch {
				// Ignore races where the child exits between the pid check and kill call.
			}
		};

		if (timeout > 0) {
			timeoutTimer = setTimeout(() => {
				killChild("SIGTERM");
				killTimer = setTimeout(() => {
					killTimer = undefined;
					killChild("SIGKILL");
				}, 1000);
				finish(
					{
						code: 124,
						stderr: `interactive command timed out after ${timeout}ms`,
						stdout: "",
					},
					{ clearKillTimer: false },
				);
			}, timeout);
		}

		child.on("error", (error) => {
			clearKillTimer();
			finish({ code: 1, stderr: error.message, stdout: "" });
		});
		child.on("exit", (code, signal) => {
			exited = true;
			clearKillTimer();
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
