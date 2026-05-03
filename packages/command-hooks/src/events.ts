import { Schema } from "effect";

export const PiEvent = Schema.Literal(
	"session_start",
	"session_before_switch",
	"session_before_fork",
	"session_before_compact",
	"session_compact",
	"session_before_tree",
	"session_tree",
	"session_shutdown",
	"before_agent_start",
	"agent_start",
	"agent_end",
	"turn_start",
	"turn_end",
	"message_start",
	"message_update",
	"message_end",
	"tool_execution_start",
	"tool_execution_update",
	"tool_execution_end",
	"context",
	"before_provider_request",
	"after_provider_response",
	"model_select",
	"thinking_level_select",
	"tool_call",
	"tool_result",
	"input",
	"resources_discover",
);

export type PiEvent = Schema.Schema.Type<typeof PiEvent>;
