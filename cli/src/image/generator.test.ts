import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateImage } from './generator.ts';

const { generateContentMock } = vi.hoisted(() => ({
  generateContentMock: vi.fn(),
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent: generateContentMock };
  },
}));

const CONFIG = {
  provider: 'gemini' as const,
  model: 'gemini-3.1-flash-image-preview',
  apiKey: 'fake-key',
};

const PNG_B64 = 'iVBORw0KGgo=';

describe('generateImage (gemini)', () => {
  beforeEach(() => {
    generateContentMock.mockReset();
  });

  it('returns a Buffer and mime type from the inline image part', async () => {
    generateContentMock.mockResolvedValueOnce({
      candidates: [
        {
          content: {
            parts: [
              { text: 'ok' },
              { inlineData: { data: PNG_B64, mimeType: 'image/png' } },
            ],
          },
        },
      ],
    });

    const result = await generateImage(CONFIG, 'a prompt');

    expect(result.mimeType).toBe('image/png');
    expect(Buffer.isBuffer(result.buffer)).toBe(true);
    expect(result.buffer.equals(Buffer.from(PNG_B64, 'base64'))).toBe(true);
  });

  it('forwards the configured model and prompt to generateContent', async () => {
    generateContentMock.mockResolvedValueOnce({
      candidates: [
        { content: { parts: [{ inlineData: { data: PNG_B64, mimeType: 'image/png' } }] } },
      ],
    });

    await generateImage(CONFIG, 'the prompt');

    expect(generateContentMock).toHaveBeenCalledExactlyOnceWith({
      model: 'gemini-3.1-flash-image-preview',
      contents: 'the prompt',
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: { aspectRatio: '3:2', imageSize: '2K' },
      },
    });
  });

  it('defaults mimeType to image/png when omitted', async () => {
    generateContentMock.mockResolvedValueOnce({
      candidates: [
        { content: { parts: [{ inlineData: { data: PNG_B64 } }] } },
      ],
    });

    const result = await generateImage(CONFIG, 'p');
    expect(result.mimeType).toBe('image/png');
  });

  it('throws when no inline image data is returned', async () => {
    generateContentMock.mockResolvedValueOnce({
      candidates: [{ content: { parts: [{ text: 'only text' }] } }],
    });

    await expect(generateImage(CONFIG, 'p')).rejects.toThrow(
      /Gemini returned no image data/,
    );
  });

  it('throws when candidates are missing entirely', async () => {
    generateContentMock.mockResolvedValueOnce({});
    await expect(generateImage(CONFIG, 'p')).rejects.toThrow(
      /Gemini returned no image data/,
    );
  });
});
