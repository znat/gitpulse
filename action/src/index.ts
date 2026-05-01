import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { loadConfig, type RuntimeConfig } from './config.ts';
import { defaultBranch, walkCommits } from './git.ts';
import {
  fetchFileChanges,
  formatCommitAsPRContext,
  formatPRContext,
} from './commit-context.ts';
import { createSummarizer, postProcessOutput } from './llm.ts';
import { buildStoryFromCommit, writeStory } from './render.ts';
import { GitHubClient, parseRepoFullName, type RepoInfo } from './github.ts';
import { assessPRSize } from './size.ts';
import { pMap } from './pmap.ts';
import {
  SiteFetcher,
  readAllStories,
} from './site-fetcher.ts';
import {
  buildManifestFromStories,
  buildStateFromStories,
  writeManifest,
  writeState,
} from './state.ts';
import type { CommitRecord } from './types.ts';

async function main() {
  const cfg = loadConfig();
  const branch = cfg.branch ?? defaultBranch(cfg.repoDir);
  const since = isoDaysAgo(cfg.bootstrapDays);

  console.log(`[gitpulse] repo=${cfg.repoFullName} branch=${branch} since=${since}`);
  console.log(
    `[gitpulse] ai.protocol=${cfg.ai.protocol} ai.model=${cfg.ai.model} ai.baseURL=${cfg.ai.baseURL ?? '(default)'}`,
  );
  console.log(
    `[gitpulse] github.token=${cfg.githubToken ? '(set)' : '(missing — direct-push only)'}`,
  );
  console.log(`[gitpulse] site.url=${cfg.siteUrl}`);
  console.log(`[gitpulse] concurrency=${cfg.concurrency}`);

  // Restore prior content from the deployed site.
  const fetcher = new SiteFetcher(cfg.siteUrl);
  const priorManifest = await fetcher.fetchManifest();
  const seenSha = new Set<string>();
  if (priorManifest) {
    console.log(`[gitpulse] prior manifest: ${priorManifest.entries.length} entries`);
    const { restored, failed } = await fetcher.restorePriorStories({
      manifest: priorManifest,
      storiesDir: cfg.storiesDir,
      concurrency: cfg.concurrency,
    });
    console.log(`[gitpulse] restored ${restored}/${priorManifest.entries.length} prior stories (${failed} failed)`);
    for (const e of priorManifest.entries) seenSha.add(e.sha);
  } else {
    console.log(`[gitpulse] no prior manifest at ${cfg.siteUrl}data/manifest.json — bootstrap`);
  }

  // Fetch + persist repo metadata.
  const gh = cfg.githubToken ? new GitHubClient(cfg.githubToken) : null;
  const { owner, repo } = parseRepoFullName(cfg.repoFullName);
  const repoInfo: RepoInfo = gh
    ? await gh.fetchRepo(owner, repo)
    : { owner, repo, description: '', url: `https://github.com/${owner}/${repo}` };
  writeJson(`${cfg.dataDir}/repo.json`, repoInfo);

  // Walk + filter commits.
  const allCommits = walkCommits({
    repoDir: cfg.repoDir,
    branch,
    since,
    limit: cfg.limit,
  });
  const newCommits = allCommits.filter((c) => !seenSha.has(c.sha));
  console.log(
    `[gitpulse] commits in window: ${allCommits.length}, new (not in manifest): ${newCommits.length}`,
  );

  if (newCommits.length === 0) {
    console.log('[gitpulse] no new commits to analyze');
  } else {
    const summarize = createSummarizer(cfg.ai);
    let processed = 0;
    let failed = 0;
    await pMap(newCommits, cfg.concurrency, async (baseCommit) => {
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
        console.log(`  ${baseCommit.shortSha} ${truncate(baseCommit.subject, 60)} … ✓ ${result.tag}`);
      } else {
        failed++;
        console.log(`  ${baseCommit.shortSha} ${truncate(baseCommit.subject, 60)} … ✗ ${result.error}`);
      }
    });
    console.log(`[gitpulse] wrote ${processed}/${newCommits.length} new stories (${failed} failed)`);
  }

  // Rebuild manifest + state from the on-disk story set.
  const allStories = readAllStories(cfg.storiesDir);
  writeManifest(cfg.dataDir, buildManifestFromStories(allStories));
  writeState(cfg.dataDir, buildStateFromStories(allStories));
  console.log(
    `[gitpulse] manifest: ${allStories.length} total stories, state cursor=${allStories[0]?.sha.slice(0, 7) ?? '(empty)'}`,
  );
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
  cfg: RuntimeConfig;
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

    const ctx = gh
      ? await gh.fetchCommitContext(owner, repo, commit.sha)
      : { pr: null, commitAuthor: null };
    const promptContext = ctx.pr
      ? formatPRContext(commit, ctx.pr)
      : formatCommitAsPRContext(commit);
    const ai = postProcessOutput(await summarize(promptContext));

    const size = assessPRSize({
      additions: ctx.pr?.additions ?? commit.insertions,
      deletions: ctx.pr?.deletions ?? commit.deletions,
      filesChanged: ctx.pr?.changedFiles ?? commit.filesChanged,
    });

    const story = buildStoryFromCommit({
      repoFullName: cfg.repoFullName,
      commit,
      ai,
      size,
      context: ctx,
    });
    writeStory(cfg.storiesDir, story);

    const tag = ctx.pr ? `pr#${ctx.pr.number}` : 'commit';
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

function writeJson(path: string, obj: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(obj, null, 2) + '\n');
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
