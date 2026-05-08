import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { JSONSchema } from "effect";
import {
	CommandHooksConfigSchema,
	HooksConfigSchemaUrl,
} from "../packages/pi-hooks/src/config.ts";
import {
	KeymapConfigSchemaUrl,
	KeymapsConfigSchema,
} from "../packages/pi-keymap/src/config.ts";

type JsonSchemaRoot = ReturnType<typeof JSONSchema.make>;

const schemaProperty = {
	type: "string",
	description: "JSON Schema URI for editor validation.",
} as const;

const allowEditorSchemaProperty = (schema: JsonSchemaRoot): JsonSchemaRoot => {
	if (schema.type !== "object") {
		return schema;
	}

	return {
		...schema,
		properties: {
			$schema: schemaProperty,
			...schema.properties,
		},
	};
};

const makeConfigSchema = (
	schema: Parameters<typeof JSONSchema.make>[0],
	id: string,
	title: string,
): JsonSchemaRoot => {
	const generated = allowEditorSchemaProperty(
		JSONSchema.make(schema, { target: "jsonSchema7" }),
	);

	const { $schema, ...rest } = generated;

	return {
		$schema,
		$id: id,
		title,
		...rest,
	};
};

const schemas = [
	{
		file: "packages/pi-hooks/schemas/hooks.schema.json",
		id: HooksConfigSchemaUrl,
		title: "pi-hooks config",
		schema: CommandHooksConfigSchema,
	},
	{
		file: "packages/pi-keymap/schemas/keymap.schema.json",
		id: KeymapConfigSchemaUrl,
		title: "pi-keymap config",
		schema: KeymapsConfigSchema,
	},
];

for (const config of schemas) {
	const schema = makeConfigSchema(config.schema, config.id, config.title);

	await mkdir(dirname(config.file), { recursive: true });
	await writeFile(config.file, `${JSON.stringify(schema, null, "\t")}\n`);
}
