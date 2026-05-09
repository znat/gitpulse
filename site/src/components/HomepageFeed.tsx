/**
 * Day-grouped feed: features (hero + standard), bug fixes (FixesBrief),
 * housekeeping (HousekeepingDrawer). v1 has no images, no releases,
 * no developing-stories bar, no pagination yet.
 */

import { type StoryDay } from '@/lib/stories';
import type { ReleasesByDay } from '@/lib/releases';
import { PRFeedItem } from '@/components/PRFeedItem';
import { FixesBrief } from '@/components/FixesBrief';
import { HousekeepingDrawer } from '@/components/HousekeepingDrawer';
import { SpecialEditionCard } from '@/components/SpecialEditionCard';
import { PaginationNav } from '@/components/PaginationNav';

interface HomepageFeedProps {
  days: StoryDay[];
  releasesByDay?: ReleasesByDay;
  olderHref?: string;
  newerHref?: string;
}

export function HomepageFeed({
  days,
  releasesByDay = {},
  olderHref,
  newerHref,
}: HomepageFeedProps) {
  const hasContent = days.length > 0 || Object.keys(releasesByDay).length > 0;
  if (!hasContent) return <EmptyHomepage />;

  // Merge: every date that has either stories or releases.
  const allDates = new Set<string>([
    ...days.map((d) => d.date),
    ...Object.keys(releasesByDay),
  ]);
  const sortedDates = Array.from(allDates).sort((a, b) => b.localeCompare(a));
  const dayMap = new Map(days.map((d) => [d.date, d]));

  return (
    <div className="max-w-3xl mx-auto px-6">
      {sortedDates.map((date) => {
        const day = dayMap.get(date);
        const dateReleases = releasesByDay[date] ?? [];
        const dateLabel =
          day?.dateLabel ??
          new Intl.DateTimeFormat('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }).format(new Date(date + 'T12:00:00Z'));
        return (
          <div key={date}>
            <DayHeader dateLabel={dateLabel} />
            {dateReleases.map((release) => (
              <SpecialEditionCard key={release.tag} release={release} />
            ))}
            {day && <FeaturesSection items={day.features} />}
            {day && <FixesBrief fixes={day.bugfixes} />}
            {day && <HousekeepingDrawer items={day.housekeeping} />}
          </div>
        );
      })}
      <PaginationNav olderHref={olderHref} newerHref={newerHref} />
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
