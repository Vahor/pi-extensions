import { Schema } from "effect";

const KeymapCommandStruct = Schema.Struct({
	command: Schema.String,
	cwd: Schema.optional(Schema.String),
	timeout: Schema.optional(Schema.Number),
	print: Schema.optional(Schema.Boolean),
	context: Schema.optional(Schema.Boolean),
});

export const KeymapCommandSchema = Schema.transform(
	Schema.Union(Schema.String, KeymapCommandStruct),
	KeymapCommandStruct,
	{
		decode: (from) => (typeof from === "string" ? { command: from } : from),
		encode: (to) => to,
	},
);

/** Raw keymap entry shape from the config file */
const RawKeymapEntry = Schema.Struct({
	key: Schema.String,
	description: Schema.optional(Schema.String),
	commands: Schema.optional(Schema.NonEmptyArray(KeymapCommandSchema)),
	print: Schema.optional(Schema.Boolean),
	context: Schema.optional(Schema.Boolean),
});

/** Decoded keymap entry with leader flag resolved */
export const KeymapEntrySchema = Schema.Struct({
	leaderKey: Schema.String,
	description: Schema.optional(Schema.String),
	commands: Schema.optional(Schema.NonEmptyArray(KeymapCommandSchema)),
	print: Schema.optional(Schema.Boolean),
	leader: Schema.Boolean,
});

export type KeymapEntry = Schema.Schema.Type<typeof KeymapEntrySchema>;

/** Full decoded config with leader prefix resolved out */
export const KeymapsConfigSchema = Schema.transform(
	Schema.Struct({
		keymaps: Schema.Array(RawKeymapEntry),
		leader: Schema.String,
	}),
	Schema.Struct({
		keymaps: Schema.Array(KeymapEntrySchema),
		leader: Schema.String,
	}),
	{
		decode: (raw) => ({
			leader: raw.leader,
			keymaps: raw.keymaps.map((km) => {
				const isLeader = km.key.startsWith("<leader>");
				return {
					leaderKey: isLeader ? km.key.slice("<leader>".length) : km.key,
					description: km.description,
					commands: km.commands?.map((command) => ({
						...command,
						print: command.print ?? km.print,
						context: command.context ?? km.context,
					})),
					print: km.print,
					leader: isLeader,
				};
			}),
		}),
		encode: (decoded) => ({
			leader: decoded.leader,
			keymaps: decoded.keymaps.map((km) => ({
				key: km.leader ? `<leader>${km.leaderKey}` : km.leaderKey,
				description: km.description,
				commands: km.commands,
				print: km.print,
			})),
		}),
		strict: false,
	},
).annotations({
	message: () => ({
		override: true,
		message: `Invalid keymap.json. Expected format:
{
  "leader": " ",
  "keymaps": [
    {
      "key": "<leader>t",
      "commands": ["echo 'Runnin tests'", { "command": "bun run test", "cwd": ".", "timeout": 30000 }]
    }
  ]
}
Keymap keys: modifier+key where modifiers are ctrl, shift, alt (e.g. "ctrl+shift+p", "alt+x"). Can be prefixed with the leader key, e.g. "<leader>t"
Leader: a single character or named key (e.g. "f", "t", "enter")`,
	}),
});

export type KeymapCommand = Schema.Schema.Type<typeof KeymapCommandSchema>;
export type KeymapsConfig = Schema.Schema.Type<typeof KeymapsConfigSchema>;
