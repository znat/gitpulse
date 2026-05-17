// Generate the "Special Edition" illustration for a release. Mirrors
// generate-feature-image.ts (same provider abstraction, same storage
// interface) but consumes the release shape: quip + releaseStory + top-5
// story details + raw GitHub release notes.

import type { Story } from '../types.ts';
import type { ImageStorage } from './storage/types.ts';
import { encodeFilename } from '../release-render.ts';
import { buildReleaseImagePrompt, type ReleaseTopStoryEntry } from './release-prompt.ts';
import { generateImage, type ImageAIConfig } from './generator.ts';
import { extensionFromMimeType } from './mime.ts';

// Default accent color used when .gitpulse.json doesn't declare a theme.
// Kept in sync with generate-feature-image.ts so feature + release images
// fall back to the same palette.
const DEFAULT_ACCENT_HEX = '#b8860b';

export interface GenerateReleaseImageInput {
  tag: string;
  quip: string;
  releaseStory: string;
  // Top-5 full Story objects (from ReleaseDraft.topPRStories). We pull
  // story+technicalDescription out of these to ground the editorial prompt.
  topStoryDetails: Story[];
  releaseNotes: string | null;
  imageAi: ImageAIConfig;
  storage: ImageStorage;
  accentColorHex?: string;
}

// Returns the public URL of the uploaded illustration. Throws on
// generation/upload failure so the caller (processOneRelease) can log and
// continue without aborting the analyzer run.
export async function generateReleaseImage(
  input: GenerateReleaseImageInput,
): Promise<string> {
  const topStories: ReleaseTopStoryEntry[] = input.topStoryDetails.map((s) => {
    const entry: ReleaseTopStoryEntry = { headline: s.headline };
    if (s.standfirst) entry.standfirst = s.standfirst;
    if (s.story) entry.story = s.story;
    if (s.technicalDescription) entry.technicalDescription = s.technicalDescription;
    return entry;
  });

  const prompt = buildReleaseImagePrompt({
    quip: input.quip,
    releaseStory: input.releaseStory,
    topStories,
    releaseNotes: input.releaseNotes,
    themeColor: input.accentColorHex ?? DEFAULT_ACCENT_HEX,
  });

  const image = await generateImage(input.imageAi, prompt);
  const ext = extensionFromMimeType(image.mimeType);
  // Mirror the on-disk filename encoding so the storage key is one-to-one
  // with the JSON file for that release.
  const key = `releases/${encodeFilename(input.tag)}.${ext}`;
  await input.storage.upload(key, image.buffer, image.mimeType);
  return input.storage.urlFor(key);
}
