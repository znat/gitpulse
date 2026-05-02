// Lifted from gitsky's apps/web/app/o/[slug]/releases/[owner]/[repo]/[tag]/
// components/ReleaseEditionStatBar.tsx. Drops the "Highlights" and
// "Coverage" stats (gitpulse doesn't track those). 4 cells instead of 6.

import type { Release } from '@/lib/releases';
import { formatLines } from '@/lib/releases';

export function ReleaseEditionStatBar({ release }: { release: Release }) {
  const stats = [
    { value: String(release.prCount), label: 'PRs Merged' },
    { value: String(release.contributorCount), label: 'Contributors' },
    {
      value: `+${formatLines(release.totalAdditions)}`,
      label: 'Additions',
      className: 'text-positive',
    },
    {
      value: `-${formatLines(release.totalDeletions)}`,
      label: 'Deletions',
      className: 'text-negative',
    },
  ];

  return (
    <div className="border-y-2 border-border-light">
      <div className="max-w-[1080px] mx-auto grid grid-cols-2 md:grid-cols-4">
        {stats.map((stat, i) => (
          <div key={stat.label} className="text-center py-8 px-2 relative">
            <div
              className={`font-feed-display text-[2rem] leading-none mb-1 ${stat.className ?? 'text-foreground'}`}
            >
              {stat.value}
            </div>
            <div className="font-feed-mono text-[0.5rem] uppercase tracking-[0.12em] text-muted leading-[1.4]">
              {stat.label}
            </div>
            {i < stats.length - 1 && (
              <div className="hidden md:block absolute right-0 top-[20%] h-[60%] w-px bg-border-light" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
