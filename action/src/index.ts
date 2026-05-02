import { writeFileSync, mkdirSync, existsSync, readFileSync, readdirSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { loadConfig, type RuntimeConfig } from './config.ts';
import { defaultBranch, walkCommits } from './git.ts';
import {
  fetchFileChanges,
  formatCommitAsPRContext,
  formatPRContext,
} from './commit-context.ts';
import { createSummarizer, postProcessOutput } from './llm.ts';
import { buildStoryFromCommit, writeStory } from './render.ts';
import {
  GitHubClient,
  parseRepoFullName,
  type GitHubRelease,
  type RepoInfo,
} from './github.ts';
import { assessPRSize } from './size.ts';
import { pMap } from './pmap.ts';
import {
  SiteFetcher,
  readAllStories,
  readAllReleases,
} from './site-fetcher.ts';
import {
  buildManifestFromStories,
  buildReleaseManifestFromReleases,
  buildStateFromStories,
  SCHEMA_VERSION,
  writeManifest,
  writeReleaseManifest,
  writeState,
} from './state.ts';
import {
  assembleRelease,
  buildDraft,
  matchStoriesForRelease,
} from './release-builder.ts';
import { encodeFilename, writeRelease } from './release-render.ts';
import { createReleaseEditor, getFallbackEdition } from './release-llm.ts';
import type { CommitRecord, Release, Story } from './types.ts';

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

  // Releases pass.
  if (gh && cfg.releasesCap > 0) {
    await processReleases({ cfg, gh, fetcher, owner, repo, allStories });
  } else if (cfg.releasesCap === 0) {
    console.log('[gitpulse] releases: skipped (releasesCap=0)');
  } else {
    console.log('[gitpulse] releases: skipped (no GitHub token)');
  }
}

async function processReleases(opts: {
  cfg: RuntimeConfig;
  gh: GitHubClient;
  fetcher: SiteFetcher;
  owner: string;
  repo: string;
  allStories: Story[];
}): Promise<void> {
  const { cfg, gh, fetcher, owner, repo, allStories } = opts;

  // Restore prior releases from the deployed site so we can compare hashes.
  const priorReleaseManifest = await fetcher.fetchReleaseManifest();
  if (priorReleaseManifest) {
    const { restored, failed } = await fetcher.restorePriorReleases({
      manifest: priorReleaseManifest,
      releasesDir: cfg.releasesDir,
      concurrency: cfg.concurrency,
    });
    console.log(
      `[gitpulse] prior release manifest: ${priorReleaseManifest.entries.length} entries, restored ${restored} (${failed} failed)`,
    );
  }

  // Prune stale release JSON files before regenerating the manifest.
  const pruned = pruneRestoredReleases(cfg);
  if (pruned > 0) {
    console.log(`[gitpulse] pruned ${pruned} stale release JSON files`);
  }

  let fetched: GitHubRelease[];
  try {
    // Fetch more than releasesCap to preserve the predecessor window after filtering
    const fetchCount = cfg.includePrereleases ? cfg.releasesCap : cfg.releasesCap + 1;
    fetched = await gh.fetchReleases(owner, repo, fetchCount);
  } catch (err) {
    console.warn(
      `[gitpulse] release fetch failed: ${err instanceof Error ? err.message : err}`,
    );
    return;
  }

  // Apply prerelease filter before trimming to cap
  if (!cfg.includePrereleases) {
    fetched = fetched.filter((r) => !r.isPrerelease);
  }

  // Trim to cap after filtering, keeping one extra as predecessor for the oldest
  const sortedByPublish = [...fetched].sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt),
  );
  const cappedReleases = sortedByPublish.slice(0, cfg.releasesCap);

  if (cappedReleases.length === 0) {
    console.log('[gitpulse] releases: 0 fetched');
    writeReleaseManifest(
      cfg.dataDir,
      buildReleaseManifestFromReleases(readAllReleases(cfg.releasesDir)),
    );
    return;
  }

  const editor = createReleaseEditor(cfg.ai);
  const repoInfo = (() => {
    const path = `${cfg.dataDir}/repo.json`;
    try {
      return JSON.parse(readFileSync(path, 'utf8')) as RepoInfo;
    } catch {
      return null;
    }
  })();

  // Sorted newest-first; pair each with its predecessor (if any).
  // Use the full sorted list to find predecessors, even if they're beyond the cap
  const sortedNewestFirst = sortedByPublish;

  let processed = 0;
  let skipped = 0;
  let failed = 0;
  for (let i = 0; i < cappedReleases.length; i++) {
    const release = cappedReleases[i]!;
    // Find predecessor from the full sorted list to ensure we have it even if it's beyond cap
    const releaseIndex = sortedNewestFirst.indexOf(release);
    const previous = sortedNewestFirst[releaseIndex + 1] ?? null;
    try {
      const result = await processOneRelease({
        cfg,
        gh,
        owner,
        repo,
        repoDescription: repoInfo?.description ?? null,
        release,
        previous,
        allStories,
        editor,
      });
      if (result === 'skipped') {
        skipped++;
      } else {
        processed++;
      }
    } catch (err) {
      failed++;
      console.warn(
        `[gitpulse]   release ${release.tagName} failed: ${err instanceof Error ? err.message : err}`,
      );
    }
  }
  console.log(
    `[gitpulse] releases: ${cappedReleases.length} fetched, ${processed} new/updated, ${skipped} unchanged${failed ? `, ${failed} failed` : ''}`,
  );

  // Rebuild manifest from final on-disk state.
  const allReleases = readAllReleases(cfg.releasesDir);
  writeReleaseManifest(
    cfg.dataDir,
    buildReleaseManifestFromReleases(allReleases),
  );
}

