import { loadStories } from '@/lib/stories';
import { StoryCard } from '@/components/StoryCard';

export default function HomePage() {
  const stories = loadStories();

  if (stories.length === 0) {
    return (
      <main className="min-h-screen flex items-center justify-center p-md">
        <div className="max-w-2xl w-full text-center">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted mb-md">
            gitpulse
          </p>
          <h1 className="headline mb-lg">No stories yet.</h1>
          <p className="standfirst text-foreground-secondary text-left">
            Once the analyzer runs, merged pull requests and direct pushes to your
            default branch will appear here as short editorial stories.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-md py-2xl">
      <header className="mb-2xl pb-lg border-b border-border-strong">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted mb-sm">
          gitpulse
        </p>
        <h1 className="headline">The development log</h1>
      </header>
      <div>
        {stories.map((story) => (
          <StoryCard key={story.id} story={story} />
        ))}
      </div>
    </main>
  );
}
