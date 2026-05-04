import type { Theme } from "@mariozechner/pi-coding-agent";
import {
	type KeyId,
	matchesKey,
	truncateToWidth,
	visibleWidth,
} from "@mariozechner/pi-tui";
import type { KeymapCommand } from "./config.js";

export interface LeaderEntry {
	key: string;
	label: string;
	commands: readonly KeymapCommand[];
}

/**
 * Full-screen bottom overlay showing leader key mappings, like nvim which-key.
 * Rendered with a border and two-column layout.
 */
export class WhichKeyOverlay {
	private timer: ReturnType<typeof setTimeout> | null = null;

	constructor(
		private theme: Theme,
		private entries: LeaderEntry[],
		private onSelect: (entry: LeaderEntry) => void,
		private onClose: () => void,
		private prefixLabel: string,
	) {
		this.resetTimer();
	}

	private resetTimer(): void {
		if (this.timer) clearTimeout(this.timer);
		this.timer = setTimeout(() => this.onClose(), 5000);
	}

	handleInput(data: string): void {
		this.resetTimer();

		if (matchesKey(data, "escape")) {
			this.done();
			return;
		}

		for (const entry of this.entries) {
			if (matchesKey(data, entry.key as KeyId)) {
				this.onSelect(entry);
				return;
			}
		}
	}

	private done(): void {
		if (this.timer) clearTimeout(this.timer);
		this.onClose();
	}

	render(width: number): string[] {
		const th = this.theme;
		const innerW = width - 2;
		const lines: string[] = [];

		const title = ` ${this.prefixLabel} `;
		const remainingW = innerW - visibleWidth(title);
		const leftPad = Math.floor(remainingW / 2);
		const rightPad = remainingW - leftPad;

		lines.push(
			th.fg("border", "╭") +
				th.fg("border", "─".repeat(leftPad)) +
				th.fg("accent", title) +
				th.fg("border", "─".repeat(rightPad)) +
				th.fg("border", "╮"),
		);

		const gap = 2;
		const leftColWidth = Math.floor((innerW - gap) / 2);
		const rightColWidth = innerW - gap - leftColWidth;
		const pairs = Math.ceil(this.entries.length / 2);

		for (let i = 0; i < pairs; i++) {
			const left = this.entries[i * 2];
			const right = this.entries[i * 2 + 1];

			let line = th.fg("border", "│");

			if (left) {
				line += this.formatEntry(left, leftColWidth, th);
			} else {
				line += " ".repeat(leftColWidth);
			}

			line += " ".repeat(gap);

			if (right) {
				line += this.formatEntry(right, rightColWidth, th);
			} else {
				line += " ".repeat(rightColWidth);
			}

			line += "  ";

			line += th.fg("border", "│");
			lines.push(line);
		}

		const hint = " esc to close | press key ";
		lines.push(
			th.fg("border", "╰") +
				th.fg("dim", hint) +
				th.fg("border", "─".repeat(Math.max(0, innerW - visibleWidth(hint)))) +
				th.fg("border", "╯"),
		);

		return lines;
	}

	private formatEntry(entry: LeaderEntry, colWidth: number, th: Theme): string {
		const isPrefix = entry.commands.length === 0;
		const keyColor = isPrefix
			? th.fg("warning", entry.key.padEnd(6))
			: th.fg("accent", entry.key.padEnd(6));
		const label = isPrefix ? th.fg("dim", `+${entry.label}`) : entry.label;
		const truncated = truncateToWidth(label, colWidth - 7, "...", true);
		const padding = Math.max(0, colWidth - 7 - visibleWidth(truncated));
		return keyColor + truncated + " ".repeat(padding);
	}

	invalidate(): void {}
}
