import { Schema } from "effect";

export const CommandEntryStruct = Schema.Struct({
	command: Schema.String,
	cwd: Schema.optional(Schema.String),
	timeout: Schema.optional(Schema.Number),
	print: Schema.optional(Schema.Boolean),
	context: Schema.optional(Schema.Boolean),
	interactive: Schema.optional(Schema.Boolean),
});

export const CommandEntrySchema = Schema.transform(
	Schema.Union(Schema.String, CommandEntryStruct),
	CommandEntryStruct,
	{
		decode: (from) => (typeof from === "string" ? { command: from } : from),
		encode: (to) => to,
	},
);

export type CommandEntry = Schema.Schema.Type<typeof CommandEntrySchema>;
