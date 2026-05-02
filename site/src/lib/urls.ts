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
  if (story.kind === 'pr') {
    if (typeof story.prNumber !== 'number' || !Number.isFinite(story.prNumber)) {
      throw new Error(`Story ${story.id} is kind='pr' but missing prNumber`);
    }
    return `/pull/${story.prNumber}`;
  }
  if (!story.sha) {
    throw new Error(`Story ${story.id} is missing sha`);
  }
  return `/commit/${story.sha}`;
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

export function releasePath(release: Release): string {
  return `/releases/${encodeURIComponent(release.tag)}/`;
}

export function releaseOgImagePath(release: Release): string {
  return `/releases/${encodeURIComponent(release.tag)}/opengraph-image.png`;
}
