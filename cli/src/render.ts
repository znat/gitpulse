import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { StorySchema, type ChangesNodeOutput } from './schemas.ts';
import type { CommitRecord, Story } from './types.ts';
import type { CommitContext } from './github.ts';
import type { SizeAssessmentOutput } from './schemas.ts';

export function writeStory(outDir: string, story: Story): string {
  const validation = StorySchema.safeParse(story);
  if (!validation.success) {
    throw new Error(
      `Story ${story.id} failed schema validation before write:\n` +
        JSON.stringify(validation.error.issues, null, 2),
    );
  }

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
  context: CommitContext;
}): Story {
  const { repoFullName, commit, ai, size, context } = opts;
  const { pr, commitAuthor } = context;
  const isMerge = pr !== null;

  // Author resolution priority:
  //   1. PR author from GraphQL (verified GitHub login)
  //   2. Commit's GraphQL Commit.author.user (verified GitHub login)
  //   3. Git committer name (display name only — no URL)
  const author = pr?.authorLogin ?? commitAuthor?.login ?? commit.authorName;
  const authorUrl = pr?.authorUrl ?? commitAuthor?.url ?? undefined;

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
      prTitle: pr.title,
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
