import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { primaryCategory, categoryDisplayName } from '@/lib/stories';
import { loadStories, loadStoryBySha } from '@/lib/stories-loader';
import { buildStoryMetadata, canonicalUrl } from '@/lib/seo';
import { JsonLd, buildStoryJsonLd } from '@/lib/json-ld';
import { storySlug, storyPath, storyOgImagePath } from '@/lib/urls';
import { SizeBars } from '@/components/SizeBars';

interface RouteParams {
  sha: string;
  slug: string;
}

export function generateStaticParams(): RouteParams[] {
  return loadStories()
    .filter((s) => s.kind === 'direct-push')
    .map((s) => ({ sha: s.sha, slug: storySlug(s.headline) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { sha } = await params;
  const story = loadStoryBySha(sha);
  if (!story) return { title: 'Not found · Gitpulse' };
  return buildStoryMetadata(story);
}

const dateFmt = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});

export default async function CommitStoryPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { sha, slug } = await params;
  const story = loadStoryBySha(sha);
  if (!story) notFound();
  if (slug !== storySlug(story.headline)) notFound();

  const sourceUrl = story.commitUrl;
  const sourceLabel = `commit ${story.sha.slice(0, 7)}`;
  const cat = primaryCategory(story);
  const dateLabel = `Pushed ${dateFmt.format(new Date(story.committedAt))}`;

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
        <div className="mb-md flex items-center gap-2 font-feed-mono text-[0.6875rem] tracking-wide">
          {cat && (
            <>
              <span className="font-semibold uppercase text-feed-gold">
                {categoryDisplayName(cat.key)}
              </span>
              <span className="text-muted">·</span>
            </>
          )}
          <span className="text-muted">{dateLabel}</span>
          <span className="text-muted">·</span>
          <SizeBars size={story.sizeAssessment} />
        </div>

        <h1 className="font-feed-display text-4xl md:text-5xl mb-lg leading-tight">
          {story.headline}
        </h1>
        <p className="font-feed-body standfirst mb-2xl">{story.standfirst}</p>

        <div className="font-feed-body text-foreground-secondary leading-relaxed whitespace-pre-line mb-2xl">
          {story.story}
        </div>

        {story.technicalDescription && (
          <details className="mb-2xl border-l-2 border-border-medium pl-md">
            <summary className="font-feed-mono text-xs uppercase tracking-[0.12em] text-muted cursor-pointer mb-md">
              Technical description
            </summary>
            <div className="font-feed-body text-foreground-secondary leading-relaxed whitespace-pre-line text-sm mt-md">
              {story.technicalDescription}
            </div>
          </details>
        )}

        {story.categories.length > 1 && (
          <div className="mb-2xl">
            <p className="font-feed-mono text-xs uppercase tracking-[0.12em] text-muted mb-sm">
              Categories
            </p>
            <ul className="text-sm font-feed-body">
              {story.categories.map((c) => (
                <li key={c.key} className="text-foreground-secondary">
                  <span className="font-feed-mono text-feed-gold uppercase">
                    {categoryDisplayName(c.key)}
                  </span>{' '}
                  <span className="text-muted">({c.score}%)</span> — {c.reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        <footer className="pt-lg border-t border-border-light font-feed-mono text-xs text-muted">
          <p>
            by @{story.author} on {dateFmt.format(new Date(story.committedAt))}
          </p>
          {sourceUrl && (
            <p className="mt-xs">
              <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
                {sourceLabel} on GitHub →
              </a>
            </p>
          )}
        </footer>
      </article>
    </main>
  );
}
