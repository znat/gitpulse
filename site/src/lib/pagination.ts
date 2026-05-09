import type { StoryDay } from './stories';
import type { ReleasesByDay } from './releases';

export interface FeedPage {
  page: number;
  totalPages: number;
  days: StoryDay[];
  releasesByDay: ReleasesByDay;
}

export function mergedSortedDates(
  days: StoryDay[],
  releasesByDay: ReleasesByDay,
): string[] {
  const all = new Set<string>([
    ...days.map((d) => d.date),
    ...Object.keys(releasesByDay),
  ]);
  return Array.from(all).sort((a, b) => b.localeCompare(a));
}

export function paginateFeed(
  days: StoryDay[],
  releasesByDay: ReleasesByDay,
  daysPerPage: number,
  page: number,
): FeedPage {
  const pageSize =
    Number.isInteger(daysPerPage) && daysPerPage > 0 ? daysPerPage : 1;
  const dates = mergedSortedDates(days, releasesByDay);
  const totalPages = Math.max(1, Math.ceil(dates.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  const pageDates = new Set(dates.slice(start, start + pageSize));
  return {
    page: safePage,
    totalPages,
    days: days.filter((d) => pageDates.has(d.date)),
    releasesByDay: Object.fromEntries(
      Object.entries(releasesByDay).filter(([d]) => pageDates.has(d)),
    ),
  };
}

export function feedPagePath(n: number): string {
  return n <= 1 ? '/' : `/page/${n}/`;
}

export interface ReleasesPage<T> {
  page: number;
  totalPages: number;
  releases: T[];
}

export function paginateReleases<T>(
  releases: T[],
  perPage: number,
  page: number,
): ReleasesPage<T> {
  const pageSize =
    Number.isInteger(perPage) && perPage > 0 ? perPage : 1;
  const totalPages = Math.max(1, Math.ceil(releases.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    page: safePage,
    totalPages,
    releases: releases.slice(start, start + pageSize),
  };
}

export function releasesPagePath(n: number): string {
  return n <= 1 ? '/releases/' : `/releases/page/${n}/`;
}
