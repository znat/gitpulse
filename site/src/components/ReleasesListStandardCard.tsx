// Lifted from gitsky's apps/web/app/[owner]/[repo]/releases/components/
// ReleasesListStandardCard.tsx. Single-repo adaptation: drops `owner`,
// `repoName` chips. Adds a Pre-release badge.

import Link from 'next/link';
import { formatLines, formatReleaseDate, type Release } from '@/lib/releases';
import { releasePath } from '@/lib/urls';

export function ReleasesListStandardCard({ release }: { release: Release }) {
  const url = releasePath(release);
  const dateStr = formatReleaseDate(release.publishedAt);
  const topStory = release.topStories[0];
  const linesLabel = formatLines(release.totalAdditions + release.totalDeletions);

  return (
    <Link href={url} className="block group">
      <article className="py-8 border-b border-border-subtle transition-colors hover:bg-sidebar">
        <div className="flex items-center gap-2 font-feed-mono text-[0.6875rem] tracking-[0.03em] mb-2">
          <span className="w-1 h-1 bg-feed-gold rotate-45 opacity-50" />
          <span className="font-semibold uppercase text-feed-gold text-[0.5625rem] tracking-[0.1em]">
            Release Edition
          </span>
          <span className="text-muted opacity-50">&middot;</span>
          <span className="text-[0.5625rem] text-muted bg-background-tertiary px-[0.5em] py-[0.15em] rounded-[3px] border border-border-light">
            {release.tag}
          </span>
          {release.isPrerelease && (
            <span className="text-[0.5rem] uppercase tracking-[0.15em] text-feed-gold/70 border border-feed-gold/30 px-[0.5em] py-[0.1em] rounded-[3px]">
              Pre-release
            </span>
          )}
          <span className="text-muted opacity-50">&middot;</span>
          <span className="text-muted">{dateStr}</span>
        </div>
        {release.quip && (
          <h3 className="font-feed-display font-semibold text-xl md:text-2xl leading-tight text-foreground mb-2 transition-colors group-hover:opacity-80">
            &ldquo;{release.quip}&rdquo;
          </h3>
        )}
        {release.name && (
          <div className="font-feed-mono text-[0.625rem] uppercase tracking-[0.1em] text-muted mb-3">
            Release &mdash; {release.name}
          </div>
        )}
        {topStory && (
          <p className="font-feed-body text-base italic text-foreground-secondary mb-4 leading-[1.5]">
            Top story: {topStory.headline}&hellip;
          </p>
        )}
        <div className="flex items-center justify-between">
          <div className="flex gap-5 font-feed-mono text-[0.6875rem] text-muted">
            <span>
              <strong className="text-foreground-secondary font-semibold">{release.prCount}</strong> PRs
            </span>
            <span>
              <strong className="text-foreground-secondary font-semibold">{release.contributorCount}</strong> contributors
            </span>
            <span>+{linesLabel} lines</span>
          </div>
          <span className="font-feed-mono text-[0.6875rem] font-medium text-feed-teal inline-flex items-center gap-1.5 transition-all group-hover:opacity-80 group-hover:gap-2">
            Read Edition <span className="transition-transform group-hover:translate-x-[2px]">&rarr;</span>
          </span>
        </div>
      </article>
    </Link>
  );
}
