/**
 * JSON-LD structured data builders + injection component.
 */

import { getBaseUrl } from './seo';
import type { Story } from './stories';
import { primaryCategory } from './stories';
import type { RepoInfo } from './repo';
import { publicationName, publicationSubtitle } from './repo';

const SITE_NAME = 'Gitpulse';
const PUBLISHER_BASE = {
  '@type': 'Organization' as const,
  name: SITE_NAME,
};

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  );
}

// WebSite schema, mounted in the root layout.
export function buildWebSiteJsonLd(repo: RepoInfo) {
  const baseUrl = getBaseUrl();
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: publicationName(repo),
    url: baseUrl || '/',
    description: publicationSubtitle(repo),
    publisher: { ...PUBLISHER_BASE, url: baseUrl || '/' },
  };
}

// NewsArticle schema for individual stories (PRs and direct pushes).
export function buildStoryJsonLd(opts: {
  story: Story;
  canonicalUrl: string;
  imageUrl?: string;
}) {
  const { story, canonicalUrl, imageUrl } = opts;
  const baseUrl = getBaseUrl();
  const datePublished = story.mergedAt ?? story.committedAt;
  const cat = primaryCategory(story);
  const wordCount = story.story.split(/\s+/).filter(Boolean).length;

  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: story.headline,
    description: story.standfirst || '',
    ...(imageUrl ? { image: imageUrl } : {}),
    datePublished,
    dateModified: datePublished,
    author: {
      '@type': 'Person',
      name: story.author,
      ...(story.authorUrl ? { url: story.authorUrl } : {}),
    },
    publisher: { ...PUBLISHER_BASE, url: baseUrl || '/' },
    mainEntityOfPage: canonicalUrl,
    ...(cat ? { articleSection: cat.key } : {}),
    wordCount,
  };
}
