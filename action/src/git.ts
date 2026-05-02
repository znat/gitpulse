import { execSync, spawnSync } from 'node:child_process';
import type { CommitRecord } from './types.ts';

const RECORD_SEP = '\x1e';
const FIELD_SEP = '\x1f';
const FORMAT = ['%H', '%aI', '%an', '%ae', '%s', '%b'].join(FIELD_SEP);

export function defaultBranch(repoDir: string): string {
  // Try origin/HEAD first (most accurate), fall back to current HEAD
  // (works after a fresh actions/checkout where origin/HEAD isn't set).
  try {
    return execSync('git symbolic-ref --short refs/remotes/origin/HEAD', {
      cwd: repoDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .trim()
      .replace(/^origin\//, '');
  } catch {
    return 'HEAD';
  }
}

// Enumerate every commit SHA reachable from `ref` (branch or tag), newest
// first. Used for first-release SHA matching when there's no predecessor
// to diff against — `git log <tag>` returns the full history up to the
// tag. Returns [] if the ref isn't fetched locally (shallow clone).
// `spawnSync` (not `execSync`) so a tag with shell metacharacters can't
// be interpreted as a command — the GitHub API doesn't constrain that.
export function listReachableShas(repoDir: string, ref: string): string[] {
  try {
    const result = spawnSync(
      'git',
      ['log', ref, '--pretty=format:%H'],
      { cwd: repoDir, encoding: 'utf8' },
    );
    if (result.status !== 0) return [];
    return result.stdout.split('\n').map((s) => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export function walkCommits(opts: {
  repoDir: string;
  branch: string;
  limit?: number;
  since?: string;
}): CommitRecord[] {
  const args = ['git', 'log', opts.branch, `--pretty=format:${FORMAT}${RECORD_SEP}`];
  if (opts.limit) args.push(`-n${opts.limit}`);
  if (opts.since) args.push(`--since=${opts.since}`);
  const raw = execSync(args.join(' '), { cwd: opts.repoDir, encoding: 'utf8' });
  return raw
    .split(RECORD_SEP)
    .map((r) => r.trim())
    .filter(Boolean)
    .map(parseRecord)
    .map((r) => ({ ...r, ...stat(opts.repoDir, r.sha) }));
}

function parseRecord(rec: string): CommitRecord {
  const parts = rec.split(FIELD_SEP);
  const sha = parts[0] ?? '';
  const committedAt = parts[1] ?? '';
  const authorName = parts[2] ?? '';
  const authorEmail = parts[3] ?? '';
  const subject = parts[4] ?? '';
  const body = parts.slice(5).join(FIELD_SEP).trim();
  return {
    sha,
    shortSha: sha.slice(0, 7),
    authorName,
    authorEmail,
    committedAt,
    subject,
    body,
    filesChanged: 0,
    insertions: 0,
    deletions: 0,
    files: [],
  };
}

function stat(repoDir: string, sha: string): {
  filesChanged: number;
  insertions: number;
  deletions: number;
} {
  try {
    const out = execSync(`git show --shortstat --format= ${sha}`, {
      cwd: repoDir,
      encoding: 'utf8',
    }).trim();
    const m = out.match(
      /(\d+) files? changed(?:, (\d+) insertions?\(\+\))?(?:, (\d+) deletions?\(-\))?/,
    );
    return {
      filesChanged: m?.[1] ? Number(m[1]) : 0,
      insertions: m?.[2] ? Number(m[2]) : 0,
      deletions: m?.[3] ? Number(m[3]) : 0,
    };
  } catch {
    return { filesChanged: 0, insertions: 0, deletions: 0 };
  }
}
