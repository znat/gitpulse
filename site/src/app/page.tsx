export default function HomePage() {
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
