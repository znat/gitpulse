'use client';

import Link from 'next/link';
import { useState } from 'react';
import { type Story, primaryCategory } from '@/lib/stories';
import { storyPath } from '@/lib/urls';

// Tier 3 — invisible-to-users changes (deps, CI, refactors, etc.). Collapsed
// by default; expanding reveals a terminal-style changelog list.

export function HousekeepingDrawer({ items }: { items: Story[] }) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;
  const noun = items.length === 1 ? 'change' : 'changes';

  return (
    <section className="py-5 border-b border-[var(--border-light)]">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full cursor-pointer items-center justify-between border-0 bg-transparent p-0 font-feed-mono text-[0.6875rem] uppercase tracking-[0.15em] text-[var(--text-muted)]"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="inline-block h-px w-5 bg-[var(--border-medium)]"
          />
          Also on the wire &middot; {items.length} housekeeping {noun}
        </span>
        <span className="text-[var(--text-secondary)]">
          {open ? 'Hide −' : 'Show all →'}
        </span>
      </button>

      {open && (
        <ul className="m-0 mt-4 list-none p-0 border-t border-dotted border-[var(--border-light)]">
          {items.map((story) => (
            <HousekeepingRow key={story.id} story={story} />
          ))}
        </ul>
      )}
    </section>
  );
}

function HousekeepingRow({ story }: { story: Story }) {
  const ref =
    story.kind === 'pr' ? `#${story.prNumber}` : story.sha.slice(0, 7);
  const category = primaryCategory(story)?.key ?? 'misc';
  return (
    <li className="flex items-center gap-3 py-2 font-feed-mono text-xs text-[var(--text-secondary)] border-b border-dotted border-[var(--border-light)]">
      <span className="min-w-[52px] text-[var(--text-muted)]">{ref}</span>
      <span className="min-w-[64px] rounded-[2px] border border-[var(--border-light)] bg-[var(--bg-tertiary)] px-1.5 py-px text-center text-[0.5625rem] uppercase tracking-[0.12em] text-[var(--text-muted)]">
        {category}
      </span>
      <span className="flex-1 truncate text-[var(--text-primary)]">
        <Link
          href={storyPath(story)}
          className="text-inherit no-underline transition-colors duration-150 hover:text-[var(--feed-teal)]"
        >
          {story.headline}
        </Link>
      </span>
      <span className="text-[var(--text-muted)]">@{story.author}</span>
    </li>
  );
}
