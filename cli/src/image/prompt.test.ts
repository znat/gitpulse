import { describe, it, expect } from 'vitest';
import { buildImagePrompt } from './prompt.ts';

describe('buildImagePrompt', () => {
  const baseInput = {
    story: 'Add user authentication via OAuth2',
    scopeSummary: 'Implements login flow with Google provider',
    themeColor: '#b8860b',
  };

  it('substitutes themeColor verbatim into the prompt', () => {
    const prompt = buildImagePrompt({ ...baseInput, themeColor: '#326891' });
    expect(prompt).toContain('#326891');
    expect(prompt).not.toContain('{themeColor}');
  });

  it('includes story and scope summary in output', () => {
    const prompt = buildImagePrompt(baseInput);
    expect(prompt).toContain(baseInput.story);
    expect(prompt).toContain(baseInput.scopeSummary);
  });

  it('includes technicalDescription when provided', () => {
    const prompt = buildImagePrompt({
      ...baseInput,
      technicalDescription: 'Added auth middleware',
    });
    expect(prompt).toContain('Added auth middleware');
  });

  it('falls back to "(not available)" when technicalDescription is omitted', () => {
    const prompt = buildImagePrompt(baseInput);
    expect(prompt).toContain('(not available)');
  });
});
