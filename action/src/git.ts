import { execSync } from 'node:child_process';
import type { CommitRecord } from './types.ts';

const RECORD_SEP = '\x1e';
const FIELD_SEP = '\x1f';
const FORMAT = ['%H', '%aI', '%an', '%ae', '%s', '%b'].join(FIELD_SEP);

export function defaultBranch(repoDir: string): string {
  return execSync('git symbolic-ref --short refs/remotes/origin/HEAD', {
    cwd: repoDir,
    encoding: 'utf8',
  })
    .trim()
    .replace(/^origin\//, '');
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
