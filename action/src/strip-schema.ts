// Lifted verbatim from gitsky/src/services/pr-analysis/gemini-client.ts.
// MiniMax refuses tool calling when schemas contain min/max constraints, so we
// convert the zod schema to a JSON Schema and recursively strip them.

export function stripJsonSchemaConstraints(
  schema: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...schema };

  delete result.minimum;
  delete result.maximum;
  delete result.minLength;
  delete result.maxLength;
  delete result.minItems;
  delete result.maxItems;
  delete result.exclusiveMinimum;
  delete result.exclusiveMaximum;

  if (result.properties && typeof result.properties === 'object') {
    const props = result.properties as Record<string, Record<string, unknown>>;
    const newProps: Record<string, Record<string, unknown>> = {};
    for (const [key, value] of Object.entries(props)) {
      newProps[key] = stripJsonSchemaConstraints(value);
    }
    result.properties = newProps;
  }

  if (result.items && typeof result.items === 'object') {
    result.items = stripJsonSchemaConstraints(
      result.items as Record<string, unknown>,
    );
  }

  for (const keyword of ['anyOf', 'oneOf', 'allOf'] as const) {
    if (Array.isArray(result[keyword])) {
      result[keyword] = (result[keyword] as Record<string, unknown>[]).map(
        stripJsonSchemaConstraints,
      );
    }
  }

  if (result.additionalProperties && typeof result.additionalProperties === 'object') {
    result.additionalProperties = stripJsonSchemaConstraints(
      result.additionalProperties as Record<string, unknown>,
    );
  }

  return result;
}
