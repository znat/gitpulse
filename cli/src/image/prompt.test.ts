import { describe, it, expect } from 'vitest';
import { buildImagePrompt, hexToColorName, DEFAULT_THEME_COLOR } from './prompt.ts';

describe('buildImagePrompt', () => {
  const baseInput = {
    story: 'Add user authentication via OAuth2',
    scopeSummary: 'Implements login flow with Google provider',
  };

  it('uses default orange/gold when themeColor is omitted', () => {
    const prompt = buildImagePrompt(baseInput);
    expect(prompt).toContain('orange/gold');
  });

  it('includes custom themeColor when provided', () => {
    const prompt = buildImagePrompt({ ...baseInput, themeColor: 'crimson red' });
    expect(prompt).toContain('crimson red');
    expect(prompt).not.toContain('orange/gold');
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

describe('hexToColorName', () => {
  it('maps known hex to descriptive name', () => {
    expect(hexToColorName('#b8860b')).toBe('orange/gold');
    expect(hexToColorName('#326891')).toBe('blue');
    expect(hexToColorName('#0d9488')).toBe('teal');
    expect(hexToColorName('#b91c1c')).toBe('red');
    expect(hexToColorName('#7c3aed')).toBe('purple');
    expect(hexToColorName('#15803d')).toBe('green');
  });

  it('is case-insensitive', () => {
    expect(hexToColorName('#B8860B')).toBe('orange/gold');
  });

  it('returns hex fallback for unknown colors', () => {
    expect(hexToColorName('#ff00ff')).toBe('hex #ff00ff');
  });
});

describe('DEFAULT_THEME_COLOR', () => {
  it('is orange/gold', () => {
    expect(DEFAULT_THEME_COLOR).toBe('orange/gold');
  });
});
