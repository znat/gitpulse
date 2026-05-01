import { slugify } from './utils/slugify';
import type { Story } from './stories';

/**
 * Centralized URL builders for gitpulse routes.
 * Mirrors gitsky's lib/urls.ts pattern — keyword-rich slugs in the path.
 */

export function storySlug(headline: string): string {
  return slugify(headline);
}

/**
 * Canonical story path: `/stories/<id>/<slug>/`.
 * The id stays opaque (manifest key); the slug is decorative for SEO.
 */
export function storyPath(story: Story): string {
  const slug = storySlug(story.headline);
  return slug ? `/stories/${story.id}/${slug}/` : `/stories/${story.id}/`;
}

export function storyOgImagePath(story: Story): string {
  const slug = storySlug(story.headline);
  return slug
    ? `/stories/${story.id}/${slug}/opengraph-image.png`
    : `/stories/${story.id}/opengraph-image.png`;
}
