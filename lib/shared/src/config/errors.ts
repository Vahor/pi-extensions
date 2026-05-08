import type { ParseResult } from "effect";

export class ParseError extends Error {
	readonly _tag = "ParseError";
	constructor(
		readonly path: string,
		readonly originalCause: unknown,
	) {
		super(`Failed to parse config file: ${path}`);
	}
}

export class ValidationError extends Error {
	readonly _tag = "ValidationError";
	constructor(readonly errors: ParseResult.ParseError) {
		super(errors.message ?? "Validation error");
	}
}

export class FileNotFoundError extends Error {
	readonly _tag = "FileNotFoundError";
	constructor(readonly path: string) {
		super(`Config file not found: ${path}`);
	}
}

export class WriteError extends Error {
	readonly _tag = "WriteError";
	constructor(
		readonly path: string,
		readonly originalCause: unknown,
	) {
		super(`Failed to write config file: ${path}`);
	}
}

export type ConfigError =
	| ParseError
	| ValidationError
	| FileNotFoundError
	| WriteError;
