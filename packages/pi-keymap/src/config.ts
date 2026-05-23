import {
	type CommandEntry,
	CommandEntrySchema,
} from "@vahor/shared/runner/config";
import { Schema } from "effect";

export const KeymapConfigSchemaUrl =
	"https://raw.githubusercontent.com/Vahor/pi-extensions/main/packages/pi-keymap/schemas/keymap.schema.json";

export const KeymapCommandSchema = CommandEntrySchema;

const DisallowedField = Schema.optional(Schema.Never);

const RawKeymapCommandEntry = Schema.Struct({
	key: Schema.String,
	description: Schema.optional(Schema.String),
	commands: Schema.NonEmptyArray(KeymapCommandSchema),
	prompt: DisallowedField,
	send: DisallowedField,
	open: DisallowedField,
	print: Schema.optional(Schema.Boolean),
	context: Schema.optional(Schema.Boolean),
	interactive: Schema.optional(Schema.Boolean),
});

const RawKeymapPromptEntry = Schema.Struct({
	key: Schema.String,
	description: Schema.optional(Schema.String),
	commands: DisallowedField,
	prompt: Schema.String,
	print: DisallowedField,
	context: DisallowedField,
	interactive: DisallowedField,
	send: Schema.optional(Schema.Boolean),
	open: Schema.optional(Schema.Boolean),
});

const RawKeymapGroupEntry = Schema.Struct({
	key: Schema.String,
	description: Schema.optional(Schema.String),
	commands: DisallowedField,
	prompt: DisallowedField,
	print: DisallowedField,
	context: DisallowedField,
	interactive: DisallowedField,
	send: DisallowedField,
	open: DisallowedField,
});

const RawKeymapEntry = Schema.Union(
	RawKeymapCommandEntry,
	RawKeymapPromptEntry,
	RawKeymapGroupEntry,
);

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

const leaderPrefix = "<leader>";

function withCommandDefaults(
	commands: readonly CommandEntry[] | undefined,
	entry: {
		print?: boolean;
		context?: boolean;
		interactive?: boolean;
	},
): readonly CommandEntry[] | undefined {
	return commands?.map((command) => ({
		...command,
		print: command.print ?? entry.print,
		context: command.context ?? entry.context,
		interactive: command.interactive ?? entry.interactive,
	}));
}

function decodeKeymapEntry(km: Schema.Schema.Type<typeof RawKeymapEntry>) {
	const leader = km.key.startsWith(leaderPrefix);
	return {
		leaderKey: leader ? km.key.slice(leaderPrefix.length) : km.key,
		description: km.description,
		commands: withCommandDefaults(km.commands, km),
		prompt: km.prompt,
		send: km.send,
		open: km.open,
		print: km.print,
		context: km.context,
		interactive: km.interactive,
		leader,
	};
}

type EncodableKeymapEntry = Schema.Schema.Encoded<typeof DecodedKeymapEntry>;

function encodeKeymapEntry(km: EncodableKeymapEntry) {
	return {
		key: km.leader ? `${leaderPrefix}${km.leaderKey}` : km.leaderKey,
		description: km.description,
		commands: km.commands,
		prompt: km.prompt,
		send: km.send,
		open: km.open,
		print: km.print,
		context: km.context,
		interactive: km.interactive,
	};
}

export type KeymapEntry = Schema.Schema.Type<typeof DecodedKeymapEntry>;

export const KeymapsConfigSchema = Schema.transform(
	Schema.Struct({
		$schema: Schema.optional(Schema.String),
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
			keymaps: raw.keymaps.map(decodeKeymapEntry),
		}),
		encode: (decoded) => ({
			leader: decoded.leader,
			keymaps: decoded.keymaps.map(encodeKeymapEntry),
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

export type KeymapCommand = CommandEntry;
export type KeymapsConfig = Schema.Schema.Type<typeof KeymapsConfigSchema>;
