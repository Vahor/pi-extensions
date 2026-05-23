import type {
	ExtensionAPI,
	ExtensionContext,
	MessageRenderer,
} from "@earendil-works/pi-coding-agent";
import { BashExecutionComponent } from "@earendil-works/pi-coding-agent";

const runnerCommandMessageType = "vahor.runner.command";
const registeredRenderers = new WeakSet<ExtensionAPI>();

type BashExecutionTui = ConstructorParameters<typeof BashExecutionComponent>[1];

export interface CommandOutputForRender {
	stdout: string;
	stderr: string;
}

export interface CommandRenderDetails {
	command: string;
	cwd: string;
	code: number;
	output: string;
	includeInContext: boolean;
	silent?: boolean;
}

export function buildRenderedOutput(result: CommandOutputForRender): string {
	const combinedOutput = [result.stdout.trim(), result.stderr.trim()]
		.filter(Boolean)
		.join("\n");
	return combinedOutput;
}

function formatRenderedCommand(details: CommandRenderDetails): string {
	return details.silent ? `${details.command} (silent)` : details.command;
}

export function createCompletedBashExecutionComponent(
	details: CommandRenderDetails,
	options: {
		expanded: boolean;
		tui?: BashExecutionTui;
	} = { expanded: false },
): BashExecutionComponent {
	const component = new BashExecutionComponent(
		formatRenderedCommand(details),
		options.tui as BashExecutionTui,
		!details.includeInContext,
	);

	if (details.output) {
		component.appendOutput(details.output);
	}

	component.setExpanded(options.expanded);
	component.setComplete(details.code, false);
	return component;
}

const renderRunnerCommandMessage: MessageRenderer<CommandRenderDetails> = (
	message,
	{ expanded },
) => {
	const details = message.details;
	if (!details) return undefined;

	return createCompletedBashExecutionComponent(details, { expanded });
};

export function registerCommandRenderer(pi: ExtensionAPI): void {
	if (registeredRenderers.has(pi)) return;
	registeredRenderers.add(pi);

	pi.registerMessageRenderer(
		runnerCommandMessageType,
		renderRunnerCommandMessage,
	);
}

export function renderCommandResult(
	pi: ExtensionAPI,
	ctx: ExtensionContext,
	details: CommandRenderDetails,
	options: {
		content: string;
		display: boolean;
	},
): void {
	const display = options.display && ctx.hasUI;
	if (!display && !details.includeInContext) return;

	pi.sendMessage({
		customType: runnerCommandMessageType,
		content: options.content,
		display,
		details,
	});
}
