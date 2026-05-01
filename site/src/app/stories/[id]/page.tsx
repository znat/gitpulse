import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  loadStories,
  loadStory,
  primaryCategory,
  categoryDisplayName,
} from '@/lib/stories';

export function generateStaticParams() {
  return loadStories().map((s) => ({ id: s.id }));
}

const dateFmt = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});

export default async function StoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const story = loadStory(id);
  if (!story) notFound();

  const sourceUrl = story.kind === 'pr' ? story.prUrl : story.commitUrl;
  const sourceLabel =
    story.kind === 'pr' ? `PR #${story.prNumber}` : `commit ${story.sha.slice(0, 7)}`;
  const cat = primaryCategory(story);

  return (
    <main className="max-w-2xl mx-auto px-md py-2xl">
      <Link
        href="/"
        className="font-mono text-xs uppercase tracking-[0.15em] text-muted hover:text-accent"
      >
        ← gitpulse
      </Link>

      <article className="mt-xl">
        <div className="flex items-baseline gap-3 mb-md font-mono text-[0.6875rem] uppercase tracking-[0.12em]">
          {cat && <span className="text-feed-gold">{categoryDisplayName(cat.key)}</span>}
          <span className="text-muted">
            {story.kind === 'pr' ? 'Merged pull request' : 'Direct push to main'}
          </span>
        </div>

        <h1 className="headline mb-lg">{story.headline}</h1>
        <p className="standfirst mb-2xl">{story.standfirst}</p>

        <div className="prose-section text-foreground-secondary leading-relaxed whitespace-pre-line mb-2xl">
          {story.story}
        </div>

        {story.technicalDescription && (
          <details className="mb-2xl border-l-2 border-border-medium pl-md">
            <summary className="font-mono text-xs uppercase tracking-[0.12em] text-muted cursor-pointer mb-md">
              Technical description
            </summary>
            <div className="text-foreground-secondary leading-relaxed whitespace-pre-line text-sm mt-md">
              {story.technicalDescription}
            </div>
          </details>
        )}

        {story.categories.length > 1 && (
          <div className="mb-2xl">
            <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted mb-sm">
              Categories
            </p>
            <ul className="text-sm">
              {story.categories.map((c) => (
                <li key={c.key} className="text-foreground-secondary">
                  <span className="font-mono text-feed-gold">{categoryDisplayName(c.key)}</span>{' '}
                  <span className="text-muted">({c.score}%)</span> — {c.reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        <footer className="pt-lg border-t border-border-light font-mono text-xs text-muted">
          <p>
            by{' '}
            {story.authorUrl ? <a href={story.authorUrl}>{story.author}</a> : story.author}{' '}
            on {dateFmt.format(new Date(story.committedAt))}
          </p>
          {sourceUrl && (
            <p className="mt-xs">
              <a href={sourceUrl}>{sourceLabel} on GitHub →</a>
            </p>
          )}
        </footer>
      </article>
    </main>
  );
}
