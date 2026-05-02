import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { loadStories, loadStoryByPrNumber } from '@/lib/stories-loader';
import { buildStoryMetadata, canonicalUrl } from '@/lib/seo';
import { JsonLd, buildStoryJsonLd } from '@/lib/json-ld';
import { storyPathSlug, storyPath, storyOgImagePath } from '@/lib/urls';
import { PRMetaRow } from '@/components/PRMetaRow';
import { PRSubtitle, PRMobileReference } from '@/components/PRSubtitle';
import { PRStoryBody } from '@/components/PRStoryBody';

interface RouteParams {
  number: string;
  slug: string;
}

export function generateStaticParams(): RouteParams[] {
  return loadStories()
    .filter((s) => s.kind === 'pr' && typeof s.prNumber === 'number')
    .map((s) => ({
      number: String(s.prNumber),
      slug: storyPathSlug(s.headline),
    }));
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

      <article className="mt-xl">
        <PRMetaRow
          sizeAssessment={story.sizeAssessment}
          categories={story.categories}
        />
        <PRMobileReference
          prNumber={story.prNumber}
          prTitle={story.prTitle}
          prUrl={story.prUrl}
        />
        <h1 className="headline mb-4">{story.headline}</h1>
        <PRSubtitle
          author={story.author}
          authorUrl={story.authorUrl}
          mergedAt={story.mergedAt ?? story.committedAt}
          prNumber={story.prNumber}
          prTitle={story.prTitle}
          prUrl={story.prUrl}
        />
        <p className="standfirst font-feed-body mb-10">{story.standfirst}</p>
        <PRStoryBody
          story={story.story}
          technicalDescription={story.technicalDescription || undefined}
        />
      </article>
    </main>
  );
}
