/**
 * Editorial-style PR/commit card. Hero, standard, and compact variants.
 * v1 is text-only — no image variant.
 */

import Link from 'next/link';
import {
  type Story,
  type SizeAssessment,
  primaryCategory,
  categoryDisplayName,
  sizeLabel,
} from '@/lib/stories';
import { SizeBars } from '@/components/SizeBars';

export type PRFeedItemVariant = 'hero' | 'standard' | 'compact';

interface PRFeedItemProps {
  story: Story;
  variant?: PRFeedItemVariant;
  meta?: React.ReactNode;
  unwrapped?: boolean;
}

const HEADLINE_CLASSES: Record<PRFeedItemVariant, string> = {
  hero: 'font-feed-display font-semibold text-3xl md:text-4xl leading-tight text-foreground hover:text-feed-teal transition-colors line-clamp-3',
  standard:
    'font-feed-display font-semibold text-xl md:text-2xl leading-tight text-foreground hover:text-feed-teal transition-colors line-clamp-2',
  compact:
    'font-feed-display font-semibold text-lg md:text-xl leading-tight text-foreground hover:text-feed-teal transition-colors line-clamp-2',
};

const STANDFIRST_CLASSES: Record<PRFeedItemVariant, string> = {
  hero: 'font-feed-body text-lg text-foreground-secondary leading-[1.7]',
  standard: 'font-feed-body text-lg text-foreground-secondary leading-[1.7]',
  compact: 'font-feed-body text-base text-foreground-secondary leading-[1.6] line-clamp-2',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function PRFeedItem({ story, variant = 'standard', meta, unwrapped }: PRFeedItemProps) {
  const detailUrl = `/stories/${story.id}/`;
  const cat = primaryCategory(story);
  const dateLabel =
    story.kind === 'pr' && story.mergedAt
      ? `Merged ${formatDate(story.mergedAt)}`
      : `Pushed ${formatDate(story.committedAt)}`;
  const ref = story.kind === 'pr' ? `#${story.prNumber}` : story.sha.slice(0, 7);

  const categoryBlock = !meta && cat && (
    <div className="mb-2 flex items-center gap-2 font-feed-mono text-[0.6875rem] tracking-wide">
      <span className="font-semibold uppercase text-feed-gold">
        {categoryDisplayName(cat.key)}
      </span>
      <span className="text-muted">·</span>
      <span className="text-muted">{dateLabel}</span>
      <span className="text-muted">·</span>
      <SizeBars size={story.sizeAssessment} />
    </div>
  );

  const defaultMetaBlock = !meta && (
    <div className="flex items-center gap-2 flex-wrap font-feed-mono text-[0.75rem] text-muted">
      <span>{ref}</span>
      <span>·</span>
      <span>by @{story.author}</span>
    </div>
  );

  const headlineBlock = (
    <h2 className={variant === 'compact' ? 'mb-2' : 'mb-3'}>
      <Link href={detailUrl} className={HEADLINE_CLASSES[variant]}>
        {story.headline}
      </Link>
    </h2>
  );

  const standfirstBlock = story.standfirst && (
    <p className={STANDFIRST_CLASSES[variant]}>{story.standfirst}</p>
  );

  const content = (
    <>
      {meta ?? categoryBlock}
      {headlineBlock}
      {!meta && <div className="mb-4">{defaultMetaBlock}</div>}
      {standfirstBlock}
    </>
  );

  if (unwrapped) return <div className="min-w-0">{content}</div>;

  return (
    <article className="py-8 border-b border-border-light last:border-b-0">
      {content}
    </article>
  );
}

// Re-export so callers can keep using SizeBars from this module
export { SizeBars };
export type { SizeAssessment };
export { sizeLabel };
