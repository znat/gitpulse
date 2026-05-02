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

function storyBasePath(story: Story): string {
  return story.kind === 'pr'
    ? `/pull/${story.prNumber}`
    : `/commit/${story.sha}`;
}

export function storyPath(story: Story): string {
  const slug = storySlug(story.headline) || 'untitled';
  const base = storyBasePath(story);
  return `${base}/${slug}/`;
}

export function storyOgImagePath(story: Story): string {
  const slug = storySlug(story.headline) || 'untitled';
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
