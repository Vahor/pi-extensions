import { Effect, Schema } from "effect";
import { type ConfigError, ParseError, ValidationError } from "./errors.js";

export const parseConfig = <A, I>(
	path: string,
	raw: string,
	schema: Schema.Schema<A, I>,
): Effect.Effect<A, ConfigError> =>
	Effect.gen(function* () {
		const parsed = yield* Effect.try({
			try: () => JSON.parse(raw),
			catch: (originalCause) => new ParseError(path, originalCause),
		});

		const decoded = yield* Schema.decodeUnknown(schema)(parsed).pipe(
			Effect.mapError((errors) => new ValidationError(errors)),
		);

		return decoded;
	});
