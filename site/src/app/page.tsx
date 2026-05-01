import { groupByDay, loadStories } from '@/lib/stories';
import { loadRepo, publicationName, publicationSubtitle } from '@/lib/repo';
import { FeedHeader } from '@/components/FeedHeader';
import { SectionNav } from '@/components/SectionNav';
import { HomepageFeed } from '@/components/HomepageFeed';

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
