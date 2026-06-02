import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadBuildConfig, sanitizeEnvForClonedBuild } from './build.js';
import { loadConfig } from './config.js';
import type { ProjectConfig } from './project-config.ts';

// Seed an isolated repo dir (≠ process.cwd) with an optional .gitpulse.json,
// returning the dir so tests can point both loaders at it via env.
function seedRepo(projectConfig?: ProjectConfig): string {
  const repoDir = mkdtempSync(join(tmpdir(), 'gitpulse-build-'));
  if (projectConfig) {
    writeFileSync(join(repoDir, '.gitpulse.json'), JSON.stringify(projectConfig), 'utf8');
  }
  return repoDir;
}

describe('loadBuildConfig path resolution', () => {
  it('resolves a relative paths.dataDir against repoDir, not cwd', () => {
    // repoDir is a temp dir, distinct from process.cwd() — exercises the
    // analyze→build cwd divergence the shared resolver is meant to close.
    const repoDir = seedRepo({ paths: { dataDir: 'site/public/data', outDir: 'dist' } });
    const cfg = loadBuildConfig({ GITPULSE_REPO_DIR: repoDir });
    expect(repoDir).not.toBe(process.cwd());
    expect(cfg.dataDir).toBe(join(repoDir, 'site/public/data'));
    expect(cfg.outDir).toBe(join(repoDir, 'dist'));
  });

  it('defaults dataDir/outDir under repoDir when unset', () => {
    const repoDir = seedRepo();
    const cfg = loadBuildConfig({ GITPULSE_REPO_DIR: repoDir });
    expect(cfg.dataDir).toBe(join(repoDir, '.gitpulse', 'data'));
    expect(cfg.outDir).toBe(join(repoDir, '.gitpulse', 'out'));
  });

  it('agrees with loadConfig on dataDir (analyze→build handoff contract)', () => {
    const repoDir = seedRepo({ paths: { dataDir: 'custom/data' } });
    const env = { GITPULSE_REPO_DIR: repoDir, GITHUB_REPOSITORY: 'acme/widgets', OPENAI_API_KEY: 'sk' };
    const analyze = loadConfig(env);
    const build = loadBuildConfig(env);
    expect(build.dataDir).toBe(analyze.dataDir);
  });

  it('honors GITHUB_WORKSPACE as repoDir like analyze does', () => {
    const repoDir = seedRepo({ paths: { dataDir: 'd' } });
    const cfg = loadBuildConfig({ GITHUB_WORKSPACE: repoDir });
    expect(cfg.dataDir).toBe(join(repoDir, 'd'));
  });
});

describe('sanitizeEnvForClonedBuild', () => {
  it('strips secrets that match the name pattern', () => {
    const out = sanitizeEnvForClonedBuild({
      SOME_API_KEY: 'leak',
      OTHER_TOKEN: 'leak',
      A_SECRET: 'leak',
      A_PASSWORD: 'leak',
      PUBLIC_VALUE: 'keep',
    });
    expect(out.SOME_API_KEY).toBeUndefined();
    expect(out.OTHER_TOKEN).toBeUndefined();
    expect(out.A_SECRET).toBeUndefined();
    expect(out.A_PASSWORD).toBeUndefined();
    expect(out.PUBLIC_VALUE).toBe('keep');
  });

  it('strips explicit secret keys regardless of suffix', () => {
    const out = sanitizeEnvForClonedBuild({
      OPENAI_API_KEY: 'leak',
      GITHUB_TOKEN: 'leak',
      AWS_ACCESS_KEY_ID: 'leak',
    });
    expect(out.OPENAI_API_KEY).toBeUndefined();
    expect(out.GITHUB_TOKEN).toBeUndefined();
    expect(out.AWS_ACCESS_KEY_ID).toBeUndefined();
  });

  it('passes GITPULSE_PASSWORD through despite matching the secret pattern', () => {
    const out = sanitizeEnvForClonedBuild({
      GITPULSE_PASSWORD: 'hunter2',
      SOME_OTHER_PASSWORD: 'leak',
    });
    expect(out.GITPULSE_PASSWORD).toBe('hunter2');
    expect(out.SOME_OTHER_PASSWORD).toBeUndefined();
  });
});
