import { describe, it, expect } from 'vitest';
import { ProjectConfigSchema } from './project-config.ts';

describe('ProjectConfigSchema labels', () => {
  it('accepts a custom ignore label', () => {
    const result = ProjectConfigSchema.safeParse({
      labels: { ignore: 'team:skip' },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.labels?.ignore).toBe('team:skip');
    }
  });

  it('accepts an empty labels object', () => {
    const result = ProjectConfigSchema.safeParse({ labels: {} });
    expect(result.success).toBe(true);
  });

  it('accepts omitting labels entirely', () => {
    const result = ProjectConfigSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.labels).toBeUndefined();
    }
  });

  it('rejects unknown keys under labels (catches typos)', () => {
    const result = ProjectConfigSchema.safeParse({
      labels: { ignre: 'team:skip' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects an empty ignore label string', () => {
    const result = ProjectConfigSchema.safeParse({
      labels: { ignore: '' },
    });
    expect(result.success).toBe(false);
  });
});
