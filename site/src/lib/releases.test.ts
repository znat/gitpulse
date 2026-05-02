import { describe, it, expect } from 'vitest';
import {
  formatLines,
  formatReleaseDate,
  groupReleasesByDay,
  type Release,
} from './releases';

function makeRelease(overrides: Partial<Release> = {}): Release {
  return {
    schemaVersion: 1,
    tag: 'v1.0.0',
    name: null,
    publishedAt: '2026-05-02T12:00:00Z',
    authorLogin: 'octocat',
    isPrerelease: false,
    releaseUrl: '',
    previousTag: null,
    quip: '',
    releaseStory: '',
    prCount: 0,
    contributorCount: 0,
    totalAdditions: 0,
    totalDeletions: 0,
    topStories: [],
    changelogStoryIds: [],
    inputsHash: 'h',
    ...overrides,
  };
}

describe('formatLines', () => {
  it('returns the raw number under 1000', () => {
    expect(formatLines(50)).toBe('50');
    expect(formatLines(999)).toBe('999');
  });

  it('formats thousands with one decimal', () => {
    expect(formatLines(1500)).toBe('1.5k');
    expect(formatLines(12345)).toBe('12.3k');
  });

  it('returns 0 for zero', () => {
    expect(formatLines(0)).toBe('0');
  });
});

describe('formatReleaseDate', () => {
  it('formats an ISO date as "Month Day, Year"', () => {
    expect(formatReleaseDate('2026-05-02T12:00:00Z')).toBe('May 2, 2026');
  });

  it('uses UTC at the day boundary (no host-tz date shift)', () => {
    // Without timeZone: 'UTC', this would render as May 1 in any
    // host TZ west of GMT — pinning the formatter to UTC keeps the
    // displayed date consistent with publishedAt.
    expect(formatReleaseDate('2026-05-02T00:00:00Z')).toBe('May 2, 2026');
    expect(formatReleaseDate('2026-05-02T23:59:59Z')).toBe('May 2, 2026');
  });
});

describe('groupReleasesByDay', () => {
  it('groups releases by their publishedAt date', () => {
    const a = makeRelease({ tag: 'v1.0.0', publishedAt: '2026-05-02T01:00:00Z' });
    const b = makeRelease({ tag: 'v1.1.0', publishedAt: '2026-05-02T20:00:00Z' });
    const c = makeRelease({ tag: 'v0.9.0', publishedAt: '2026-04-30T12:00:00Z' });
    const grouped = groupReleasesByDay([a, b, c]);
    expect(Object.keys(grouped).sort()).toEqual(['2026-04-30', '2026-05-02']);
    expect(grouped['2026-05-02']!.map((r) => r.tag)).toEqual(['v1.0.0', 'v1.1.0']);
    expect(grouped['2026-04-30']!.map((r) => r.tag)).toEqual(['v0.9.0']);
  });

  it('returns an empty object for an empty input', () => {
    expect(groupReleasesByDay([])).toEqual({});
  });
});
