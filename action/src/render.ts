import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { ChangesNodeOutput } from './schemas.ts';
import type { CommitRecord, Story } from './types.ts';

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
}): Story {
  const { repoFullName, commit, ai } = opts;
  return {
    id: `commit-${commit.shortSha}`,
    kind: 'direct-push',
    sha: commit.sha,
    author: commit.authorName,
    committedAt: commit.committedAt,
    commitUrl: `https://github.com/${repoFullName}/commit/${commit.sha}`,
    categories: ai.categories,
    headline: ai.headline,
    standfirst: ai.standfirst,
    story: ai.story,
    digestSentence: ai.digestSentence,
    technicalDescription: ai.technicalDescription,
    imageDirection: ai.imageDirection,
    hasFactCheckIssues: ai.hasFactCheckIssues,
    factCheckIssues: ai.factCheckIssues,
  };
}
