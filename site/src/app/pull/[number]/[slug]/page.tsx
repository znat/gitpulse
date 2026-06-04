import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { loadStories, loadStoryByPrNumber } from '@/lib/stories-loader';
import { buildStoryMetadata, canonicalUrl } from '@/lib/seo';
import { JsonLd, buildStoryJsonLd } from '@/lib/json-ld';
import { storyPathSlug, storyPath, storyOgImagePath } from '@/lib/urls';
import { PRArticle } from '@/components/PRArticle';

interface RouteParams {
  number: string;
  slug: string;
}

// Sentinel matching the OG route's stub, rendered as notFound below. Next's
// `output: 'export'` rejects an empty params list, so a publication with no
// PR stories (e.g. a commit-only repo) needs at least one stub param.
const EMPTY_STUB_NUMBER = '__no_stories_yet__';
const EMPTY_STUB_SLUG = 'placeholder';

export function generateStaticParams(): RouteParams[] {
  const params = loadStories()
    .filter((s) => s.kind === 'pr' && typeof s.prNumber === 'number')
    .map((s) => ({
      number: String(s.prNumber),
      slug: storyPathSlug(s.headline),
    }));
  return params.length > 0
    ? params
    : [{ number: EMPTY_STUB_NUMBER, slug: EMPTY_STUB_SLUG }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { number } = await params;
  const story = loadStoryByPrNumber(Number(number));
  if (!story) return { title: 'Not found · Gitpulse' };
  return buildStoryMetadata(story);
}

export default async function PullStoryPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { number, slug } = await params;
  const story = loadStoryByPrNumber(Number(number));
  if (!story) notFound();
  if (slug !== storyPathSlug(story.headline)) notFound();

  const url = canonicalUrl(storyPath(story));
  const ogImageUrl = canonicalUrl(storyOgImagePath(story));
  const jsonLd = buildStoryJsonLd({
    story,
    canonicalUrl: url,
    imageUrl: ogImageUrl,
  });

  return (
    <main className="max-w-2xl mx-auto px-md py-2xl">
      <JsonLd data={jsonLd} />
      <Link
        href="/"
        className="font-feed-mono text-xs uppercase tracking-[0.15em] text-muted hover:text-accent no-underline"
      >
        ← gitpulse
      </Link>
      <PRArticle story={story} variant="page" />
    </main>
  );
}
