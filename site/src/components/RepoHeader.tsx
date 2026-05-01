import type { RepoInfo } from '@/lib/repo';

export function RepoHeader({ repo }: { repo: RepoInfo }) {
  return (
    <div className="max-w-[1200px] mx-auto px-6 pt-10 pb-6 text-center">
      <p className="font-feed-mono text-[13px] tracking-wide text-muted mb-3">
        Repository activity
      </p>
      <h1 className="font-feed-display text-4xl md:text-5xl text-foreground mb-4">
        {repo.owner}/{repo.repo}
      </h1>
      {repo.description && (
        <>
          <div className="relative w-[60px] h-px bg-border-medium mx-auto mb-4">
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-accent-tertiary text-[8px]">
              ◆
            </span>
          </div>
          <p className="font-feed-body text-lg italic text-foreground-secondary max-w-[520px] mx-auto">
            {repo.description}
          </p>
        </>
      )}
    </div>
  );
}
