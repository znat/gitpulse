import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getBaseUrl, canonicalUrl, truncateDescription } from './seo';

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  delete process.env.GITPULSE_SITE_URL;
  delete process.env.GITHUB_REPOSITORY;
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe('getBaseUrl', () => {
  it('prefers GITPULSE_SITE_URL when set', () => {
    process.env.GITPULSE_SITE_URL = 'https://example.com/';
    expect(getBaseUrl()).toBe('https://example.com');
  });

  it('strips trailing slash from GITPULSE_SITE_URL', () => {
    process.env.GITPULSE_SITE_URL = 'https://example.com////';
    expect(getBaseUrl()).toBe('https://example.com///');
  });

  it('derives github.io URL from GITHUB_REPOSITORY when override is absent', () => {
    process.env.GITHUB_REPOSITORY = 'znat/gitpulse';
    expect(getBaseUrl()).toBe('https://znat.github.io/gitpulse');
  });

  it('returns empty string when neither env var is set', () => {
    expect(getBaseUrl()).toBe('');
  });

  it('returns empty string for malformed GITHUB_REPOSITORY', () => {
    process.env.GITHUB_REPOSITORY = 'not-a-slash-separated-thing';
    expect(getBaseUrl()).toBe('');
  });
});

describe('canonicalUrl', () => {
  it('joins base URL and path', () => {
    process.env.GITHUB_REPOSITORY = 'znat/gitpulse';
    expect(canonicalUrl('/stories/pr-1/foo/')).toBe(
      'https://znat.github.io/gitpulse/stories/pr-1/foo/',
    );
  });

  it('prepends a leading slash if missing', () => {
    process.env.GITHUB_REPOSITORY = 'znat/gitpulse';
    expect(canonicalUrl('robots.txt')).toBe(
      'https://znat.github.io/gitpulse/robots.txt',
    );
  });

  it('returns just the path when no base URL is configured', () => {
    expect(canonicalUrl('/foo')).toBe('/foo');
  });
});

describe('truncateDescription', () => {
  it('returns the input unchanged when shorter than the limit', () => {
    expect(truncateDescription('short text')).toBe('short text');
  });

  it('returns empty string for null/undefined input', () => {
    expect(truncateDescription(null)).toBe('');
    expect(truncateDescription(undefined)).toBe('');
  });

  it('truncates at the last word boundary and adds an ellipsis', () => {
    const result = truncateDescription('one two three four five six', 15);
    expect(result.endsWith('…')).toBe(true);
    expect(result.length).toBeLessThanOrEqual(15 + 1);
    expect(result).toBe('one two three…');
  });

  it('honours custom maxLen', () => {
    const result = truncateDescription('alpha beta gamma delta', 12);
    expect(result.length).toBeLessThanOrEqual(13);
  });
});
