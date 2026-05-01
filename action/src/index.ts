import { loadConfig } from './config.ts';
import { defaultBranch, walkCommits } from './git.ts';
import { createSummarizer } from './llm.ts';
import { buildStoryFromCommit, writeStory } from './render.ts';

async function main() {
  const cfg = loadConfig();
  const branch = cfg.branch ?? defaultBranch(cfg.repoDir);
  const since = isoDaysAgo(cfg.bootstrapDays);

  console.log(`[gitpulse] repo=${cfg.repoFullName} branch=${branch} since=${since}`);
  console.log(`[gitpulse] ai.model=${cfg.ai.model} ai.baseURL=${cfg.ai.baseURL ?? '(default)'}`);

  const commits = walkCommits({
    repoDir: cfg.repoDir,
    branch,
    since,
    limit: cfg.limit,
  });
  console.log(`[gitpulse] commits to process: ${commits.length}`);

  if (commits.length === 0) {
    console.log('[gitpulse] nothing to do');
    return;
  }

  const summarize = createSummarizer(cfg.ai);

  let processed = 0;
  for (const commit of commits) {
    process.stdout.write(`  ${commit.shortSha} ${truncate(commit.subject, 60)} … `);
    try {
      const ai = await summarize(commit);
      const story = buildStoryFromCommit({
        repoFullName: cfg.repoFullName,
        sha: commit.sha,
        shortSha: commit.shortSha,
        authorName: commit.authorName,
        committedAt: commit.committedAt,
        headline: ai.headline,
        standfirst: ai.standfirst,
        body: ai.body,
      });
      writeStory(cfg.outDir, story);
      processed++;
      console.log(`✓`);
    } catch (err) {
      console.log(`✗ ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(`[gitpulse] wrote ${processed}/${commits.length} stories`);
}

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86400_000).toISOString();
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

main().catch((err) => {
  console.error('[gitpulse] fatal', err);
  process.exit(1);
});
