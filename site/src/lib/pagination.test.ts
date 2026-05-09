import { describe, expect, it } from 'vitest';
import {
  feedPagePath,
  mergedSortedDates,
  paginateFeed,
  paginateReleases,
  releasesPagePath,
} from './pagination';
import type { StoryDay } from './stories';
import type { ReleasesByDay } from './releases';

function day(date: string): StoryDay {
  return { date, dateLabel: date, features: [], bugfixes: [], housekeeping: [] };
}

describe('mergedSortedDates', () => {
  it('merges story dates and release dates, sorted desc', () => {
    const days: StoryDay[] = [day('2026-05-01'), day('2026-05-03')];
    const releases: ReleasesByDay = {
      '2026-05-02': [],
      '2026-05-03': [],
    };
    expect(mergedSortedDates(days, releases)).toEqual([
      '2026-05-03',
      '2026-05-02',
      '2026-05-01',
    ]);
  });
});

describe('paginateFeed', () => {
  const days: StoryDay[] = [
    day('2026-05-05'),
    day('2026-05-04'),
    day('2026-05-03'),
    day('2026-05-02'),
    day('2026-05-01'),
  ];

  it('slices first page by daysPerPage, sorted desc', () => {
    const r = paginateFeed(days, {}, 2, 1);
    expect(r.page).toBe(1);
    expect(r.totalPages).toBe(3);
    expect(r.days.map((d) => d.date)).toEqual(['2026-05-05', '2026-05-04']);
  });

  it('returns the right slice for middle pages', () => {
    const r = paginateFeed(days, {}, 2, 2);
    expect(r.page).toBe(2);
    expect(r.days.map((d) => d.date)).toEqual(['2026-05-03', '2026-05-02']);
  });

  it('handles a partial last page', () => {
    const r = paginateFeed(days, {}, 2, 3);
    expect(r.page).toBe(3);
    expect(r.days.map((d) => d.date)).toEqual(['2026-05-01']);
  });

  it('clamps page to totalPages', () => {
    const r = paginateFeed(days, {}, 2, 99);
    expect(r.page).toBe(3);
  });

  it('clamps page to 1 when below', () => {
    const r = paginateFeed(days, {}, 2, 0);
    expect(r.page).toBe(1);
  });

  it('filters releasesByDay to the page slice', () => {
    const releases: ReleasesByDay = {
      '2026-05-05': [],
      '2026-05-03': [],
      '2026-05-01': [],
    };
    const r = paginateFeed(days, releases, 2, 2);
    expect(Object.keys(r.releasesByDay)).toEqual(['2026-05-03']);
  });

  it('treats an empty feed as a single empty page', () => {
    const r = paginateFeed([], {}, 2, 1);
    expect(r.totalPages).toBe(1);
    expect(r.days).toEqual([]);
  });
});

describe('feedPagePath', () => {
  it('routes page 1 to /', () => {
    expect(feedPagePath(1)).toBe('/');
  });
  it('routes page 2+ to /page/N/', () => {
    expect(feedPagePath(2)).toBe('/page/2/');
    expect(feedPagePath(7)).toBe('/page/7/');
  });
});

describe('paginateReleases', () => {
  const items = Array.from({ length: 10 }, (_, i) => ({ tag: `v0.${i}.0` }));

  it('returns a single empty page for an empty input', () => {
    const r = paginateReleases([], 10, 1);
    expect(r.totalPages).toBe(1);
    expect(r.releases).toEqual([]);
    expect(r.page).toBe(1);
  });

  it('slices the first page by perPage', () => {
    const r = paginateReleases(items, 3, 1);
    expect(r.totalPages).toBe(4);
    expect(r.releases.map((x) => x.tag)).toEqual([
      'v0.0.0',
      'v0.1.0',
      'v0.2.0',
    ]);
  });

  it('returns the right slice for middle pages', () => {
    const r = paginateReleases(items, 3, 2);
    expect(r.page).toBe(2);
    expect(r.releases.map((x) => x.tag)).toEqual([
      'v0.3.0',
      'v0.4.0',
      'v0.5.0',
    ]);
  });

  it('handles a partial last page', () => {
    const r = paginateReleases(items, 3, 4);
    expect(r.releases.map((x) => x.tag)).toEqual(['v0.9.0']);
  });

  it('clamps page to totalPages', () => {
    const r = paginateReleases(items, 3, 99);
    expect(r.page).toBe(4);
  });

  it('clamps page to 1 when below', () => {
    const r = paginateReleases(items, 3, 0);
    expect(r.page).toBe(1);
  });

  it('handles perPage of 1', () => {
    const r = paginateReleases(items, 1, 5);
    expect(r.totalPages).toBe(10);
    expect(r.releases.map((x) => x.tag)).toEqual(['v0.4.0']);
  });

  it('falls back to page size 1 when perPage is invalid', () => {
    const r = paginateReleases(items, 0, 1);
    expect(r.totalPages).toBe(10);
    expect(r.releases.map((x) => x.tag)).toEqual(['v0.0.0']);
  });
});

describe('releasesPagePath', () => {
  it('routes page 1 to /releases/', () => {
    expect(releasesPagePath(1)).toBe('/releases/');
  });
  it('routes page 2+ to /releases/page/N/', () => {
    expect(releasesPagePath(2)).toBe('/releases/page/2/');
    expect(releasesPagePath(7)).toBe('/releases/page/7/');
  });
  it('treats 0 and negatives as page 1', () => {
    expect(releasesPagePath(0)).toBe('/releases/');
    expect(releasesPagePath(-3)).toBe('/releases/');
  });
});
