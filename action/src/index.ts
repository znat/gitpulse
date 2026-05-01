import { loadConfig } from './config.ts';
import { defaultBranch, walkCommits } from './git.ts';
import { fetchFileChanges, formatCommitAsPRContext, formatPRContext } from './commit-context.ts';
import { createSummarizer, postProcessOutput } from './llm.ts';
import { buildStoryFromCommit, writeStory } from './render.ts';
import { GitHubClient, parseRepoFullName } from './github.ts';
import { assessPRSize } from './size.ts';
import { pMap } from './pmap.ts';
import type { CommitRecord } from './types.ts';

async function main() {
  const cfg = loadConfig();
  const branch = cfg.branch ?? defaultBranch(cfg.repoDir);
  const since = isoDaysAgo(cfg.bootstrapDays);

  console.log(`[gitpulse] repo=${cfg.repoFullName} branch=${branch} since=${since}`);
  console.log(
    `[gitpulse] ai.protocol=${cfg.ai.protocol} ai.model=${cfg.ai.model} ai.baseURL=${cfg.ai.baseURL ?? '(default)'}`,
  );
  console.log(`[gitpulse] github.token=${cfg.githubToken ? '(set)' : '(missing — direct-push only)'}`);
  console.log(`[gitpulse] concurrency=${cfg.concurrency}`);

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
  let failed = 0;

  await pMap(commits, cfg.concurrency, async (baseCommit) => {
    const result = await processCommit({
      baseCommit,
      cfg,
      summarize,
      gh,
      owner,
      repo,
    });
    if (result.ok) {
      processed++;
      console.log(
        `  ${baseCommit.shortSha} ${truncate(baseCommit.subject, 60)} … ✓ ${result.tag}`,
      );
    } else {
      failed++;
      console.log(`  ${baseCommit.shortSha} ${truncate(baseCommit.subject, 60)} … ✗ ${result.error}`);
    }
  });

  console.log(`[gitpulse] wrote ${processed}/${commits.length} stories (${failed} failed)`);
}

interface ProcessOk {
  ok: true;
  tag: string;
}
interface ProcessFail {
  ok: false;
  error: string;
}
type ProcessResult = ProcessOk | ProcessFail;

async function processCommit(opts: {
  baseCommit: CommitRecord;
  cfg: ReturnType<typeof loadConfig>;
  summarize: ReturnType<typeof createSummarizer>;
  gh: GitHubClient | null;
  owner: string;
  repo: string;
}): Promise<ProcessResult> {
  const { baseCommit, cfg, summarize, gh, owner, repo } = opts;
  try {
    const files = fetchFileChanges(cfg.repoDir, baseCommit.sha);
    const stat = computeStatTotals(files);
    const commit: CommitRecord = { ...baseCommit, files, ...stat };

    const pr = gh ? await gh.fetchPRForCommit(owner, repo, commit.sha) : null;
    const context = pr ? formatPRContext(commit, pr) : formatCommitAsPRContext(commit);
    const ai = postProcessOutput(await summarize(context));

    const size = assessPRSize({
      additions: pr?.additions ?? commit.insertions,
      deletions: pr?.deletions ?? commit.deletions,
      filesChanged: pr?.changedFiles ?? commit.filesChanged,
    });

    const story = buildStoryFromCommit({
      repoFullName: cfg.repoFullName,
      commit,
      ai,
      size,
      pr,
    });
    writeStory(cfg.outDir, story);

    const tag = pr ? `pr#${pr.number}` : 'commit';
    const cat = ai.categories[0]?.key ?? '?';
    return { ok: true, tag: `[${tag} | ${cat} | ${size.assessment}]` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function computeStatTotals(files: { additions: number; deletions: number }[]): {
  insertions: number;
  deletions: number;
  filesChanged: number;
} {
  return {
    insertions: files.reduce((s, f) => s + f.additions, 0),
    deletions: files.reduce((s, f) => s + f.deletions, 0),
    filesChanged: files.length,
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
