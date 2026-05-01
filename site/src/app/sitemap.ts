import type { MetadataRoute } from 'next';
import { canonicalUrl } from '@/lib/seo';
import { loadStories } from '@/lib/stories-loader';

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
      url: canonicalUrl(`/stories/${story.id}/`),
      lastModified: new Date(story.mergedAt ?? story.committedAt),
      changeFrequency: 'monthly',
      priority: 0.8,
    });
  }

  return entries;
}
