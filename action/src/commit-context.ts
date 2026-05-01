import { execSync } from 'node:child_process';
import type { CommitRecord, FileChange } from './types.ts';
import type { PRData, LinkedIssue } from './github.ts';

const MAX_PATCH_BYTES_PER_FILE = 10_000;
const MAX_TOTAL_PATCH_BYTES = 50_000;

export function fetchFileChanges(repoDir: string, sha: string): FileChange[] {
  const numstat = run(`git show ${sha} --numstat --format=`, repoDir).trim();
  const status = run(`git show ${sha} --name-status --format=`, repoDir).trim();

  const statusByPath = new Map<string, string>();
  for (const line of status.split('\n')) {
    const [code, ...pathParts] = line.split('\t');
    if (code && pathParts[0]) statusByPath.set(pathParts[0], code);
  }

  const files: FileChange[] = [];
  let totalPatchBytes = 0;
  for (const line of numstat.split('\n')) {
    const parts = line.split('\t');
    if (parts.length < 3) continue;
    const [add, del, path] = parts;
    if (!path) continue;
    const additions = add === '-' ? 0 : Number(add);
    const deletions = del === '-' ? 0 : Number(del);
    let patch = '';
    if (totalPatchBytes < MAX_TOTAL_PATCH_BYTES) {
      const remaining = MAX_TOTAL_PATCH_BYTES - totalPatchBytes;
      patch = filePatch(repoDir, sha, path, Math.min(MAX_PATCH_BYTES_PER_FILE, remaining));
      totalPatchBytes += patch.length;
    }
    files.push({
      path,
      status: statusByPath.get(path) ?? 'M',
      additions,
      deletions,
      patch,
    });
  }
  return files;
}

function filePatch(repoDir: string, sha: string, path: string, maxBytes: number): string {
  try {
    const raw = run(`git show ${sha} -- "${path}"`, repoDir);
    if (raw.length <= maxBytes) return raw;
    return raw.slice(0, maxBytes) + `\n... (truncated, ${raw.length - maxBytes} bytes omitted)`;
  } catch {
    return '';
  }
}

function run(cmd: string, cwd: string): string {
  return execSync(cmd, { cwd, encoding: 'utf8', maxBuffer: 1024 * 1024 * 16 });
}

// Format a single commit (no associated PR) as a gitsky-style PR context block.
export function formatCommitAsPRContext(commit: CommitRecord): string {
  const filesText =
    commit.files.length > 0
      ? commit.files.map(formatFileEntry).join('\n\n')
      : '(no files found)';

  const description = commit.body.trim() || '(no description provided — direct push to default branch)';

  return `## Commit Metadata
- Title: ${commit.subject}
- Author: ${commit.authorName}
- Date: ${commit.committedAt}
- SHA: ${commit.shortSha}
- This commit was pushed directly to the default branch (no associated pull request).
- Description:
${description}

## Commits (1 total)
1. ${commit.subject} (${commit.authorName})

## File Changes (${commit.files.length} files, +${commit.insertions}/-${commit.deletions})
${filesText}`;
}

// Format a merged PR (with the local commit's diffs) as a gitsky-style context block.
export function formatPRContext(commit: CommitRecord, pr: PRData): string {
  const filesText =
    commit.files.length > 0
      ? commit.files.map(formatFileEntry).join('\n\n')
      : '(no files found)';

  const linkedIssuesText =
    pr.linkedIssues.length > 0
      ? `\n\n## Linked Issues\n${pr.linkedIssues.map(formatLinkedIssue).join('\n\n')}`
      : '';

  return `## PR Metadata
- Title: ${pr.title}
- Author: ${pr.authorLogin ?? commit.authorName}
- PR Number: #${pr.number}
- Merged At: ${pr.mergedAt ?? '(not merged)'}
- Description:
${pr.body || 'No description provided'}
${linkedIssuesText}

## Commits (1 represented; squash-merge or single landing commit)
1. ${commit.subject} (${commit.authorName})

## File Changes (${pr.changedFiles} files reported by GitHub, ${commit.files.length} in local diff, +${pr.additions}/-${pr.deletions})
${filesText}`;
}

function formatLinkedIssue(issue: LinkedIssue): string {
  return `### Issue #${issue.number}: ${issue.title}
${issue.body || '(no description)'}`;
}

function formatFileEntry(f: FileChange): string {
  const header = `### ${f.path} (${f.status}, +${f.additions}/-${f.deletions})`;
  if (!f.patch) return `${header}\n(diff omitted)`;
  return `${header}\n\`\`\`diff\n${f.patch}\n\`\`\``;
}
