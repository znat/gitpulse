// Glue between the analyzer pipeline and the image module: gate on
// feature-only, build the prompt from the AI summary + theme, generate via
// Gemini, upload to the configured storage, and return the public URL.

import type { ChangesNodeOutput } from '../schemas.ts';
import { primaryCategoryKey } from '../category-helpers.ts';
import type { ImageStorage } from './storage/types.ts';
import { buildImagePrompt, hexToColorName, DEFAULT_THEME_COLOR } from './prompt.ts';
import { generateImage, type ImageAIConfig } from './generator.ts';

export interface GenerateFeatureImageInput {
  storyId: string;
  ai: ChangesNodeOutput;
  imageAi: ImageAIConfig;
  storage: ImageStorage;
  accentColorHex?: string;
}

// Returns the public URL of the uploaded image, or null when the story is
// not a feature. Throws on generation/upload failures so the caller can
// decide whether to surface them (the analyzer logs and proceeds).
export async function generateFeatureImage(
  input: GenerateFeatureImageInput,
): Promise<string | null> {
  if (primaryCategoryKey(input.ai.categories) !== 'feature') return null;

  const themeColor = input.accentColorHex
    ? hexToColorName(input.accentColorHex)
    : DEFAULT_THEME_COLOR;

  const prompt = buildImagePrompt({
    story: input.ai.story,
    scopeSummary: input.ai.standfirst,
    technicalDescription: input.ai.technicalDescription,
    themeColor,
  });

  const image = await generateImage(input.imageAi, prompt);
  const ext = extensionFromMimeType(image.mimeType);
  const key = `stories/${input.storyId}.${ext}`;
  await input.storage.upload(key, image.buffer, image.mimeType);
  return input.storage.urlFor(key);
}

function extensionFromMimeType(mimeType: string): string {
  switch (mimeType) {
    case 'image/png':
      return 'png';
    case 'image/jpeg':
      return 'jpg';
    case 'image/webp':
      return 'webp';
    default:
      return 'png';
  }
}
