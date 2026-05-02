// Pure types + helpers for releases. Mirrors lib/stories.ts. Safe to
// import from client components.

export interface ReleaseTopStory {
  storyId: string;
  prNumber: number;
  headline: string;
  standfirst: string;
  authorLogin: string;
  primaryCategoryKey: string;
  additions: number;
  deletions: number;
}

export interface Release {
  schemaVersion: number;
  tag: string;
  name: string | null;
  publishedAt: string;
  authorLogin: string;
  authorUrl?: string;
  isPrerelease: boolean;
  releaseUrl: string;
  previousTag: string | null;
  quip: string;
  releaseStory: string;
  prCount: number;
  contributorCount: number;
  totalAdditions: number;
  totalDeletions: number;
  topStories: ReleaseTopStory[];
  changelogStoryIds: string[];
  inputsHash: string;
}

export interface ReleaseManifestEntry {
  tag: string;
  slug: string;
  publishedAt: string;
  isPrerelease: boolean;
}

export interface ReleaseManifest {
  schemaVersion: number;
  generatedAt: string;
  entries: ReleaseManifestEntry[];
}

// Pin to UTC so the formatted date matches the ISO publishedAt regardless
// of the host timezone — without this, dates near midnight UTC can shift
// by a day on the build machine.
const RELEASES_DATE_FMT = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC',
});

export function formatReleaseDate(iso: string): string {
  return RELEASES_DATE_FMT.format(new Date(iso));
}

export function formatLines(total: number): string {
  if (total >= 1000) return `${(total / 1000).toFixed(1)}k`;
  return String(total);
}

export interface ReleasesByDay {
  [dateISO: string]: Release[];
}

export function groupReleasesByDay(releases: Release[]): ReleasesByDay {
  const out: ReleasesByDay = {};
  for (const r of releases) {
    const date = r.publishedAt.slice(0, 10);
    (out[date] ||= []).push(r);
  }
  return out;
}
