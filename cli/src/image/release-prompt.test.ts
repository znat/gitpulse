import { describe, it, expect } from 'vitest';
import { buildReleaseImagePrompt } from './release-prompt.ts';

const baseInput = {
  quip: 'Pages now stay where you put them.',
  releaseStory: 'A release about widgets and pinning.',
  topStories: [
    {
      headline: 'Widgets can be pinned to any corner',
      standfirst: 'Users can choose any of four screen corners.',
      story: 'The full story body.',
      technicalDescription: 'A positionSchema enforces one vertical and one horizontal edge.',
    },
  ],
  releaseNotes: 'GitHub release notes body, summarising the PRs.',
  themeColor: '#b8860b',
};

describe('buildReleaseImagePrompt', () => {
  it('substitutes the themeColor placeholder once', () => {
    const prompt = buildReleaseImagePrompt({ ...baseInput, themeColor: '#326891' });
    expect(prompt).toContain('Accent color #326891');
    expect(prompt).not.toContain('{themeColor}');
  });

  it('renders top stories with headline, standfirst, story, and technical fields', () => {
    const prompt = buildReleaseImagePrompt(baseInput);
    expect(prompt).toContain('1. Widgets can be pinned to any corner');
    expect(prompt).toContain('Users can choose any of four screen corners.');
    expect(prompt).toContain('Story: The full story body.');
    expect(prompt).toContain('Technical: A positionSchema enforces one vertical and one horizontal edge.');
  });

  it('shows "(none)" when topStories is empty', () => {
    const prompt = buildReleaseImagePrompt({ ...baseInput, topStories: [] });
    expect(prompt).toMatch(/Top Stories in This Release\n\(none\)/);
  });

  it('falls back to "(not available)" when releaseNotes is null', () => {
    const prompt = buildReleaseImagePrompt({ ...baseInput, releaseNotes: null });
    expect(prompt).toMatch(/Raw Release Notes \(for grounding\)\n\(not available\)/);
  });

  it('truncates releaseNotes to 1500 chars', () => {
    const long = 'x'.repeat(2000);
    const prompt = buildReleaseImagePrompt({ ...baseInput, releaseNotes: long });
    // Original 2000 'x' minus what got truncated; check exactly 1500 contiguous x's appear.
    expect(prompt).toContain('x'.repeat(1500));
    expect(prompt).not.toContain('x'.repeat(1501));
  });

  it('falls back to "(not available)" when releaseStory is null', () => {
    const prompt = buildReleaseImagePrompt({ ...baseInput, releaseStory: null });
    expect(prompt).toMatch(/The Story \(what this release means\)\n\(not available\)/);
  });
});
