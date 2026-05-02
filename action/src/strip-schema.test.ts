import { describe, it, expect } from 'vitest';
import { stripJsonSchemaConstraints } from './strip-schema.ts';

describe('stripJsonSchemaConstraints', () => {
  it('strips numeric bounds at the top level', () => {
    const result = stripJsonSchemaConstraints({
      type: 'number',
      minimum: 0,
      maximum: 100,
      exclusiveMinimum: 0,
      exclusiveMaximum: 100,
    });
    expect(result).toEqual({ type: 'number' });
  });

  it('strips string-length bounds', () => {
    const result = stripJsonSchemaConstraints({
      type: 'string',
      minLength: 1,
      maxLength: 300,
    });
    expect(result).toEqual({ type: 'string' });
  });

  it('strips array-length bounds', () => {
    const result = stripJsonSchemaConstraints({
      type: 'array',
      items: { type: 'string', maxLength: 5 },
      minItems: 1,
      maxItems: 10,
    });
    expect(result).toEqual({
      type: 'array',
      items: { type: 'string' },
    });
  });

  it('recurses into properties', () => {
    const result = stripJsonSchemaConstraints({
      type: 'object',
      properties: {
        name: { type: 'string', maxLength: 80 },
        age: { type: 'number', minimum: 0 },
      },
    });
    expect(result).toEqual({
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
      },
    });
  });

  it('recurses into anyOf / oneOf / allOf', () => {
    const result = stripJsonSchemaConstraints({
      anyOf: [
        { type: 'string', maxLength: 10 },
        { type: 'number', minimum: 0 },
      ],
    });
    expect(result).toEqual({
      anyOf: [{ type: 'string' }, { type: 'number' }],
    });
  });

  it('recurses into additionalProperties when it is a schema object', () => {
    const result = stripJsonSchemaConstraints({
      type: 'object',
      additionalProperties: { type: 'number', maximum: 5 },
    });
    expect(result).toEqual({
      type: 'object',
      additionalProperties: { type: 'number' },
    });
  });

  it('does not mutate the input schema', () => {
    const input = {
      type: 'object',
      properties: { x: { type: 'string', maxLength: 10 } },
    };
    const before = JSON.stringify(input);
    stripJsonSchemaConstraints(input);
    expect(JSON.stringify(input)).toBe(before);
  });

  it('preserves unrelated keys', () => {
    const result = stripJsonSchemaConstraints({
      type: 'string',
      description: 'a name',
      format: 'email',
      maxLength: 80,
    });
    expect(result).toEqual({
      type: 'string',
      description: 'a name',
      format: 'email',
    });
  });
});