async function processOneRelease(opts: {
  cfg: RuntimeConfig;
  gh: GitHubClient;
  owner: string;
  repo: string;
  repoDescription: string | null;
  release: GitHubRelease;
  previous: GitHubRelease | null;
  allStories: Story[];
  editor: ReturnType<typeof createReleaseEditor>;
}): Promise<'written' | 'skipped'> {
  const { cfg, gh, owner, repo, release, previous, allStories, editor } = opts;

  // Match PRs in this release window via the compare endpoint.
  const shaList = previous
    ? await gh.fetchCompareShas(owner, repo, previous.tagName, release.tagName)
    : [];
  const matched = matchStoriesForRelease(allStories, shaList);

  const draft = buildDraft({
    schemaVersion: SCHEMA_VERSION,
    tag: release.tagName,
    name: release.name,
    publishedAt: release.publishedAt,
    authorLogin: release.authorLogin,
    authorUrl: release.authorUrl,
    isPrerelease: release.isPrerelease,
    releaseUrl: release.htmlUrl,
    previousTag: previous?.tagName ?? null,
    matchedStories: matched,
  });

  const existingPath = `${cfg.releasesDir}/${encodeFilename(release.tagName)}.json`;
  let skipLLM = false;
  let edition: { quip: string; releaseStory: string } | undefined;

  if (existsSync(existingPath)) {
    try {
      const existing = JSON.parse(
        readFileSync(existingPath, 'utf8'),
      ) as Release;
      if (existing.inputsHash === draft.inputsHash) {
        // Copy existing quip and releaseStory to skip LLM but still rewrite file
        edition = {
          quip: existing.quip,
          releaseStory: existing.releaseStory,
        };
        skipLLM = true;
      }
    } catch {
      // fall through and regenerate
    }
  }

  // Generate quip + releaseStory via LLM. On failure, use the fallback so
  // the file still gets written (the analyzer doesn't bail on one release).
  if (!skipLLM) {
    try {
      edition = await editor({
        repoName: `${owner}/${repo}`,
        repoDescription: opts.repoDescription,
        releaseTag: release.tagName,
        releaseName: release.name,
        releaseNotes: release.body || null,
        topStories: draft.topPRStories.map((s) => ({
          headline: s.headline,
          standfirst: s.standfirst,
          digestSentence: s.digestSentence,
          primaryCategoryKey: draft.meta.topStories.find(
            (t) => t.storyId === s.id,
          )?.primaryCategoryKey ?? 'misc',
        })),
        prCount: draft.meta.prCount,
        contributorCount: draft.meta.contributorCount,
        totalAdditions: draft.meta.totalAdditions,
        totalDeletions: draft.meta.totalDeletions,
        contributorLogins: Array.from(
          new Set(matched.map((s) => s.author)),
        ),
      });
    } catch (err) {
      console.warn(
        `[gitpulse]   release ${release.tagName} LLM failed, using fallback: ${err instanceof Error ? err.message : err}`,
      );
      edition = getFallbackEdition();
    }
  }

  // Ensure edition is assigned (defensive check, should never happen given the logic)
  if (!edition) {
    edition = getFallbackEdition();
  }

  const finalRelease = assembleRelease(draft, edition);
  writeRelease(cfg.releasesDir, finalRelease);

  if (skipLLM) {
    return 'skipped';
  }

  console.log(
    `  ${release.tagName} … ✓ [${matched.length} prs, ${draft.meta.contributorCount} contributors]`,
  );
  return 'written';
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

// Prune stale release JSON files that no longer meet current filters or exceed
// the releasesCap. This is called after restoring prior releases so that the
// subsequent manifest rebuild only includes valid, current releases.
function pruneRestoredReleases(cfg: RuntimeConfig): number {
  let pruned = 0;
  let files: string[] = [];
  try {
    files = readdirSync(cfg.releasesDir).filter(
      (f) => f.endsWith('.json') && f !== 'manifest.json',
    );
  } catch {
    return 0;
  }

  for (const filename of files) {
    const path = join(cfg.releasesDir, filename);
    try {
      const release = JSON.parse(readFileSync(path, 'utf8')) as Release;
      // Remove if it's a prerelease but we're not including prereleases
      if (release.isPrerelease && !cfg.includePrereleases) {
        unlinkSync(path);
        pruned++;
      }
    } catch {
      // If we can't parse it, remove it as invalid
      try {
        unlinkSync(path);
        pruned++;
      } catch {
        // Ignore unlink errors
      }
    }
  }
  return pruned;
}

main().catch((err) => {
  console.error('[gitpulse] fatal', err);
  process.exit(1);
});
