import { loadConfig } from './config.ts';
import { defaultBranch, walkCommits } from './git.ts';
import { fetchFileChanges, formatCommitAsPRContext, formatPRContext } from './commit-context.ts';
import { createSummarizer, postProcessOutput } from './llm.ts';
import { buildStoryFromCommit, writeStory } from './render.ts';
import { GitHubClient, parseRepoFullName } from './github.ts';
import { assessPRSize } from './size.ts';

async function main() {
  const cfg = loadConfig();
  const branch = cfg.branch ?? defaultBranch(cfg.repoDir);
  const since = isoDaysAgo(cfg.bootstrapDays);

  console.log(`[gitpulse] repo=${cfg.repoFullName} branch=${branch} since=${since}`);
  console.log(
    `[gitpulse] ai.protocol=${cfg.ai.protocol} ai.model=${cfg.ai.model} ai.baseURL=${cfg.ai.baseURL ?? '(default)'}`,
  );
  console.log(`[gitpulse] github.token=${cfg.githubToken ? '(set)' : '(missing — direct-push only)'}`);

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
  const gh = cfg.githubToken ? new GitHubClient(cfg.githubToken) : null;
  const { owner, repo } = parseRepoFullName(cfg.repoFullName);

  let processed = 0;
  for (const baseCommit of commits) {
    const commit = { ...baseCommit, files: fetchFileChanges(cfg.repoDir, baseCommit.sha) };
    const stat = computeStatTotals(commit);
    Object.assign(commit, stat);

    process.stdout.write(`  ${commit.shortSha} ${truncate(commit.subject, 60)} … `);
    try {
      const pr = gh ? await gh.fetchPRForCommit(owner, repo, commit.sha) : null;
      const context = pr ? formatPRContext(commit, pr) : formatCommitAsPRContext(commit);
      const ai = postProcessOutput(await summarize(context));

      const size = assessPRSize(
        {
          additions: pr?.additions ?? commit.insertions,
          deletions: pr?.deletions ?? commit.deletions,
          filesChanged: pr?.changedFiles ?? commit.filesChanged,
        },
        cfg.sizeThresholds,
      );

      const story = buildStoryFromCommit({
        repoFullName: cfg.repoFullName,
        commit,
        ai,
        size,
        pr,
      });
      writeStory(cfg.outDir, story);
      processed++;
      const tag = pr ? `pr#${pr.number}` : 'commit';
      const cat = ai.categories[0]?.key ?? '?';
      console.log(`✓ [${tag} | ${cat} | ${size.assessment}]`);
    } catch (err) {
      console.log(`✗ ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(`[gitpulse] wrote ${processed}/${commits.length} stories`);
}

function computeStatTotals(commit: { files: { additions: number; deletions: number }[] }): {
  insertions: number;
  deletions: number;
  filesChanged: number;
} {
  return {
    insertions: commit.files.reduce((s, f) => s + f.additions, 0),
    deletions: commit.files.reduce((s, f) => s + f.deletions, 0),
    filesChanged: commit.files.length,
  };
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
