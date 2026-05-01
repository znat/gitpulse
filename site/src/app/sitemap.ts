import type { MetadataRoute } from 'next';
import { canonicalUrl } from '@/lib/seo';
import { loadStories } from '@/lib/stories-loader';
import { storyPath } from '@/lib/urls';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const stories = loadStories();
  const newest = stories[0]?.committedAt;

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

  return entries;
}
