// Gemini image generator. Ported from gitsky/src/services/image-generator.ts
// (the generateGeminiImage branch). The OpenAI/fal branches and LangSmith
// `traceable` wrap are intentionally omitted — see the plan in PR 2/3.

import { GoogleGenAI } from '@google/genai';

// Upper bound for the Gemini image-generation request. Image generation
// typically runs 15-30s end-to-end (observed); 120s leaves headroom for slow
// network conditions without letting a stuck connection block the analyzer
// indefinitely.
const GEMINI_TIMEOUT_MS = 120_000;

export interface ImageAIConfig {
  provider: 'gemini';
  model: string;
  apiKey: string;
}

export interface GeneratedImage {
  buffer: Buffer;
  mimeType: string;
}

export async function generateImage(
  config: ImageAIConfig,
  prompt: string,
): Promise<GeneratedImage> {
  const ai = new GoogleGenAI({ apiKey: config.apiKey });

  const response = await withTimeout(
    ai.models.generateContent({
      model: config.model,
      contents: prompt,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
        // 1K (~1024px) covers our largest render — the feed hero at 720px CSS
        // (~1440px on a 2x display) and the ~480px side panel. 2K (~2048px) is
        // bigger than anything we show and costs ~50% more per image
        // ($0.101 vs $0.067), so it's wasted resolution + heavier Blob uploads.
        imageConfig: { aspectRatio: '3:2', imageSize: '1K' },
      },
    }),
    GEMINI_TIMEOUT_MS,
    `Gemini generateContent timed out after ${GEMINI_TIMEOUT_MS}ms`,
  );

  const parts = response.candidates?.[0]?.content?.parts;
  const imagePart = parts?.find((p) => p.inlineData?.data);
  if (!imagePart?.inlineData?.data) {
    throw new Error('Gemini returned no image data');
  }

  return {
    buffer: Buffer.from(imagePart.inlineData.data, 'base64'),
    mimeType: imagePart.inlineData.mimeType ?? 'image/png',
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  }) as Promise<T>;
}
