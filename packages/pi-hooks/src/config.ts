import { Schema } from "effect";
import { PiEvent } from "./events.js";

const HookEntryStruct = Schema.Struct({
	command: Schema.String,
	cwd: Schema.optional(Schema.String),
	timeout: Schema.optional(Schema.Number),
	print: Schema.optional(Schema.Boolean),
	context: Schema.optional(Schema.Boolean),
	interactive: Schema.optional(Schema.Boolean),
});

export const HookEntrySchema = Schema.transform(
	Schema.Union(Schema.String, HookEntryStruct),
	HookEntryStruct,
	{
		decode: (from) => (typeof from === "string" ? { command: from } : from),
		encode: (to) => to,
	},
);

export const CommandHooksConfigSchema = Schema.Struct({
	hooks: Schema.partial(
		Schema.Record({
			key: PiEvent,
			value: Schema.Array(HookEntrySchema),
		}),
	),
}).annotations({
	message: () => ({
		override: true,
		message: `Invalid hooks.json. Expected format:
{
  "hooks": {
    "<event>": ["command", { "command": "...", "cwd": ".", "timeout": 30000, "interactive": true }]
  }
}
Valid events: ${PiEvent.literals.join(", ")}`,
	}),
});

export type HookEntry = Schema.Schema.Type<typeof HookEntrySchema>;
export type CommandHooksConfig = Schema.Schema.Type<
	typeof CommandHooksConfigSchema
>;

export { PiEvent };
