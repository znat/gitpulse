// Editorial "Special Edition" card for releases. Renders inline at the top
// of its publication day in the homepage feed. Adapted from gitsky's
// SpecialEditionCard — drops imageUrl, highlightCount, slug/owner-context
// (gitpulse is single-repo), reduces the stats strip from 4 → 3 cells.

import Link from 'next/link';
import { formatLines, type Release, type ReleaseTopStory } from '@/lib/releases';
import { releasePath } from '@/lib/urls';

export function SpecialEditionCard({ release }: { release: Release }) {
  const url = releasePath(release);
  const topStories = release.topStories.slice(0, 3);

  return (
    <div className="py-8 border-b border-border-subtle">
      <div className="se-card relative rounded overflow-hidden bg-sidebar">
        <CornerOrnaments />
        <div className="relative z-[1] p-[2.25rem]">
          <Link href={url} className="block group/header">
            <TopRow tag={release.tag} isPrerelease={release.isPrerelease} />
            <Quip text={release.quip} />
            <ReleaseName name={release.name} />
          </Link>
          <StatsStrip release={release} />
          {topStories.length > 0 && <TopStoriesList stories={topStories} />}
          <CtaRow url={url} prCount={release.prCount} />
        </div>
      </div>
    </div>
  );
}

function CornerOrnaments() {
  const positions = [
    'top-[10px] left-[10px]',
    'top-[10px] right-[10px]',
    'bottom-[10px] left-[10px]',
    'bottom-[10px] right-[10px]',
  ];
  return (
    <>
      {positions.map((pos) => (
        <div
          key={pos}
          className={`se-corner absolute w-[14px] h-[14px] opacity-20 z-[2] ${pos}`}
        />
      ))}
    </>
  );
}

function TopRow({ tag, isPrerelease }: { tag: string; isPrerelease: boolean }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="font-feed-mono text-[0.5625rem] font-semibold uppercase tracking-[0.25em] text-feed-gold flex items-center gap-2">
        <span className="w-[5px] h-[5px] bg-feed-gold rotate-45 opacity-50" />
        Release Edition
        <span className="w-[5px] h-[5px] bg-feed-gold rotate-45 opacity-50" />
      </div>
      <div className="flex items-center gap-2">
        {isPrerelease && (
          <span className="font-feed-mono text-[0.5rem] uppercase tracking-[0.15em] text-feed-gold/70 border border-feed-gold/30 px-[0.5em] py-[0.15em] rounded-[3px]">
            Pre-release
          </span>
        )}
        <span className="font-feed-mono text-[0.5625rem] text-muted bg-background-tertiary px-[0.6em] py-[0.2em] rounded-[3px] border border-border-light">
          {tag}
        </span>
      </div>
    </div>
  );
}

function Quip({ text }: { text: string }) {
  if (!text) return null;
  return (
    <h2 className="font-feed-vollkorn text-[1.625rem] italic leading-[1.35] text-foreground mb-2 max-w-[540px]">
      &ldquo;{text}&rdquo;
    </h2>
  );
}

function ReleaseName({ name }: { name: string | null }) {
  if (!name) return null;
  return (
    <div className="font-feed-mono text-[0.6875rem] uppercase tracking-[0.12em] text-muted mb-6">
      Release <span className="text-feed-gold/60">&mdash;</span> {name}
    </div>
  );
}

function StatsStrip({ release }: { release: Release }) {
  const linesLabel = formatLines(release.totalAdditions + release.totalDeletions);
  const stats = [
    { value: String(release.prCount), label: 'PRs Merged' },
    { value: String(release.contributorCount), label: 'Contributors' },
    { value: `+${linesLabel}`, label: 'Lines' },
  ];

  return (
    <div className="flex border-y border-border-subtle mb-6">
      {stats.map((stat, i) => (
        <div key={stat.label} className="flex-1 text-center py-3.5 px-2 relative">
          <div className="font-feed-display text-[1.375rem] text-foreground leading-none mb-[0.2rem]">
            {stat.value}
          </div>
          <div className="font-feed-mono text-[0.5625rem] uppercase tracking-[0.1em] text-muted">
            {stat.label}
          </div>
          {i < stats.length - 1 && (
            <div className="absolute right-0 top-1/4 h-1/2 w-px bg-border-light" />
          )}
        </div>
      ))}
    </div>
  );
}

function TopStoriesList({ stories }: { stories: ReleaseTopStory[] }) {
  return (
    <div className="mb-6">
      <div className="font-feed-mono text-[0.5625rem] uppercase tracking-[0.15em] text-feed-gold/60 mb-3">
        Top Stories
      </div>
      <ul className="list-none">
        {stories.map((story, i) => (
          <li
            key={story.storyId}
            className="flex items-baseline gap-3 py-2 border-b border-border-subtle last:border-b-0"
          >
            <span className="font-feed-display text-base text-feed-gold/60 shrink-0 min-w-[1.25rem]">
              {i + 1}
            </span>
            <span className="flex-1 min-w-0">
              <span className="font-feed-display text-[0.9375rem] leading-[1.35] text-foreground-secondary">
                {story.headline}
              </span>
              {story.standfirst && (
                <span className="block font-feed-body text-[0.8125rem] leading-[1.5] text-muted mt-0.5">
                  {story.standfirst}
                </span>
              )}
            </span>
            <CategoryBadge category={story.primaryCategoryKey} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function CategoryBadge({ category }: { category: string }) {
  if (category === 'feature') {
    return (
      <span className="font-feed-mono text-[0.5rem] font-semibold uppercase tracking-[0.05em] text-feed-teal shrink-0 self-center">
        Feature
      </span>
    );
  }
  if (category === 'bugfix') {
    return (
      <span className="font-feed-mono text-[0.5rem] font-semibold uppercase tracking-[0.05em] text-negative shrink-0 self-center">
        Fix
      </span>
    );
  }
  return null;
}

function CtaRow({ url, prCount }: { url: string; prCount: number }) {
  return (
    <div className="flex items-center justify-between pt-1">
      <Link
        href={url}
        className="group/cta font-feed-mono text-xs font-medium text-feed-gold inline-flex items-center gap-2 hover:opacity-80 hover:gap-3 transition-all"
      >
        Read the Full Edition
        <span className="text-base transition-transform group-hover/cta:translate-x-[3px]">&rarr;</span>
      </Link>
      <span className="font-feed-mono text-[0.6875rem] text-muted">
        {prCount} {prCount === 1 ? 'story' : 'stories'} inside
      </span>
    </div>
  );
}
