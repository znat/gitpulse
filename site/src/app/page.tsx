import type { Metadata } from 'next';
import { groupByDay } from '@/lib/stories';
import { loadStories } from '@/lib/stories-loader';
import { loadRepo, publicationName, publicationSubtitle } from '@/lib/repo';
import { FeedHeader } from '@/components/FeedHeader';
import { SectionNav } from '@/components/SectionNav';
import { HomepageFeed } from '@/components/HomepageFeed';

export function generateMetadata(): Metadata {
  const repo = loadRepo();
  return {
    title: `${publicationName(repo)} — Gitpulse`,
    description: publicationSubtitle(repo),
  };
}

export default function HomePage() {
  const repo = loadRepo();
  const days = groupByDay(loadStories());

  return (
    <main className="min-h-screen bg-background">
      <FeedHeader
        feedTitle={publicationName(repo)}
        feedSubtitle={publicationSubtitle(repo)}
      />
      <SectionNav />
      <HomepageFeed days={days} />
    </main>
  );
}
