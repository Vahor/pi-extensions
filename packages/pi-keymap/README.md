# @vahor/pi-keymap

Bind custom keyboard shortcuts to shell commands. Configure once in `.pi/keymap.json`.

```bash
pi install npm:@vahor/pi-keymap
```

## Config

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
      "commands": ["bun run format"]
    },
    {
      "key": "<leader>g",
      "description": "Git",
    },
    // Nested leader keys
    {
      "key": "<leader>gg",
      "commands": ["lazygit"]
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
| `keymaps[].commands` | `array` | No | Shell commands to run. Required for direct keymaps. Optional for leader mappings that only group children. |

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
| `timeout` | `number` | No | `30000` | Timeout in milliseconds |
| `print` | `boolean` | No | `false` | Log stdout as info notification on success |

Errors show as UI notifications with exit code and truncated output.

## Leader key & which-key overlay

Press the configured `leader` key to open a full-width bottom overlay listing all leader-prefixed keymaps. Then press the sub-key to trigger the mapping, or `escape` to dismiss. The overlay auto-closes after 5 seconds.

Leader keys can be nested: `<leader>g` shows a sub-overlay with its children (`gp` → `git push`, `gpf` → `git push --force`). Prefix-only nodes (no `commands`, just a `description`) act as grouping folders.
