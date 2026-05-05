# @vahor/pi-keymap

[![npm downloads](https://img.shields.io/npm/dm/%40vahor%2Fpi-keymap)](https://www.npmjs.com/package/@vahor/pi-keymap)

Define Vim-like custom keymaps that bind keyboard shortcuts to shell commands.

```bash
pi install npm:@vahor/pi-keymap
```

## Config

Configuration is loaded from both locations and merged recursively:

| Location | Scope |
|----------|-------|
| `~/.pi/agent/keymap.json` | Global keymaps |
| `.pi/keymap.json` | Project keymaps; overrides global values |

If neither file exists, the extension shows a warning on session start and stays disabled.

```jsonc
// .pi/keymap.json
{
  "leader": "space",
  "keymaps": [
    // Direct shortcuts
    {
      "key": "ctrl+shift+t",
      "commands": ["bun run test"]
    },
    // Leader-prefixed shortcuts (triggered via leader key + sub-key)
    {
      "key": "<leader>f",
      "description": "Format",
      "commands": [{ "command": "bun run format", "timeout": 1000, "print": true }]
    },
    {
      "key": "<leader>p",
      "description": "Draft prompt in vim",
      "prompt": "Default prompt content",
      "send": false,
      "open": true
    },
    {
      "key": "<leader>g",
      "description": "Git",
    },
    // Nested leader keys
    {
      "key": "<leader>gg",
      "commands": [{ "command": "lazygit", "interactive": true }]
    },
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `leader` | `string` | Yes | Key that activates the which-key overlay |
| `keymaps` | `array` | Yes | List of keymap entries |
| `keymaps[].key` | `string` | Yes | Key combination or `<leader>key` |
| `keymaps[].description` | `string` | No | Label shown in the which-key overlay (falls back to first command) |
| `keymaps[].commands` | `array` | No | Shell commands to run. Required for command keymaps. |
| `keymaps[].prompt` | `string` | No | Default prompt text. Opens in vim by default, then saved content is placed in the input editor or sent. |
| `keymaps[].send` | `boolean` | No | For prompt keymaps, send saved content immediately instead of placing it in the input editor. Defaults `false` |
| `keymaps[].open` | `boolean` | No | For prompt keymaps, open vim before using the prompt. Defaults `true`; `false` places the prompt in the input editor without opening vim. |
| `keymaps[].print` | `boolean` | No | Print command output in the UI. Defaults `true` |
| `keymaps[].context` | `boolean` | No | Add command output to the agent context |
| `keymaps[].interactive` | `boolean` | No | Default interactive mode for commands in this keymap |

`commands`, `prompt`, and grouping entries are mutually exclusive shapes: use `commands` for shell commands, `prompt` for prompt drafts, or neither for a leader grouping node. `print`, `context`, and `interactive` can be overridden at command level. Command-level wins over keymap-level.

For prompt keymaps, `:q!` in vim cancels without changing the pi input. `:wq` saves; with `send: true` the saved content is sent immediately, otherwise it is inserted into the input editor. For now, prompt keymaps open `vim` directly.

### Key format

`modifier+key` where modifiers are `ctrl`, `shift`, `alt`, `super` (e.g. `ctrl+shift+p`, `alt+x`).

Valid base keys:

| Category | Keys |
|----------|------|
| **Letters** | `a`–`z` |
| **Digits** | `0`–`9` |
| **Named** | `escape`, `esc`, `enter`, `return`, `tab`, `space`, `backspace`, `delete`, `insert`, `clear`, `home`, `end`, `pageUp`, `pageDown` |
| **Arrows** | `up`, `down`, `left`, `right` |
| **Function** | `f1`–`f12` |
| **Symbols** | `` ` ``, `-`, `=`, `[`, `]`, `\`, `;`, `'`, `,`, `.`, `/`, `!`, `@`, `#`, `$`, `%`, `^`, `&`, `*`, `(`, `)`, `_`, `+`, `\|`, `~`, `{`, `}`, `:`, `<`, `>`, `?` |

Invalid keys are warned at startup and skipped.

### Command format

Each entry can be a string (just the command) or an object:

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `command` | `string` | Yes | – | Shell command to run |
| `cwd` | `string` | No | project root | Working directory (relative) |
| `timeout` | `number` | No | `30000` captured, none interactive | Timeout in milliseconds |
| `print` | `boolean` | No | `true` | Log stdout as info notification on success |
| `context` | `boolean` | No | `false` | Add command output to the agent context |
| `interactive` | `boolean` | No | `false` | Suspend pi's TUI and run with full terminal access. Use for commands like `lazygit`, `vim`, `htop`, or `fzf`. Output is not captured. |

Errors show as UI notifications with exit code and truncated output. Interactive commands restore and fully redraw pi after they exit.

## Leader key & which-key overlay

Press the configured `leader` key to open a full-width bottom overlay listing all leader-prefixed keymaps. The overlay only opens when the input editor is empty, so typing a space (if your leader is `space`) won't accidentally trigger it. Press the sub-key to run the mapping, or `escape` to dismiss. The overlay auto-closes after 5 seconds.

Leader keys can be nested: `<leader>g` shows a sub-overlay with its children (`gp` → `git push`, `gpf` → `git push --force`). Prefix-only nodes (no `commands`, just a `description`) act as grouping folders.
