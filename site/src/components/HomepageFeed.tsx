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
    <div className="max-w-2xl mx-auto px-6 py-16 text-center">
      <div className="font-feed-display text-2xl text-foreground mb-4">
        No Stories Yet
      </div>
      <p className="font-feed-body text-foreground-secondary mb-6">
        Merged pull requests and direct pushes will appear here as your
        development story unfolds.
      </p>
    </div>
  );
}
