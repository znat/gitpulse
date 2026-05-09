import type { Metadata } from 'next';
import { groupByDay } from '@/lib/stories';
import { loadStories } from '@/lib/stories-loader';
import { groupReleasesByDay } from '@/lib/releases';
import { loadReleases } from '@/lib/releases-loader';
import {
  daysPerPage,
  loadRepo,
  publicationName,
  publicationSubtitle,
} from '@/lib/repo';
import { buildHomeMetadata } from '@/lib/seo';
import { feedPagePath, paginateFeed } from '@/lib/pagination';
import { FeedHeader } from '@/components/FeedHeader';
import { SectionNav } from '@/components/SectionNav';
import { HomepageFeed } from '@/components/HomepageFeed';

export function generateMetadata(): Metadata {
  return buildHomeMetadata();
}

export default function HomePage() {
  const repo = loadRepo();
  const days = groupByDay(loadStories());
  const releasesByDay = groupReleasesByDay(loadReleases());
  const slice = paginateFeed(days, releasesByDay, daysPerPage(repo), 1);
  const olderHref =
    slice.totalPages > 1 ? feedPagePath(2) : undefined;

  return (
    <main className="min-h-screen bg-background">
      <FeedHeader
        feedTitle={publicationName(repo)}
        feedSubtitle={publicationSubtitle(repo)}
      />
      <SectionNav />
      <HomepageFeed
        days={slice.days}
        releasesByDay={slice.releasesByDay}
        olderHref={olderHref}
      />
    </main>
  );
}
