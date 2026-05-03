import { Schema } from "effect";

const HotkeyCommandStruct = Schema.Struct({
	command: Schema.String,
	shortcut: Schema.optional(Schema.String),
	cwd: Schema.optional(Schema.String),
	timeout: Schema.optional(Schema.Number),
	print: Schema.optional(Schema.Boolean),
});

export const HotkeyCommandSchema = Schema.transform(
	Schema.Union(Schema.String, HotkeyCommandStruct),
	HotkeyCommandStruct,
	{
		decode: (from) => (typeof from === "string" ? { command: from } : from),
		encode: (to) => to,
	},
);

export const HotkeysConfigSchema = Schema.Struct({
	hotkeys: Schema.Array(
		Schema.Struct({
			key: Schema.String,
			commands: Schema.NonEmptyArray(HotkeyCommandSchema),
		}),
	),
}).annotations({
	message: () => ({
		override: true,
		message: `Invalid hotkeys.json. Expected format:
{
  "hotkeys": [
    {
      "key": "ctrl+shift+x",
      "commands": ["echo 'hello'", { "command": "bun run lint", "cwd": ".", "timeout": 30000 }]
    }
  ]
}
Key format: modifier+key where modifiers are ctrl, shift, alt (e.g. "ctrl+shift+p", "alt+x")`,
	}),
});

export type HotkeyCommand = Schema.Schema.Type<typeof HotkeyCommandSchema>;
export type HotkeysConfig = Schema.Schema.Type<typeof HotkeysConfigSchema>;
