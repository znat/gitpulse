import { loadConfig } from './config.ts';
import { defaultBranch, walkCommits } from './git.ts';
import { fetchFileChanges } from './commit-context.ts';
import { createSummarizer, postProcessOutput } from './llm.ts';
import { buildStoryFromCommit, writeStory } from './render.ts';

async function main() {
  const cfg = loadConfig();
  const branch = cfg.branch ?? defaultBranch(cfg.repoDir);
  const since = isoDaysAgo(cfg.bootstrapDays);

  console.log(`[gitpulse] repo=${cfg.repoFullName} branch=${branch} since=${since}`);
  console.log(
    `[gitpulse] ai.protocol=${cfg.ai.protocol} ai.model=${cfg.ai.model} ai.baseURL=${cfg.ai.baseURL ?? '(default)'}`,
  );

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
  for (const baseCommit of commits) {
    const commit = { ...baseCommit, files: fetchFileChanges(cfg.repoDir, baseCommit.sha) };
    process.stdout.write(`  ${commit.shortSha} ${truncate(commit.subject, 60)} … `);
    try {
      const ai = postProcessOutput(await summarize(commit));
      const story = buildStoryFromCommit({ repoFullName: cfg.repoFullName, commit, ai });
      writeStory(cfg.outDir, story);
      processed++;
      console.log(`✓ [${ai.categories[0]?.key ?? '?'}]`);
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
