import { Effect, Schema } from "effect";
import { type ConfigError, ParseError, ValidationError } from "./errors.js";

export const parseJson = (
	path: string,
	raw: string,
): Effect.Effect<unknown, ParseError> =>
	Effect.try({
		try: () => JSON.parse(raw) as unknown,
		catch: (originalCause) => new ParseError(path, originalCause),
	});

export const decodeConfig = <A, I>(
	value: unknown,
	schema: Schema.Schema<A, I>,
): Effect.Effect<A, ValidationError> =>
	Schema.decodeUnknown(schema, { onExcessProperty: "error" })(value).pipe(
		Effect.mapError((errors) => new ValidationError(errors)),
	);

export const parseConfig = <A, I>(
	path: string,
	raw: string,
	schema: Schema.Schema<A, I>,
): Effect.Effect<A, ConfigError> =>
	Effect.gen(function* () {
		const parsed = yield* parseJson(path, raw);
		return yield* decodeConfig(parsed, schema);
	});
