import type { ParseResult } from "effect";

export class ParseError extends Error {
	readonly _tag = "ParseError";
	constructor(readonly originalCause: unknown) {
		super("Failed to parse config");
	}
}

export class ValidationError extends Error {
	readonly _tag = "ValidationError";
	constructor(readonly errors: ParseResult.ParseError) {
		super(errors.message ?? "Validation error");
	}
}

export type ConfigError = ParseError | ValidationError;
