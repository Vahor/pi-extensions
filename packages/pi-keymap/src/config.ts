import { Schema } from "effect";

export const KeymapConfigSchemaUrl =
	"https://raw.githubusercontent.com/Vahor/pi-extensions/main/packages/pi-keymap/schemas/keymap.schema.json";

const KeymapCommandStruct = Schema.Struct({
	command: Schema.String,
	cwd: Schema.optional(Schema.String),
	timeout: Schema.optional(Schema.Number),
	print: Schema.optional(Schema.Boolean),
	context: Schema.optional(Schema.Boolean),
	interactive: Schema.optional(Schema.Boolean),
});

export const KeymapCommandSchema = Schema.transform(
	Schema.Union(Schema.String, KeymapCommandStruct),
	KeymapCommandStruct,
	{
		decode: (from) => (typeof from === "string" ? { command: from } : from),
		encode: (to) => to,
	},
);

const Forbidden = Schema.optional(Schema.Never);

const RawKeymapCommandEntry = Schema.Struct({
	key: Schema.String,
	description: Schema.optional(Schema.String),
	commands: Schema.NonEmptyArray(KeymapCommandSchema),
	prompt: Forbidden,
	send: Forbidden,
	open: Forbidden,
	print: Schema.optional(Schema.Boolean),
	context: Schema.optional(Schema.Boolean),
	interactive: Schema.optional(Schema.Boolean),
});

const RawKeymapPromptEntry = Schema.Struct({
	key: Schema.String,
	description: Schema.optional(Schema.String),
	commands: Forbidden,
	prompt: Schema.String,
	print: Forbidden,
	context: Forbidden,
	interactive: Forbidden,
	send: Schema.optional(Schema.Boolean),
	open: Schema.optional(Schema.Boolean),
});

const RawKeymapGroupEntry = Schema.Struct({
	key: Schema.String,
	description: Schema.optional(Schema.String),
	commands: Forbidden,
	prompt: Forbidden,
	print: Forbidden,
	context: Forbidden,
	interactive: Forbidden,
	send: Forbidden,
	open: Forbidden,
});

/** Raw keymap entry shape from the config file */
const RawKeymapEntry = Schema.Union(
	RawKeymapCommandEntry,
	RawKeymapPromptEntry,
	RawKeymapGroupEntry,
);

/** Decoded keymap entry with leader flag resolved */
const DecodedKeymapEntry = Schema.Struct({
	leaderKey: Schema.String,
	description: Schema.optional(Schema.String),
	commands: Schema.optional(Schema.NonEmptyArray(KeymapCommandSchema)),
	prompt: Schema.optional(Schema.String),
	send: Schema.optional(Schema.Boolean),
	open: Schema.optional(Schema.Boolean),
	print: Schema.optional(Schema.Boolean),
	context: Schema.optional(Schema.Boolean),
	interactive: Schema.optional(Schema.Boolean),
	leader: Schema.Boolean,
});

export type KeymapEntry = Schema.Schema.Type<typeof DecodedKeymapEntry>;

/** Full decoded config with leader prefix resolved out */
export const KeymapsConfigSchema = Schema.transform(
	Schema.Struct({
		keymaps: Schema.Array(RawKeymapEntry),
		leader: Schema.String,
	}),
	Schema.Struct({
		keymaps: Schema.Array(DecodedKeymapEntry),
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
						interactive: command.interactive ?? km.interactive,
					})),
					prompt: km.prompt,
					send: km.send,
					open: km.open,
					print: km.print,
					context: km.context,
					interactive: km.interactive,
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
				prompt: km.prompt,
				send: km.send,
				open: km.open,
				print: km.print,
				context: km.context,
				interactive: km.interactive,
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
      "commands": ["echo 'Running tests'", { "command": "bun run test", "cwd": ".", "timeout": 30000 }]
    },
    {
      "key": "<leader>pp",
      "description": "Draft context",
      "prompt": "Default prompt content",
      "send": false,
      "open": true
    },
    {
      "key": "<leader>p",
      "description": "Prompt Group"
    },
  ]
}
Keymap entries can define commands, prompt, or neither for a leader grouping node.
Keymap keys: modifier+key where modifiers are ctrl, shift, alt (e.g. "ctrl+shift+p", "alt+x"). Can be prefixed with the leader key, e.g. "<leader>t"
Set "interactive": true for terminal UI commands like lazygit, vim, htop, or fzf.
Leader: a single character or named key (e.g. "f", "t", "enter")`,
	}),
});

export const EmptyKeymapsConfig = {
	$schema: KeymapConfigSchemaUrl,
	leader: "space",
	keymaps: [],
} as const;

export type KeymapCommand = Schema.Schema.Type<typeof KeymapCommandSchema>;
export type KeymapsConfig = Schema.Schema.Type<typeof KeymapsConfigSchema>;
