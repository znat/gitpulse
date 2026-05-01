import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { ChangesNodeOutput } from './schemas.ts';
import type { CommitRecord, Story } from './types.ts';
import type { PRData } from './github.ts';
import type { SizeAssessmentOutput } from './schemas.ts';

export function writeStory(outDir: string, story: Story): string {
  const path = `${outDir}/${story.id}.json`;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(story, null, 2) + '\n');
  return path;
}

export function buildStoryFromCommit(opts: {
  repoFullName: string;
  commit: CommitRecord;
  ai: ChangesNodeOutput;
  size: SizeAssessmentOutput;
  pr: PRData | null;
}): Story {
  const { repoFullName, commit, ai, size, pr } = opts;
  const isMerge = pr !== null;

  const author = pr?.authorLogin ?? commit.authorName;
  const authorUrl = pr?.authorUrl ?? `https://github.com/${encodeURIComponent(commit.authorName)}`;

  // Use PR-reported additions/deletions/filesChanged if available, else local stat
  const additions = pr?.additions ?? commit.insertions;
  const deletions = pr?.deletions ?? commit.deletions;
  const filesChanged = pr?.changedFiles ?? commit.filesChanged;

  const base = {
    id: isMerge ? `pr-${pr.number}` : `commit-${commit.shortSha}`,
    sha: commit.sha,
    author,
    authorUrl,
    committedAt: commit.committedAt,
    categories: ai.categories,
    headline: ai.headline,
    standfirst: ai.standfirst,
    story: ai.story,
    digestSentence: ai.digestSentence,
    technicalDescription: ai.technicalDescription,
    imageDirection: ai.imageDirection,
    hasFactCheckIssues: ai.hasFactCheckIssues,
    factCheckIssues: ai.factCheckIssues,
    sizeAssessment: size.assessment,
    sizeReasoning: size.reasoning,
    additions,
    deletions,
    filesChanged,
  };

  if (isMerge) {
    return {
      ...base,
      kind: 'pr',
      prNumber: pr.number,
      prUrl: pr.url,
      mergedAt: pr.mergedAt ?? undefined,
      commitUrl: `https://github.com/${repoFullName}/commit/${commit.sha}`,
    };
  }

  return {
    ...base,
    kind: 'direct-push',
    commitUrl: `https://github.com/${repoFullName}/commit/${commit.sha}`,
  };
}
