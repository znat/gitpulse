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

describe('ProjectConfigSchema text', () => {
  it('accepts the openai provider', () => {
    const result = ProjectConfigSchema.safeParse({
      text: { provider: 'openai', model: 'gpt-4o-mini' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts the anthropic provider with an optional temperature', () => {
    const result = ProjectConfigSchema.safeParse({
      text: { provider: 'anthropic', model: 'claude-sonnet-4-6', temperature: 0.2 },
    });
    expect(result.success).toBe(true);
  });

  it('requires baseURL for the openai-compatible provider', () => {
    const ok = ProjectConfigSchema.safeParse({
      text: {
        provider: 'openai-compatible',
        model: 'MiniMax-M2.7',
        baseURL: 'https://api.minimax.io/v1',
      },
    });
    expect(ok.success).toBe(true);

    const missing = ProjectConfigSchema.safeParse({
      text: { provider: 'openai-compatible', model: 'MiniMax-M2.7' },
    });
    expect(missing.success).toBe(false);
  });

  it('rejects a non-URL baseURL', () => {
    const result = ProjectConfigSchema.safeParse({
      text: { provider: 'openai-compatible', model: 'x', baseURL: 'not-a-url' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown provider', () => {
    const result = ProjectConfigSchema.safeParse({
      text: { provider: 'cohere', model: 'command' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects baseURL on the first-party openai provider (strict object)', () => {
    const result = ProjectConfigSchema.safeParse({
      text: { provider: 'openai', model: 'gpt-4o-mini', baseURL: 'https://x.y' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects a temperature above the allowed range', () => {
    const result = ProjectConfigSchema.safeParse({
      text: { provider: 'openai', model: 'gpt-4o-mini', temperature: 3 },
    });
    expect(result.success).toBe(false);
  });
});

describe('ProjectConfigSchema analysis', () => {
  it('accepts a full analysis section', () => {
    const result = ProjectConfigSchema.safeParse({
      analysis: {
        branch: 'main',
        bootstrapDays: 30,
        concurrency: 10,
        limit: 100,
        releasesCap: 20,
        includePrereleases: true,
      },
    });
    expect(result.success).toBe(true);
  });

  it('allows releasesCap of 0 (disables releases) but rejects negatives', () => {
    expect(ProjectConfigSchema.safeParse({ analysis: { releasesCap: 0 } }).success).toBe(true);
    expect(ProjectConfigSchema.safeParse({ analysis: { releasesCap: -1 } }).success).toBe(false);
  });

  it('rejects unknown keys under analysis (catches typos)', () => {
    const result = ProjectConfigSchema.safeParse({
      analysis: { bootstrapdays: 30 },
    });
    expect(result.success).toBe(false);
  });

  it('rejects the old top-level scope fields (moved under analysis)', () => {
    const result = ProjectConfigSchema.safeParse({ bootstrapDays: 30 });
    expect(result.success).toBe(false);
  });
});

describe('ProjectConfigSchema site & paths', () => {
  it('accepts site coordinates', () => {
    const result = ProjectConfigSchema.safeParse({
      site: { url: 'https://acme.example', basePath: 'none', repo: 'acme/site', ref: 'v1' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects a non-URL site.url', () => {
    const result = ProjectConfigSchema.safeParse({ site: { url: 'acme.example' } });
    expect(result.success).toBe(false);
  });

  it('accepts a paths section', () => {
    const result = ProjectConfigSchema.safeParse({
      paths: { dataDir: 'site/public/data', outDir: 'dist' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects unknown keys under paths', () => {
    const result = ProjectConfigSchema.safeParse({ paths: { dataDirr: 'x' } });
    expect(result.success).toBe(false);
  });
});
