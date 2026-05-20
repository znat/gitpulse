import { describe, it, expect } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig } from './config.js';

function baseEnv(extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    GITHUB_REPOSITORY: 'acme/widgets',
    GITPULSE_REPO_DIR: mkdtempSync(join(tmpdir(), 'gitpulse-config-')),
    ...extra,
  };
}

describe('loadConfig AI key resolution', () => {
  it('uses OPENAI_API_KEY for the default openai protocol', () => {
    const cfg = loadConfig(baseEnv({ OPENAI_API_KEY: 'sk-openai' }));
    expect(cfg.ai.protocol).toBe('openai');
    expect(cfg.ai.apiKey).toBe('sk-openai');
  });

  it('throws when openai protocol has no OPENAI_API_KEY', () => {
    expect(() => loadConfig(baseEnv())).toThrow(/OPENAI_API_KEY/);
  });

  it('uses ANTHROPIC_API_KEY when AI_PROTOCOL=anthropic', () => {
    const cfg = loadConfig(
      baseEnv({
        AI_PROTOCOL: 'anthropic',
        ANTHROPIC_API_KEY: 'sk-anthropic',
      }),
    );
    expect(cfg.ai.protocol).toBe('anthropic');
    expect(cfg.ai.apiKey).toBe('sk-anthropic');
  });

  it('ignores OPENAI_API_KEY under anthropic protocol', () => {
    expect(() =>
      loadConfig(
        baseEnv({
          AI_PROTOCOL: 'anthropic',
          OPENAI_API_KEY: 'sk-openai-wrong-name',
        }),
      ),
    ).toThrow(/ANTHROPIC_API_KEY/);
  });

  it('throws when anthropic protocol has no key', () => {
    expect(() =>
      loadConfig(baseEnv({ AI_PROTOCOL: 'anthropic' })),
    ).toThrow(/ANTHROPIC_API_KEY/);
  });

  it('throws when AI_PROTOCOL has an invalid value', () => {
    expect(() =>
      loadConfig(
        baseEnv({
          AI_PROTOCOL: 'invalid-protocol',
          OPENAI_API_KEY: 'sk-openai',
          ANTHROPIC_API_KEY: 'sk-anthropic',
        }),
      ),
    ).toThrow(/AI_PROTOCOL/);
  });
});
