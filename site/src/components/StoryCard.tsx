import Link from 'next/link';
import {
  type Story,
  categoryDisplayName,
  primaryCategory,
  sizeLabel,
} from '@/lib/stories';

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
  return (
    <article className="border-b border-border-light pb-lg mb-lg">
      <div className="flex items-baseline gap-3 mb-sm font-mono text-[0.6875rem] uppercase tracking-[0.12em]">
        {cat && (
          <span className="text-feed-gold">{categoryDisplayName(cat.key)}</span>
        )}
        <span className="text-muted">{formatDate(story.committedAt)}</span>
        <span className="text-muted">
          {story.kind === 'pr' ? `PR #${story.prNumber}` : `commit ${story.sha.slice(0, 7)}`}
        </span>
        <span
          className="ml-auto px-2 py-0.5 rounded-sm border border-border-light text-muted"
          title={story.sizeReasoning}
        >
          {sizeLabel(story.sizeAssessment)}
        </span>
      </div>
      <h2 className="headline mb-sm">
        <Link
          href={`/stories/${story.id}/`}
          className="!text-foreground hover:!text-accent"
        >
          {story.headline}
        </Link>
      </h2>
      <p className="text-foreground-secondary mb-sm leading-relaxed">{story.standfirst}</p>
      <p className="font-mono text-xs text-muted">
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
