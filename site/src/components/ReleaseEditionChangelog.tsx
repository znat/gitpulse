// Lifted from gitsky's apps/web/app/o/[slug]/releases/[owner]/[repo]/[tag]/
// components/ReleaseEditionChangelog.tsx. Adaptations:
// - 'use client' dropped (we navigate via <Link>)
// - openPanel(...) replaced with <Link>
// - takes resolved Story[] from server instead of denormalized ReleaseTopStory[]
//   (changelog IDs are stored bare in the release file; the page loader
//    resolves them against the on-disk story set)

import Link from 'next/link';
import { primaryCategory, type Story } from '@/lib/stories';
import { storyPath } from '@/lib/urls';

const CATEGORY_CONFIG: Record<
  string,
  { label: string; icon: string; color: string }
> = {
  feature: { label: 'Features', icon: '✦', color: 'text-feed-teal bg-feed-teal/10' },
  bugfix: { label: 'Bug Fixes', icon: '●', color: 'text-negative bg-negative/10' },
  refactor: { label: 'Improvements', icon: '◆', color: 'text-[#58a6ff] bg-[#58a6ff]/10' },
  performance: { label: 'Performance', icon: '▲', color: 'text-[#58a6ff] bg-[#58a6ff]/10' },
  docs: { label: 'Documentation', icon: '◇', color: 'text-muted bg-muted/10' },
  test: { label: 'Testing', icon: '◈', color: 'text-muted bg-muted/10' },
  other: { label: 'Other', icon: '○', color: 'text-muted bg-muted/10' },
};

export function ReleaseEditionChangelog({ stories }: { stories: Story[] }) {
  if (stories.length === 0) return null;

  const groups = groupByCategory(stories);
  const sortedKeys = Object.keys(groups).sort(
    (a, b) => groups[b]!.length - groups[a]!.length,
  );

  return (
    <div className="mt-12">
      <SectionDivider label="Full Changelog" />
      {sortedKeys.map((key) => (
        <ChangelogGroup
          key={key}
          categoryKey={key}
          items={groups[key]!}
        />
      ))}
    </div>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-4 py-6">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-feed-gold/40 to-transparent" />
      <span className="font-feed-display text-lg text-foreground whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-feed-gold/40 to-transparent" />
    </div>
  );
}

function ChangelogGroup({
  categoryKey,
  items,
}: {
  categoryKey: string;
  items: Story[];
}) {
  const config = CATEGORY_CONFIG[categoryKey] ?? CATEGORY_CONFIG.other!;

  return (
    <div className="mb-10 last:mb-0">
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border-subtle">
        <span
          className={`w-6 h-6 rounded flex items-center justify-center text-xs shrink-0 ${config.color}`}
        >
          {config.icon}
        </span>
        <span className="font-feed-mono text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-foreground-secondary">
          {config.label}
        </span>
        <span className="font-feed-mono text-[0.6rem] text-muted ml-auto">
          {items.length}
        </span>
      </div>
      {items.map((story) => (
        <ChangelogItem key={story.id} story={story} />
      ))}
    </div>
  );
}

function ChangelogItem({ story }: { story: Story }) {
  const ref = story.kind === 'pr' ? `#${story.prNumber}` : story.sha.slice(0, 7);
  return (
    <div className="grid grid-cols-[1fr_auto] gap-4 items-baseline py-2.5 border-b border-border-subtle last:border-b-0">
      <div className="min-w-0">
        <Link
          href={storyPath(story)}
          className="font-feed-display text-[0.9375rem] text-foreground-secondary leading-[1.35] hover:opacity-80 transition-colors"
        >
          {story.headline}
        </Link>
        <span className="font-feed-mono text-[0.55rem] text-muted ml-2">
          {ref}
        </span>
      </div>
      <span className="font-feed-mono text-[0.55rem] text-muted whitespace-nowrap">
        @{story.author}
      </span>
    </div>
  );
}

function groupByCategory(stories: Story[]): Record<string, Story[]> {
  const groups: Record<string, Story[]> = {};
  for (const story of stories) {
    const category = primaryCategory(story)?.key ?? 'other';
    (groups[category] ||= []).push(story);
  }
  return groups;
}
