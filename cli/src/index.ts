import { writeFileSync, mkdirSync, existsSync, readFileSync, readdirSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { loadConfig, type RuntimeConfig } from './config.ts';
import { defaultBranch, listReachableShas, walkCommits } from './git.ts';
import {
  fetchFileChanges,
  formatCommitAsPRContext,
  formatPRContext,
} from './commit-context.ts';
import { createSummarizer, postProcessOutput } from './llm.ts';
import { buildStoryFromCommit, deriveStoryId, writeStory } from './render.ts';
import {
  GitHubClient,
  parseRepoFullName,
  type GitHubRelease,
  type RepoInfo,
} from './github.ts';
import { assessPRSize } from './size.ts';
import { pMap } from './pmap.ts';
import { applyIgnoreSweep } from './ignore-sweep.ts';
import {
  SiteFetcher,
  WrongGitpulsePasswordError,
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
import { createStorage } from './image/storage/index.ts';
import type { ImageStorage } from './image/storage/types.ts';
import { generateFeatureImage } from './image/generate-feature-image.ts';
import { generateReleaseImage } from './image/generate-release-image.ts';
import type { ImageAIConfig } from './image/generator.ts';
import type { CommitRecord, Release, Story } from './types.ts';

export interface AnalyzerResult {
  dataDir: string;
  storiesCount: number;
  releasesCount: number;
  newStoriesCount: number;
}

export async function runAnalyzer(): Promise<AnalyzerResult> {
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
  const imageGen = resolveImageGeneration(cfg);
  console.log(`[gitpulse] images: ${imageGen.reason}`);

  // Restore prior content from the deployed site. When the site is password-
  // protected, the fetcher uses GITPULSE_PASSWORD to decrypt envelopes
  // transparently — without it, manifest/state would come back as ciphertext
  // and incremental analysis would silently re-bootstrap each run.
  const fetcher = new SiteFetcher(cfg.siteUrl, {
    password: process.env.GITPULSE_PASSWORD,
  });
  let priorManifest: Awaited<ReturnType<typeof fetcher.fetchManifest>>;
  try {
    priorManifest = await fetcher.fetchManifest();
  } catch (err) {
    if (err instanceof WrongGitpulsePasswordError) {
      console.error(`[gitpulse] ${err.message}`);
      process.exit(1);
    }
    throw err;
  }
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
  const repoInfo: RepoInfo = {
    ...(gh
      ? await gh.fetchRepo(owner, repo)
      : { owner, repo, description: '', url: `https://github.com/${owner}/${repo}` }),
    publicationTitle: cfg.publicationTitle,
    publicationSubtitle: cfg.publicationSubtitle,
    daysPerPage: cfg.daysPerPage,
    releasesPerPage: cfg.releasesPerPage,
    theme: cfg.theme,
  };
  writeJson(`${cfg.dataDir}/repo.json`, repoInfo);

  // Backfill prTitle for restored PR stories that predate the field.
  if (gh) {
    const backfilled = await backfillPRTitles({
      gh,
      owner,
      repo,
      storiesDir: cfg.storiesDir,
      concurrency: cfg.concurrency,
    });
    if (backfilled > 0) {
      console.log(`[gitpulse] backfilled prTitle on ${backfilled} prior stories`);
    }
  }

  // Walk + filter commits.
  const allCommits = walkCommits({
    repoDir: cfg.repoDir,
    branch,
    since,
    limit: cfg.limit,
  });

  // Apply curation: any PR carrying `cfg.labels.ignore` is excluded from
  // the publication. The label set on GitHub is the source of truth, so
  // we always query fresh and re-apply (which retroactively prunes old
  // stories when the label is added later).
  const ignored = gh
    ? await gh.listLabeledPRs(owner, repo, cfg.labels.ignore)
    : [];
  const { ignoredShas, removedCount } = applyIgnoreSweep({
    ignored,
    storiesDir: cfg.storiesDir,
  });
  if (ignored.length > 0 || removedCount > 0) {
    console.log(
      `[gitpulse] label '${cfg.labels.ignore}': ${ignored.length} PRs matched, ${removedCount} prior stories removed`,
    );
  }

  const newCommits = allCommits.filter(
    (c) => !seenSha.has(c.sha) && !ignoredShas.has(c.sha),
  );
  console.log(
    `[gitpulse] commits in window: ${allCommits.length}, new (not in manifest): ${newCommits.length}`,
  );

  let newStoriesCount = 0;
  if (newCommits.length === 0) {
    console.log('[gitpulse] no new commits to analyze');
  } else {
    const summarize = createSummarizer(cfg.ai);
    let failed = 0;
    await pMap(newCommits, cfg.concurrency, async (baseCommit) => {
      const result = await processCommit({
        baseCommit,
        cfg,
        summarize,
        gh,
        owner,
        repo,
        imageGen: imageGen.enabled ? imageGen : undefined,
      });
      if (result.ok) {
        if (!result.skipped) newStoriesCount++;
        const mark = result.skipped ? '–' : '✓';
        console.log(`  ${baseCommit.shortSha} ${truncate(baseCommit.subject, 60)} … ${mark} ${result.tag}`);
      } else {
        failed++;
        console.log(`  ${baseCommit.shortSha} ${truncate(baseCommit.subject, 60)} … ✗ ${result.error}`);
      }
    });
    console.log(`[gitpulse] wrote ${newStoriesCount}/${newCommits.length} new stories (${failed} failed)`);
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
    await processReleases({
      cfg,
      gh,
      fetcher,
      owner,
      repo,
      allStories,
      imageGen: imageGen.enabled ? imageGen : undefined,
    });
  } else if (cfg.releasesCap === 0) {
    console.log('[gitpulse] releases: skipped (releasesCap=0)');
  } else {
    console.log('[gitpulse] releases: skipped (no GitHub token)');
  }

  const releasesCount = readAllReleases(cfg.releasesDir).length;
  return {
    dataDir: cfg.dataDir,
    storiesCount: allStories.length,
    releasesCount,
    newStoriesCount,
  };
}

async function processReleases(opts: {
  cfg: RuntimeConfig;
  gh: GitHubClient;
  fetcher: SiteFetcher;
  owner: string;
  repo: string;
  allStories: Story[];
  imageGen?: EnabledImageGen;
}): Promise<void> {
  const { cfg, gh, fetcher, owner, repo, allStories, imageGen } = opts;

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
        imageGen,
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
  imageGen?: EnabledImageGen;
}): Promise<'written' | 'skipped'> {
  const { cfg, gh, owner, repo, release, previous, allStories, editor, imageGen } = opts;

  // Match PRs in this release window. With a predecessor we use the
  // GitHub compare endpoint; for the first release we walk every commit
  // reachable from the tag so the edition spans the full history.
  const shaList = previous
    ? await gh.fetchCompareShas(owner, repo, previous.tagName, release.tagName)
    : listReachableShas(cfg.repoDir, release.tagName);
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
  let existingImageUrl: string | undefined;

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
        // Preserve the image too — content unchanged, no need to spend
        // another generation. We'll still backfill below if it's missing.
        existingImageUrl = existing.imageUrl;
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

  // Image generation. Run when image gen is enabled AND either (a) we
  // regenerated the edition (content changed), or (b) the existing release
  // had no image (backfill). Preserve the existing image otherwise.
  let imageUrl = existingImageUrl;
  let imageTag = '';
  const shouldGenerateImage = !!imageGen && (!skipLLM || !existingImageUrl);
  if (shouldGenerateImage && imageGen) {
    try {
      imageUrl = await generateReleaseImage({
        tag: release.tagName,
        quip: edition.quip,
        releaseStory: edition.releaseStory,
        topStoryDetails: draft.topPRStories,
        releaseNotes: release.body || null,
        imageAi: imageGen.imageAi,
        storage: imageGen.storage,
        accentColorHex: cfg.theme?.accentColor,
      });
      imageTag = ' | image:stored';
    } catch (err) {
      imageTag = ` | image:failed(${err instanceof Error ? err.message : String(err)})`;
    }
  }

  const releaseWithImage: Release = imageUrl
    ? { ...finalRelease, imageUrl }
    : finalRelease;
  writeRelease(cfg.releasesDir, releaseWithImage);

  if (skipLLM && !imageTag) {
    return 'skipped';
  }

  console.log(
    `  ${release.tagName} … ✓ [${matched.length} prs, ${draft.meta.contributorCount} contributors${imageTag}]`,
  );
  return 'written';
}

interface ProcessOk {
  ok: true;
  tag: string;
  skipped?: boolean;
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
  imageGen?: EnabledImageGen;
}): Promise<ProcessResult> {
  const { baseCommit, cfg, summarize, gh, owner, repo, imageGen } = opts;
  try {
    const files = fetchFileChanges(cfg.repoDir, baseCommit.sha);
    const stat = computeStatTotals(files);
    const commit: CommitRecord = { ...baseCommit, files, ...stat };

    const ctx = gh
      ? await gh.fetchCommitContext(owner, repo, commit.sha)
      : { pr: null, commitAuthor: null };

    // Fast path for PRs labeled after they merged but before this run
    // reached them — the up-front sweep already filtered most; this
    // handles the edge case where the label landed between sweep and
    // per-commit fetch.
    if (ctx.pr?.labels.includes(cfg.labels.ignore)) {
      return { ok: true, tag: `pr#${ctx.pr.number} | ignored`, skipped: true };
    }

    const promptContext = ctx.pr
      ? formatPRContext(commit, ctx.pr)
      : formatCommitAsPRContext(commit);
    const ai = postProcessOutput(await summarize(promptContext));

    const size = assessPRSize({
      additions: ctx.pr?.additions ?? commit.insertions,
      deletions: ctx.pr?.deletions ?? commit.deletions,
      filesChanged: ctx.pr?.changedFiles ?? commit.filesChanged,
    });

    const storyId = deriveStoryId(ctx, commit);
    let imageUrl: string | undefined;
    let imageTag = '';
    if (imageGen) {
      try {
        const url = await generateFeatureImage({
          storyId,
          ai,
          imageAi: imageGen.imageAi,
          storage: imageGen.storage,
          accentColorHex: cfg.theme?.accentColor,
        });
        if (url) {
          imageUrl = url;
          imageTag = ' | image:stored';
        }
      } catch (err) {
        imageTag = ` | image:failed(${err instanceof Error ? err.message : String(err)})`;
      }
    }

    const story = buildStoryFromCommit({
      repoFullName: cfg.repoFullName,
      commit,
      ai,
      size,
      context: ctx,
      imageUrl,
    });
    writeStory(cfg.storiesDir, story);

    const tag = ctx.pr ? `pr#${ctx.pr.number}` : 'commit';
    const cat = ai.categories[0]?.key ?? '?';
    return { ok: true, tag: `[${tag} | ${cat} | ${size.assessment}${imageTag}]` };
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

interface EnabledImageGen {
  enabled: true;
  reason: string;
  imageAi: ImageAIConfig;
  storage: ImageStorage;
}
interface DisabledImageGen {
  enabled: false;
  reason: string;
}
type ImageGenState = EnabledImageGen | DisabledImageGen;

// Resolve whether feature-image generation is wired up. Both an image AI
// config (provider + model + API key) and a storage backend are required;
// either missing piece disables generation with a one-line reason that
// the analyzer logs at start.
function resolveImageGeneration(cfg: RuntimeConfig): ImageGenState {
  if (!cfg.imageAi) {
    if (cfg.images?.ai) {
      return {
        enabled: false,
        reason: 'skipped (GEMINI_API_KEY or GOOGLE_API_KEY missing)',
      };
    }
    return { enabled: false, reason: 'skipped (no images.ai in .gitpulse.json)' };
  }
  if (!cfg.images?.storage) {
    return { enabled: false, reason: 'skipped (no images.storage in .gitpulse.json)' };
  }
  const storage = createStorage(cfg.images.storage);
  return {
    enabled: true,
    reason: `enabled (${cfg.imageAi.provider} ${cfg.imageAi.model})`,
    imageAi: cfg.imageAi,
    storage,
  };
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

async function backfillPRTitles(opts: {
  gh: GitHubClient;
  owner: string;
  repo: string;
  storiesDir: string;
  concurrency: number;
}): Promise<number> {
  let files: string[] = [];
  try {
    files = readdirSync(opts.storiesDir).filter((f) => f.endsWith('.json'));
  } catch {
    return 0;
  }
  const candidates: { path: string; story: Story }[] = [];
  for (const f of files) {
    const path = join(opts.storiesDir, f);
    try {
      const story = JSON.parse(readFileSync(path, 'utf8')) as Story;
      if (
        story.kind === 'pr' &&
        typeof story.prNumber === 'number' &&
        !story.prTitle
      ) {
        candidates.push({ path, story });
      }
    } catch {
      // skip unparseable
    }
  }
  if (candidates.length === 0) return 0;

  let backfilled = 0;
  await pMap(candidates, opts.concurrency, async ({ path, story }) => {
    const title = await opts.gh.fetchPRTitle(
      opts.owner,
      opts.repo,
      story.prNumber!,
    );
    if (!title) return;
    const updated = { ...story, prTitle: title };
    writeFileSync(path, JSON.stringify(updated, null, 2) + '\n');
    backfilled++;
  });
  return backfilled;
}
