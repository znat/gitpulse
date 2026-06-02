import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from './config.js';
import type { ProjectConfig } from './project-config.ts';

// Create an isolated repo dir, optionally seeding a .gitpulse.json, and
// return a base env pointing loadConfig at it.
function baseEnv(
  extra: NodeJS.ProcessEnv = {},
  projectConfig?: ProjectConfig,
): NodeJS.ProcessEnv {
  const repoDir = mkdtempSync(join(tmpdir(), 'gitpulse-config-'));
  if (projectConfig) {
    writeFileSync(
      join(repoDir, '.gitpulse.json'),
      JSON.stringify(projectConfig),
      'utf8',
    );
  }
  return {
    GITHUB_REPOSITORY: 'acme/widgets',
    GITPULSE_REPO_DIR: repoDir,
    ...extra,
  };
}

describe('loadConfig text-AI resolution', () => {
  it('defaults to openai gpt-4o-mini when no text config is present', () => {
    const cfg = loadConfig(baseEnv({ OPENAI_API_KEY: 'sk-openai' }));
    expect(cfg.ai.protocol).toBe('openai');
    expect(cfg.ai.model).toBe('gpt-4o-mini');
    expect(cfg.ai.apiKey).toBe('sk-openai');
    expect(cfg.ai.baseURL).toBeUndefined();
    expect(cfg.ai.temperature).toBe(0);
  });

  it('throws when the default openai provider has no OPENAI_API_KEY', () => {
    expect(() => loadConfig(baseEnv())).toThrow(/OPENAI_API_KEY/);
  });

  it('uses ANTHROPIC_API_KEY when text.provider=anthropic', () => {
    const cfg = loadConfig(
      baseEnv(
        { ANTHROPIC_API_KEY: 'sk-anthropic' },
        { text: { provider: 'anthropic', model: 'claude-sonnet-4-6' } },
      ),
    );
    expect(cfg.ai.protocol).toBe('anthropic');
    expect(cfg.ai.model).toBe('claude-sonnet-4-6');
    expect(cfg.ai.apiKey).toBe('sk-anthropic');
    expect(cfg.ai.baseURL).toBeUndefined();
  });

  it('ignores OPENAI_API_KEY under the anthropic provider', () => {
    expect(() =>
      loadConfig(
        baseEnv(
          { OPENAI_API_KEY: 'sk-openai-wrong-name' },
          { text: { provider: 'anthropic', model: 'claude-sonnet-4-6' } },
        ),
      ),
    ).toThrow(/ANTHROPIC_API_KEY/);
  });

  it('routes openai-compatible through OPENAI_API_KEY and sets baseURL', () => {
    const cfg = loadConfig(
      baseEnv(
        { OPENAI_API_KEY: 'sk-minimax' },
        {
          text: {
            provider: 'openai-compatible',
            model: 'MiniMax-M2.7',
            baseURL: 'https://api.minimax.io/v1',
          },
        },
      ),
    );
    expect(cfg.ai.protocol).toBe('openai');
    expect(cfg.ai.model).toBe('MiniMax-M2.7');
    expect(cfg.ai.baseURL).toBe('https://api.minimax.io/v1');
    expect(cfg.ai.apiKey).toBe('sk-minimax');
  });

  it('passes through a configured temperature', () => {
    const cfg = loadConfig(
      baseEnv(
        { OPENAI_API_KEY: 'sk-openai' },
        { text: { provider: 'openai', model: 'gpt-4o-mini', temperature: 0.3 } },
      ),
    );
    expect(cfg.ai.temperature).toBe(0.3);
  });
});

describe('loadConfig analysis resolution', () => {
  it('reads scope from the file analysis section', () => {
    const cfg = loadConfig(
      baseEnv(
        { OPENAI_API_KEY: 'sk-openai' },
        {
          analysis: {
            branch: 'develop',
            bootstrapDays: 90,
            concurrency: 4,
            limit: 50,
            releasesCap: 5,
            includePrereleases: false,
          },
        },
      ),
    );
    expect(cfg.branch).toBe('develop');
    expect(cfg.bootstrapDays).toBe(90);
    expect(cfg.concurrency).toBe(4);
    expect(cfg.limit).toBe(50);
    expect(cfg.releasesCap).toBe(5);
    expect(cfg.includePrereleases).toBe(false);
  });

  it('applies defaults when analysis is omitted', () => {
    const cfg = loadConfig(baseEnv({ OPENAI_API_KEY: 'sk-openai' }));
    expect(cfg.branch).toBeUndefined();
    expect(cfg.bootstrapDays).toBe(30);
    expect(cfg.concurrency).toBe(10);
    expect(cfg.limit).toBeUndefined();
    expect(cfg.releasesCap).toBe(20);
    expect(cfg.includePrereleases).toBe(true);
  });
});

describe('loadConfig site/paths resolution', () => {
  it('uses site.url from the file when no env override is set', () => {
    const cfg = loadConfig(
      baseEnv(
        { OPENAI_API_KEY: 'sk-openai' },
        { site: { url: 'https://news.acme.com' } },
      ),
    );
    expect(cfg.siteUrl).toBe('https://news.acme.com/');
  });

  it('lets GITPULSE_SITE_URL override site.url', () => {
    const cfg = loadConfig(
      baseEnv(
        { OPENAI_API_KEY: 'sk-openai', GITPULSE_SITE_URL: 'https://override.example' },
        { site: { url: 'https://news.acme.com' } },
      ),
    );
    expect(cfg.siteUrl).toBe('https://override.example/');
  });

  it('resolves a relative paths.dataDir against the repo root', () => {
    const env = baseEnv(
      { OPENAI_API_KEY: 'sk-openai' },
      { paths: { dataDir: 'site/public/data' } },
    );
    const cfg = loadConfig(env);
    expect(cfg.dataDir).toBe(join(env.GITPULSE_REPO_DIR!, 'site/public/data'));
  });

  it('lets GITPULSE_DATA_DIR override paths.dataDir', () => {
    const cfg = loadConfig(
      baseEnv(
        { OPENAI_API_KEY: 'sk-openai', GITPULSE_DATA_DIR: '/abs/data' },
        { paths: { dataDir: 'site/public/data' } },
      ),
    );
    expect(cfg.dataDir).toBe('/abs/data');
  });
});
