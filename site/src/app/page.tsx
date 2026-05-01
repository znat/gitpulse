import { loadStories } from '@/lib/stories';
import { loadRepo } from '@/lib/repo';
import { StoryCard } from '@/components/StoryCard';
import { RepoHeader } from '@/components/RepoHeader';

export default function HomePage() {
  const repo = loadRepo();
  const stories = loadStories();

  return (
    <>
      <RepoHeader repo={repo} />
      {stories.length === 0 ? (
        <div className="max-w-2xl mx-auto px-md py-2xl text-center">
          <p className="standfirst text-foreground-secondary text-left">
            Once the analyzer runs, merged pull requests and direct pushes to your
            default branch will appear here as short editorial stories.
          </p>
        </div>
      ) : (
        <main className="max-w-3xl mx-auto px-md py-2xl">
          {stories.map((story) => (
            <StoryCard key={story.id} story={story} />
          ))}
        </main>
      )}
    </>
  );
}
