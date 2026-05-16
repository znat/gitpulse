// `gitpulse image <path|url>` — (re)generate the illustration for a single
// story without re-running the analyzer. Useful for iterating on the prompt
// or swapping image models. Reads the existing story JSON, calls the same
// generate-feature-image path the analyzer uses, then writes the resulting
// imageUrl back into the file.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { loadConfig } from './config.ts';
import { createStorage } from './image/storage/index.ts';
import { generateFeatureImage } from './image/generate-feature-image.ts';
import { primaryCategoryKey } from './category-helpers.ts';
import { StorySchema } from './schemas.ts';
import { SiteFetcher } from './site-fetcher.ts';
import type { Story } from './types.ts';

export async function runImageCommand(arg: string | undefined): Promise<void> {
  if (!arg) {
    throw new Error(
      'Usage: gitpulse image <story-json-path | PR URL | site URL>\n' +
        '  examples:\n' +
        '    gitpulse image .gitpulse/data/stories/pr-52.json\n' +
        '    gitpulse image https://github.com/znat/gitpulse/pull/52\n' +
        '    gitpulse image https://gitpulse-demo.vercel.app/?story=pr-52',
    );
  }

  const cfg = loadConfig();
  if (!cfg.imageAi) {
    throw new Error(
      'Image generation is not configured. Set images.ai in .gitpulse.json ' +
        'and provide the matching API key env var (e.g. GEMINI_API_KEY).',
    );
  }
  if (!cfg.images?.storage) {
    throw new Error('images.storage is not configured in .gitpulse.json.');
  }

  const ref = resolveStoryRef(arg, cfg.storiesDir);

  if (!existsSync(ref.localPath)) {
    if (!ref.storyId) {
      throw new Error(
        `Story file not found: ${ref.localPath}\n` +
          'Pass a PR URL or site URL (?story=<id>) so it can be fetched from the deployed site.',
      );
    }
    const siteUrl = ref.siteFallbackUrl ?? cfg.siteUrl;
    console.log(`[gitpulse] image: fetching ${ref.storyId} from ${siteUrl}`);
    const fetcher = new SiteFetcher(siteUrl, {
      password: process.env.GITPULSE_PASSWORD,
    });
    const fetched = await fetcher.fetchStory(ref.storyId);
    if (!fetched) {
      throw new Error(
        `Story ${ref.storyId} not found at ${siteUrl}data/stories/${ref.storyId}.json`,
      );
    }
    mkdirSync(dirname(ref.localPath), { recursive: true });
    writeFileSync(ref.localPath, JSON.stringify(fetched, null, 2) + '\n');
  }

  const story = readStory(ref.localPath);
  const category = primaryCategoryKey(story.categories);
  if (category !== 'feature') {
    throw new Error(
      `Refusing to generate: primary category is "${category}", not "feature".`,
    );
  }

  console.log(`[gitpulse] image: ${story.id} (${cfg.imageAi.provider} ${cfg.imageAi.model})`);

  const storage = createStorage(cfg.images.storage);
  const url = await generateFeatureImage({
    storyId: story.id,
    // The generator only reads the four fields below — we hand it a minimal
    // ChangesNodeOutput-shaped object reconstructed from the persisted story.
    ai: {
      categories: story.categories,
      story: story.story,
      standfirst: story.standfirst,
      technicalDescription: story.technicalDescription,
      // Padding for the ChangesNodeOutput shape — unused by the prompt builder.
      headline: story.headline,
      digestSentence: story.digestSentence,
      codeReferences: [],
      hasFactCheckIssues: story.hasFactCheckIssues,
      factCheckIssues: story.factCheckIssues,
      imageDirection: story.imageDirection,
    },
    imageAi: cfg.imageAi,
    storage,
    accentColorHex: cfg.theme?.accentColor,
  });

  if (!url) {
    // Shouldn't reach here: we already checked the category above.
    throw new Error('Image generator returned null unexpectedly.');
  }

  const updated: Story = { ...story, imageUrl: url };
  writeFileSync(ref.localPath, JSON.stringify(updated, null, 2) + '\n');

  console.log(`[gitpulse] image: stored ${url}`);
  console.log(`[gitpulse] image: updated ${ref.localPath}`);
}

interface StoryRef {
  storyId: string | null;
  localPath: string;
  // When the input is a deployed-site URL, prefer fetching the story from that
  // origin rather than the analyzer's configured site (cfg.siteUrl). Lets the
  // user reach across deployments — e.g. iterate locally against
  // gitpulse-demo.vercel.app even though cfg.siteUrl points at staging.
  siteFallbackUrl?: string;
}

// Three input shapes:
//   1. GitHub PR URL  → derive `pr-<n>` and use cfg.storiesDir
//   2. Site URL with `?story=<id>` → derive id + remember origin as fallback
//   3. Filesystem path → use directly; storyId is parsed from the basename
//      so we still know what id to update inside the JSON, but no site
//      fallback is available.
function resolveStoryRef(arg: string, storiesDir: string): StoryRef {
  const prMatch = arg.match(/github\.com\/[^/]+\/[^/]+\/pull\/(\d+)/);
  if (prMatch) {
    const storyId = `pr-${prMatch[1]}`;
    return { storyId, localPath: `${storiesDir}/${storyId}.json` };
  }

  if (/^https?:\/\//.test(arg)) {
    let url: URL;
    try {
      url = new URL(arg);
    } catch {
      throw new Error(`Invalid URL: ${arg}`);
    }
    const storyId = url.searchParams.get('story');
    if (!storyId) {
      throw new Error(
        `Site URL is missing the ?story=<id> query param: ${arg}`,
      );
    }
    return {
      storyId,
      localPath: `${storiesDir}/${storyId}.json`,
      siteFallbackUrl: `${url.origin}/`,
    };
  }

  const localPath = isAbsolute(arg) ? arg : resolve(process.cwd(), arg);
  const idFromPath = localPath.match(/\/([^/]+)\.json$/)?.[1] ?? null;
  return { storyId: idFromPath, localPath };
}

function readStory(path: string): Story {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    throw new Error(
      `Failed to parse story JSON at ${path}: ${err instanceof Error ? err.message : err}`,
    );
  }
  const parsed = StorySchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `Story at ${path} failed schema validation:\n${JSON.stringify(parsed.error.issues, null, 2)}`,
    );
  }
  return parsed.data as Story;
}
