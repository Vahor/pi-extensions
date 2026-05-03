# @vahor/pi-hotkeys

Bind custom keyboard shortcuts to shell commands. Configure once in `.pi/hotkeys.json`.

```bash
pi install npm:@vahor/pi-hotkeys
```

```jsonc
// .pi/hotkeys.json
{
  "hotkeys": [
    {
      "key": "ctrl+shift+e",
      "commands": ["bun run test"]
    },
    {
      "key": "ctrl+shift+f",
      "commands": [
        "bun run format",
        { "command": "echo 'all done'", "print": true }
      ]
    }
  ]
}
```

## Key format

`modifier+key` where modifiers are `ctrl`, `shift`, `alt` (e.g. `ctrl+shift+p`, `alt+x`).

## Command format

Each entry can be a string (just the command) or an object:

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `command` | `string` | Yes | – | Shell command to run |
| `cwd` | `string` | No | project root | Working directory (relative) |
| `timeout` | `number` | No | `30000` | Timeout in milliseconds |
| `print` | `boolean` | No | `false` | Log stdout as info notification on success |

Errors show as UI notifications with exit code and truncated output.
