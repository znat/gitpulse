import Link from 'next/link';
import {
  type Story,
  categoryDisplayName,
  primaryCategory,
} from '@/lib/stories';
import { SizeBars } from '@/components/SizeBars';

const dateFmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

function formatDate(iso: string): string {
  return dateFmt.format(new Date(iso));
}

export function StoryCard({ story }: { story: Story }) {
  const cat = primaryCategory(story);
  const dateLabel =
    story.kind === 'pr'
      ? `Merged ${formatDate(story.mergedAt ?? story.committedAt)}`
      : `Pushed ${formatDate(story.committedAt)}`;

  return (
    <article className="border-b border-border-light pb-lg mb-lg">
      <div className="mb-2 flex items-center gap-2 font-feed-mono text-[0.6875rem] tracking-wide">
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

      <h2 className="font-feed-display text-2xl md:text-3xl mb-sm leading-tight">
        <Link
          href={`/stories/${story.id}/`}
          className="!text-foreground hover:!text-accent no-underline"
        >
          {story.headline}
        </Link>
      </h2>

      <p className="font-feed-body text-foreground-secondary mb-sm leading-relaxed">
        {story.standfirst}
      </p>

      <p className="font-feed-mono text-xs text-muted">
        by{' '}
        {story.authorUrl ? (
          <a
            href={story.authorUrl}
            className="text-muted"
            target="_blank"
            rel="noopener noreferrer"
          >
            {story.author}
          </a>
        ) : (
          story.author
        )}
      </p>
    </article>
  );
}
