import {
	type CommandEntry,
	CommandEntrySchema,
} from "@vahor/shared/runner/config";
import { Schema } from "effect";
import { PiEvent } from "./events.js";

export const HooksConfigSchemaUrl =
	"https://raw.githubusercontent.com/Vahor/pi-extensions/main/packages/pi-hooks/schemas/hooks.schema.json";

export const CommandHooksConfigSchema = Schema.Struct({
	$schema: Schema.optional(Schema.String),
	hooks: Schema.partial(
		Schema.Record({
			key: PiEvent,
			value: Schema.Array(CommandEntrySchema),
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

export const EmptyCommandHooksConfig = {
	$schema: HooksConfigSchemaUrl,
	hooks: {},
} as const;

export type HookEntry = CommandEntry;
export type CommandHooksConfig = Schema.Schema.Type<
	typeof CommandHooksConfigSchema
>;

export { PiEvent };
