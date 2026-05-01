import Link from 'next/link';
import type { Story } from '@/lib/stories';

const dateFmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

function formatDate(iso: string): string {
  return dateFmt.format(new Date(iso));
}

function kindLabel(kind: Story['kind']): string {
  return kind === 'pr' ? 'merged' : 'direct push';
}

export function StoryCard({ story }: { story: Story }) {
  return (
    <article className="border-b border-border-light pb-lg mb-lg">
      <div className="flex items-baseline gap-3 mb-sm">
        <span className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-feed-gold">
          {kindLabel(story.kind)}
        </span>
        <span className="font-mono text-xs text-muted">
          {formatDate(story.committedAt)}
        </span>
      </div>
      <h2 className="headline mb-sm">
        <Link href={`/stories/${story.id}/`} className="!text-foreground hover:!text-accent">
          {story.headline}
        </Link>
      </h2>
      <p className="text-foreground-secondary mb-sm leading-relaxed">{story.standfirst}</p>
      <p className="font-mono text-xs text-muted">
        by{' '}
        {story.authorUrl ? (
          <a href={story.authorUrl} className="text-muted">
            {story.author}
          </a>
        ) : (
          story.author
        )}
      </p>
    </article>
  );
}
