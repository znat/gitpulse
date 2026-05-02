// Lifted from gitsky's apps/web/app/o/[slug]/releases/[owner]/[repo]/[tag]/
// components/ReleaseEditionTopStories.tsx. Adaptations:
// - 'use client' dropped (we navigate, not open a panel)
// - openPanel(...) replaced with <Link href={storyPath}>
// - story.prGithubId → story.storyId
// - story.categories[0]?.key → story.primaryCategoryKey
// - highlightKeys block dropped (gitpulse doesn't track them)

import Link from 'next/link';
import type { ReleaseTopStory } from '@/lib/releases';
import { slugify } from '@/lib/utils/slugify';

function storyHref(story: ReleaseTopStory): string {
  const slug = slugify(story.headline);
  return slug
    ? `/pull/${story.prNumber}/${slug}/`
    : `/pull/${story.prNumber}/`;
}

export function ReleaseEditionTopStories({
  stories,
}: {
  stories: ReleaseTopStory[];
}) {
  if (stories.length === 0) return null;

  const [lead, ...rest] = stories;
  const secondary = rest.slice(0, 2);
  const compact = rest.slice(2);

  return (
    <div>
      <SectionDivider label="Top Stories" />
      {lead && <LeadStory story={lead} rank={1} />}
      {secondary.length > 0 && <SecondaryStories stories={secondary} />}
      {compact.length > 0 && (
        <CompactStories stories={compact} startRank={secondary.length + 2} />
      )}
    </div>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4 py-6">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-feed-gold/40 to-transparent" />
      <span className="font-feed-mono text-[0.5625rem] font-semibold uppercase tracking-[0.25em] text-feed-gold flex items-center gap-2">
        <span className="w-1 h-1 bg-feed-gold rotate-45 opacity-50" />
        {label}
        <span className="w-1 h-1 bg-feed-gold rotate-45 opacity-50" />
      </span>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-feed-gold/40 to-transparent" />
    </div>
  );
}

function LeadStory({ story, rank }: { story: ReleaseTopStory; rank: number }) {
  return (
    <article className="py-8 border-b border-border-subtle">
      <div className="font-feed-display text-[3rem] text-background-tertiary leading-none mb-3">
        {rank}
      </div>
      <CategoryLabel category={story.primaryCategoryKey} />
      <h2 className="mb-3">
        <Link
          href={storyHref(story)}
          className="font-feed-display text-[1.75rem] leading-[1.25] text-foreground tracking-[-0.01em] hover:opacity-80 transition-colors"
        >
          {story.headline}
        </Link>
      </h2>
      <StoryMeta story={story} />
      {story.standfirst && (
        <p className="font-feed-body text-[0.95rem] leading-[1.65] text-foreground-secondary mb-4">
          {story.standfirst}
        </p>
      )}
    </article>
  );
}

function SecondaryStories({ stories }: { stories: ReleaseTopStory[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-8 border-b border-border-subtle">
      {stories.map((story, i) => (
        <article key={story.storyId} className="py-8">
          <div className="font-feed-display text-[2.5rem] text-background-tertiary leading-none mb-2">
            {i + 2}
          </div>
          <CategoryLabel category={story.primaryCategoryKey} />
          <h3 className="mb-2">
            <Link
              href={storyHref(story)}
              className="font-feed-display text-[1.25rem] leading-[1.3] text-foreground hover:opacity-80 transition-colors"
            >
              {story.headline}
            </Link>
          </h3>
          <StoryMeta story={story} />
          {story.standfirst && (
            <p className="font-feed-body text-[0.9rem] leading-[1.6] text-foreground-secondary line-clamp-3">
              {story.standfirst}
            </p>
          )}
        </article>
      ))}
    </div>
  );
}

function CompactStories({
  stories,
  startRank,
}: {
  stories: ReleaseTopStory[];
  startRank: number;
}) {
  return (
    <ul className="list-none max-w-3xl mx-auto">
      {stories.map((story, i) => (
        <li
          key={story.storyId}
          className="grid grid-cols-[2rem_1fr_auto] items-baseline gap-4 py-5 border-b border-border-subtle last:border-b-0"
        >
          <span className="font-feed-display text-lg text-border-light">
            {startRank + i}
          </span>
          <div className="min-w-0">
            <Link
              href={storyHref(story)}
              className="font-feed-display text-base text-foreground-secondary leading-[1.35] hover:opacity-80 transition-colors"
            >
              {story.headline}
            </Link>
            {story.standfirst && (
              <div className="font-feed-body text-[0.8rem] text-muted leading-[1.5] mt-0.5">
                {story.standfirst}
              </div>
            )}
          </div>
          <CategoryLabel category={story.primaryCategoryKey} small />
        </li>
      ))}
    </ul>
  );
}

function StoryMeta({ story }: { story: ReleaseTopStory }) {
  return (
    <div className="font-feed-mono text-[0.6rem] text-muted flex items-center gap-2 mb-3">
      <span>#{story.prNumber}</span>
      <span className="opacity-40">&middot;</span>
      <span>by @{story.authorLogin}</span>
      <span className="opacity-40">&middot;</span>
      <span>
        +{story.additions} / -{story.deletions}
      </span>
    </div>
  );
}

function CategoryLabel({
  category,
  small,
}: {
  category: string;
  small?: boolean;
}) {
  const colorMap: Record<string, string> = {
    feature: 'text-feed-teal',
    bugfix: 'text-negative',
    refactor: 'text-[#a78bfa]',
    performance: 'text-[#58a6ff]',
    security: 'text-[#fbbf24]',
    docs: 'text-muted',
    test: 'text-muted',
  };
  const color = colorMap[category] ?? 'text-muted';
  const size = small ? 'text-[0.5rem]' : 'text-[0.55rem]';

  return (
    <div
      className={`font-feed-mono ${size} font-semibold uppercase tracking-[0.15em] ${color} mb-3`}
    >
      {category}
    </div>
  );
}
