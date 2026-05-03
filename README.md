# @vahor/pi-extensions

[![Code quality](https://github.com/vahor/pi-extensions/actions/workflows/quality.yml/badge.svg)](https://github.com/vahor/pi-extensions/actions/workflows/quality.yml)

Pi extensions monorepo for [pi](https://pi.dev) — the minimal terminal coding harness.

## Packages

| Package | Description |
|---------|-------------|
| [@vahor/pi-command-hooks](./packages/pi-command-hooks) | Run shell commands on pi lifecycle events |

### @vahor/pi-command-hooks

Run shell commands in response to [pi events](https://pi.dev). Configure once in `.pi/command-hooks.json`.

```bash
pi install npm:@vahor/pi-command-hooks
```

```jsonc
// .pi/command-hooks.json
{
  "hooks": {
      "agent_end": ["bun format", "bun typecheck"]
  }
}
```

Each entry can be a string (just the command) or an object:

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `command` | `string` | Yes | – | Shell command to run |
| `cwd` | `string` | No | project root | Working directory (relative) |
| `timeout` | `number` | No | `30000` | Timeout in milliseconds |
| `print` | `boolean` | No | `false` | Log stdout as info notification on success |

Errors show as UI notifications with exit code and truncated output.

## License

MIT
