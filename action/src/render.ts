import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Story } from './types.ts';

export function writeStory(outDir: string, story: Story): string {
  const path = `${outDir}/${story.id}.json`;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(story, null, 2) + '\n');
  return path;
}

export function buildStoryFromCommit(opts: {
  repoFullName: string;
  sha: string;
  shortSha: string;
  authorName: string;
  committedAt: string;
  headline: string;
  standfirst: string;
  body: string;
}): Story {
  return {
    id: `commit-${opts.shortSha}`,
    kind: 'direct-push',
    sha: opts.sha,
    author: opts.authorName,
    committedAt: opts.committedAt,
    commitUrl: `https://github.com/${opts.repoFullName}/commit/${opts.sha}`,
    headline: opts.headline,
    standfirst: opts.standfirst,
    body: opts.body,
  };
}
