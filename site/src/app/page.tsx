import type { Metadata } from 'next';
import { groupByDay } from '@/lib/stories';
import { loadStories } from '@/lib/stories-loader';
import { groupReleasesByDay } from '@/lib/releases';
import { loadReleases } from '@/lib/releases-loader';
import { loadRepo, publicationName, publicationSubtitle } from '@/lib/repo';
import { buildHomeMetadata } from '@/lib/seo';
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

  return (
    <main className="min-h-screen bg-background">
      <FeedHeader
        feedTitle={publicationName(repo)}
        feedSubtitle={publicationSubtitle(repo)}
      />
      <SectionNav />
      <HomepageFeed days={days} releasesByDay={releasesByDay} />
    </main>
  );
}
