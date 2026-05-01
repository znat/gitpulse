import Link from 'next/link';
import type { Story } from '@/lib/stories';
import { storyPath } from '@/lib/urls';

// Tier 2 — user-visible bug fixes. Two-column compact band with teal "FIX" kicker.

export function FixesBrief({ fixes }: { fixes: Story[] }) {
  if (fixes.length === 0) return null;

  return (
    <section className="py-8 border-b border-[var(--border-light)]">
      <h3 className="font-feed-display text-base font-semibold text-[var(--text-primary)] m-0 mb-5">
        Fixes &amp; Patches
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
        {fixes.map((story) => (
          <FixArticle key={story.id} story={story} />
        ))}
      </div>
    </section>
  );
}

function FixArticle({ story }: { story: Story }) {
  const ref =
    story.kind === 'pr' ? `#${story.prNumber}` : story.sha.slice(0, 7);
  return (
    <article className="flex flex-col gap-1">
      <div className="font-feed-mono text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-[var(--feed-teal)]">
        FIX
        <span className="font-normal text-[var(--text-muted)]">
          {' '}&middot; {ref} &middot; @{story.author}
        </span>
      </div>
      <h4 className="m-0 mt-0.5 font-feed-display text-[1.0625rem] font-semibold leading-[1.3] text-[var(--text-primary)]">
        <Link
          href={storyPath(story)}
          className="text-inherit no-underline transition-colors duration-150 hover:text-[var(--feed-teal)]"
        >
          {story.headline}
        </Link>
      </h4>
    </article>
  );
}
