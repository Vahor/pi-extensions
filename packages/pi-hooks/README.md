# @vahor/pi-hooks

[![npm downloads](https://img.shields.io/npm/dm/%40vahor%2Fpi-hooks)](https://www.npmjs.com/package/@vahor/pi-hooks)

Run shell commands in response to [pi events](https://pi.dev).

```bash
pi install npm:@vahor/pi-hooks
```

```jsonc
// .pi/hooks.json
{
  "hooks": {
    "agent_end": ["bun format", "bun typecheck"],
    "session_start": [{ "command": "echo 'session start'", "print": true }]
  }
}
```

## Config locations

Configuration is loaded from both locations and merged recursively:

| Location | Scope |
|----------|-------|
| `~/.pi/agent/hooks.json` | Global hooks |
| `.pi/hooks.json` | Project hooks; overrides global values |

If neither file exists, the extension shows a warning on session start and stays disabled.

Each entry can be a string (just the command) or an object:

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `command` | `string` | Yes | – | Shell command to run |
| `cwd` | `string` | No | project root | Working directory (relative) |
| `timeout` | `number` | No | `30000` | Timeout in milliseconds |
| `print` | `boolean` | No | `true` | Log stdout as info notification on success |
| `context` | `boolean` | No | `false` | Add command output to the agent context |

Errors show as UI notifications with exit code and truncated output.

## Available hooks

These correspond to [pi lifecycle events](https://pi.dev/docs/latest/extensions#events).

| Hook | Description |
|------|-------------|
| `session_start` | Session initialized and ready |
| `session_before_switch` | Before switching to a different session |
| `session_before_fork` | Before forking the session |
| `session_before_compact` | Before compacting session context |
| `session_compact` | Session context compacted |
| `session_before_tree` | Before generating the session tree |
| `session_tree` | Session tree generated |
| `session_shutdown` | Session is shutting down |
| `before_agent_start` | Before the agent starts processing |
| `agent_start` | Agent has started |
| `agent_end` | Agent has finished |
| `turn_start` | A new turn begins |
| `turn_end` | The current turn ends |
| `message_start` | A message (user or assistant) begins |
| `message_update` | A message is updated in place |
| `message_end` | A message is complete |
| `tool_execution_start` | A tool execution begins |
| `tool_execution_update` | Tool execution output is updated |
| `tool_execution_end` | Tool execution finishes |
| `context` | Context is provided to the model |
| `before_provider_request` | Before sending a request to the model provider |
| `after_provider_response` | After receiving a response from the model provider |
| `model_select` | A model is selected |
| `thinking_level_select` | Thinking level is selected |
| `tool_call` | Assistant requests a tool call |
| `tool_result` | Tool result is received |
| `input` | User submits input |
| `resources_discover` | Resources are discovered |
