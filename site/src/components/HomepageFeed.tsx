/**
 * Day-grouped feed: features (hero + standard), bug fixes (FixesBrief),
 * housekeeping (HousekeepingDrawer). v1 has no images, no releases,
 * no developing-stories bar, no pagination yet.
 */

import { type StoryDay } from '@/lib/stories';
import { PRFeedItem } from '@/components/PRFeedItem';
import { FixesBrief } from '@/components/FixesBrief';
import { HousekeepingDrawer } from '@/components/HousekeepingDrawer';

interface HomepageFeedProps {
  days: StoryDay[];
}

export function HomepageFeed({ days }: HomepageFeedProps) {
  if (days.length === 0) return <EmptyHomepage />;

  return (
    <div className="max-w-3xl mx-auto px-6">
      {days.map((day) => (
        <div key={day.date}>
          <DayHeader dateLabel={day.dateLabel} />
          <FeaturesSection items={day.features} />
          <FixesBrief fixes={day.bugfixes} />
          <HousekeepingDrawer items={day.housekeeping} />
        </div>
      ))}
    </div>
  );
}

function DayHeader({ dateLabel }: { dateLabel: string }) {
  return (
    <div className="flex items-center gap-4 py-6">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border-light/40 to-border-light/40" />
      <h2 className="font-feed-display text-lg text-foreground whitespace-nowrap">
        {dateLabel}
      </h2>
      <div className="flex-1 h-px bg-gradient-to-l from-transparent via-border-light/40 to-border-light/40" />
    </div>
  );
}

function FeaturesSection({ items }: { items: StoryDay['features'] }) {
  if (items.length === 0) return null;
  const [hero, ...rest] = items;
  if (!hero) return null;

  return (
    <>
      <PRFeedItem story={hero} variant="hero" />
      {rest.map((story) => (
        <PRFeedItem key={story.id} story={story} variant="standard" />
      ))}
    </>
  );
}

function EmptyHomepage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-20 text-center">
      <div className="font-feed-mono text-[0.6875rem] uppercase tracking-[0.2em] text-feed-gold mb-4">
        First Edition
      </div>
      <h2 className="font-feed-display text-3xl text-foreground mb-4">
        The press is warming up.
      </h2>
      <p className="font-feed-body text-lg text-foreground-secondary leading-[1.7] mb-8">
        Gitpulse is reading your default branch for the first time. The next
        scheduled run — or your next push to the main branch — will fill this
        page with stories about merged pull requests and direct pushes.
      </p>
      <div className="font-feed-mono text-xs text-muted">
        New here? Check the{' '}
        <a
          href="https://github.com/znat/gitpulse#install"
          className="text-feed-teal no-underline hover:underline"
        >
          install guide
        </a>
        {' '}or trigger a manual run from the Actions tab.
      </div>
    </div>
  );
}
