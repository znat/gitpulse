// Gemini image generator. Ported from gitsky/src/services/image-generator.ts
// (the generateGeminiImage branch). The OpenAI/fal branches and LangSmith
// `traceable` wrap are intentionally omitted — see the plan in PR 2/3.

import { GoogleGenAI } from '@google/genai';

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

  const response = await ai.models.generateContent({
    model: config.model,
    contents: prompt,
    config: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: { aspectRatio: '3:2', imageSize: '2K' },
    },
  });

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
