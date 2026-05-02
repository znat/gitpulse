import type { MetadataRoute } from 'next';
import { canonicalUrl } from '@/lib/seo';
import { loadStories } from '@/lib/stories-loader';
import { loadReleases } from '@/lib/releases-loader';
import { storyPath, releasePath, releasesIndexPath } from '@/lib/urls';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const stories = loadStories();
  const releases = loadReleases();
  const newestStory = stories[0]?.committedAt;
  const newestRelease = releases[0]?.publishedAt;
  const newest =
    newestStory && newestRelease
      ? newestStory.localeCompare(newestRelease) > 0
        ? newestStory
        : newestRelease
      : (newestStory ?? newestRelease);

  const entries: MetadataRoute.Sitemap = [
    {
      url: canonicalUrl('/'),
      ...(newest ? { lastModified: new Date(newest) } : {}),
      changeFrequency: 'daily',
      priority: 1,
    },
  ];

  for (const story of stories) {
    entries.push({
      url: canonicalUrl(storyPath(story)),
      lastModified: new Date(story.mergedAt ?? story.committedAt),
      changeFrequency: 'monthly',
      priority: 0.8,
    });
  }

  // The /releases/ index page exists regardless of whether releases have
  // been published yet — keep it in the sitemap so crawlers can discover it.
  entries.push({
    url: canonicalUrl(releasesIndexPath()),
    ...(newestRelease ? { lastModified: new Date(newestRelease) } : {}),
    changeFrequency: 'weekly',
    priority: 0.9,
  });
  for (const release of releases) {
    entries.push({
      url: canonicalUrl(releasePath(release)),
      lastModified: new Date(release.publishedAt),
      changeFrequency: 'monthly',
      priority: 0.85,
    });
  }

  return entries;
}
