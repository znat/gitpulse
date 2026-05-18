import { existsSync, unlinkSync } from 'node:fs';

export interface IgnoredPR {
  number: number;
  sha: string;
}

export interface IgnoreSweepResult {
  ignoredShas: Set<string>;
  removedCount: number;
}

// Delete `stories/pr-<n>.json` for every PR currently carrying the
// ignore label, and return the set of merge SHAs to skip during the
// per-commit pass. The manifest is rebuilt from disk after the analyzer
// runs, so removed files drop out automatically.
export function applyIgnoreSweep(opts: {
  ignored: IgnoredPR[];
  storiesDir: string;
}): IgnoreSweepResult {
  const { ignored, storiesDir } = opts;
  let removedCount = 0;
  const ignoredShas = new Set<string>();
  for (const pr of ignored) {
    ignoredShas.add(pr.sha);
    const path = `${storiesDir}/pr-${pr.number}.json`;
    if (existsSync(path)) {
      unlinkSync(path);
      removedCount++;
    }
  }
  return { ignoredShas, removedCount };
}
