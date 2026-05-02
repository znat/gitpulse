import { slugify } from './utils/slugify';
import type { Story } from './stories';
import type { Release } from './releases';

/**
 * Centralized URL builders for gitpulse routes.
 * Paths mirror GitHub's URL structure: `/pull/<n>/<slug>/` and
 * `/commit/<sha>/<slug>/`. The slug is decorative for SEO.
 */

export function storySlug(headline: string): string {
  return slugify(headline);
}

/**
 * Slug segment used in story paths and route params. Falls back to
 * 'untitled' when the headline yields an empty slug so every URL has a
 * non-empty trailing segment (and `generateStaticParams` matches the path
 * `storyPath` produces).
 */
export function storyPathSlug(headline: string): string {
  return storySlug(headline) || 'untitled';
}

function storyBasePath(story: Story): string {
  return story.kind === 'pr'
    ? `/pull/${story.prNumber}`
    : `/commit/${story.sha}`;
}

export function storyPath(story: Story): string {
  const slug = storyPathSlug(story.headline);
  const base = storyBasePath(story);
  return `${base}/${slug}/`;
}

export function storyOgImagePath(story: Story): string {
  const slug = storyPathSlug(story.headline);
  const base = storyBasePath(story);
  return `${base}/${slug}/opengraph-image.png`;
}

// ── Releases ─────────────────────────────────────────────

export function releasesIndexPath(): string {
  return '/releases/';
}

export function releaseSlug(release: Release): string {
  // `||` (not `??`) so empty-string names fall back to the tag.
  return slugify(release.name || release.tag);
}

export function releasePath(release: Release): string {
  const slug = releaseSlug(release);
  const tagSegment = encodeURIComponent(release.tag);
  return slug
    ? `/releases/tag/${tagSegment}/${slug}/`
    : `/releases/tag/${tagSegment}/`;
}

export function releaseOgImagePath(release: Release): string {
  const slug = releaseSlug(release);
  const tagSegment = encodeURIComponent(release.tag);
  return slug
    ? `/releases/tag/${tagSegment}/${slug}/opengraph-image.png`
    : `/releases/tag/${tagSegment}/opengraph-image.png`;
}
