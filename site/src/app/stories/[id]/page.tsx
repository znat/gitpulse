import { notFound } from 'next/navigation';
import Link from 'next/link';
import { loadStories, loadStory } from '@/lib/stories';

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
  const sourceLabel = story.kind === 'pr' ? `PR #${story.prNumber}` : `commit ${story.sha.slice(0, 7)}`;

  return (
    <main className="max-w-2xl mx-auto px-md py-2xl">
      <Link
        href="/"
        className="font-mono text-xs uppercase tracking-[0.15em] text-muted hover:text-accent"
      >
        ← gitpulse
      </Link>

      <article className="mt-xl">
        <p className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-feed-gold mb-md">
          {story.kind === 'pr' ? 'Merged pull request' : 'Direct push to main'}
        </p>
        <h1 className="headline mb-lg">{story.headline}</h1>
        <p className="standfirst mb-2xl">{story.standfirst}</p>

        <div className="text-foreground-secondary leading-relaxed whitespace-pre-line mb-2xl">
          {story.body}
        </div>

        <footer className="pt-lg border-t border-border-light font-mono text-xs text-muted">
          <p>
            by{' '}
            {story.authorUrl ? (
              <a href={story.authorUrl}>{story.author}</a>
            ) : (
              story.author
            )}{' '}
            on {dateFmt.format(new Date(story.committedAt))}
          </p>
          <p className="mt-xs">
            <a href={sourceUrl}>{sourceLabel} on GitHub →</a>
          </p>
        </footer>
      </article>
    </main>
  );
}
