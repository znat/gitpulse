import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, existsSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { applyIgnoreSweep } from './ignore-sweep.ts';

describe('applyIgnoreSweep', () => {
  let storiesDir: string;

  beforeEach(() => {
    storiesDir = mkdtempSync(join(tmpdir(), 'gitpulse-sweep-'));
    mkdirSync(storiesDir, { recursive: true });
    writeFileSync(join(storiesDir, 'pr-1.json'), '{}');
    writeFileSync(join(storiesDir, 'pr-2.json'), '{}');
    writeFileSync(join(storiesDir, 'pr-3.json'), '{}');
    writeFileSync(join(storiesDir, 'commit-abc.json'), '{}');
  });

  afterEach(() => {
    rmSync(storiesDir, { recursive: true, force: true });
  });

  it('deletes pr-<n>.json files for ignored PRs and leaves the rest alone', () => {
    const { ignoredShas, removedCount } = applyIgnoreSweep({
      ignored: [
        { number: 2, sha: 'sha-2' },
        { number: 3, sha: 'sha-3' },
      ],
      storiesDir,
    });

    expect(removedCount).toBe(2);
    expect(ignoredShas).toEqual(new Set(['sha-2', 'sha-3']));
    expect(existsSync(join(storiesDir, 'pr-1.json'))).toBe(true);
    expect(existsSync(join(storiesDir, 'pr-2.json'))).toBe(false);
    expect(existsSync(join(storiesDir, 'pr-3.json'))).toBe(false);
    expect(existsSync(join(storiesDir, 'commit-abc.json'))).toBe(true);
  });

  it('returns the SHA set even when no story files exist on disk yet', () => {
    const { ignoredShas, removedCount } = applyIgnoreSweep({
      ignored: [{ number: 999, sha: 'sha-fresh' }],
      storiesDir,
    });
    expect(removedCount).toBe(0);
    expect(ignoredShas).toEqual(new Set(['sha-fresh']));
  });

  it('handles an empty ignored list as a no-op', () => {
    const { ignoredShas, removedCount } = applyIgnoreSweep({
      ignored: [],
      storiesDir,
    });
    expect(removedCount).toBe(0);
    expect(ignoredShas.size).toBe(0);
    expect(existsSync(join(storiesDir, 'pr-1.json'))).toBe(true);
  });
});
