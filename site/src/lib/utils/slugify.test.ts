import { describe, it, expect } from 'vitest';
import { slugify } from './slugify';

describe('slugify', () => {
  it('lowercases and hyphenates simple text', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('collapses runs of non-alphanumeric characters', () => {
    expect(slugify('foo!!!  bar___baz')).toBe('foo-bar-baz');
  });

  it('trims leading and trailing hyphens', () => {
    expect(slugify('---hello---')).toBe('hello');
  });

  it('strips unicode (lossy by design)', () => {
    expect(slugify('café & naïve')).toBe('caf-na-ve');
  });

  it('returns empty string for input that produces no alphanumerics', () => {
    expect(slugify('!!! --- ???')).toBe('');
  });

  it('truncates at the last hyphen before the limit', () => {
    const result = slugify('the quick brown fox jumps over the lazy dog', 20);
    expect(result.length).toBeLessThanOrEqual(20);
    expect(result.endsWith('-')).toBe(false);
    expect(result).toBe('the-quick-brown-fox');
  });

  it('hard-truncates when no hyphen exists before the limit', () => {
    const result = slugify('antidisestablishmentarianism', 10);
    expect(result).toBe('antidisest');
  });

  it('uses the default limit of 80 characters', () => {
    const long = 'a'.repeat(100);
    expect(slugify(long).length).toBeLessThanOrEqual(80);
  });
});
