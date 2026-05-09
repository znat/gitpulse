// Lifted from gitsky's ReleasesListCompactRow.tsx. Single-repo: drops
// the repoName chip on the top metadata row. Keeps the semver-type
// detection and color tokens verbatim.

import Link from 'next/link';
import { formatLines, type Release } from '@/lib/releases';
import { releasePath } from '@/lib/urls';

export function ReleasesListCompactRow({ release }: { release: Release }) {
  const url = releasePath(release);
  const dateStr = new Date(release.publishedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  const semverType = getSemverType(release.tag);
  const linesLabel = formatLines(release.totalAdditions + release.totalDeletions);

  return (
    <Link href={url} className="block group">
      <article className="py-6 border-b border-border-subtle transition-colors">
        <div className="flex items-center gap-2 mb-3">
          <span
            className={`font-feed-mono text-[0.5625rem] px-[0.5em] py-[0.15em] rounded-[3px] border bg-background-tertiary ${getVersionColors(semverType)}`}
          >
            {release.tag}
          </span>
          <span
            className={`font-feed-mono text-[0.4375rem] font-semibold uppercase tracking-[0.08em] px-[0.4em] py-[0.15em] rounded-[2px] ${getBadgeColors(semverType)}`}
          >
            {semverType}
          </span>
          {release.isPrerelease && (
            <span className="font-feed-mono text-[0.4375rem] font-semibold uppercase tracking-[0.08em] px-[0.4em] py-[0.15em] rounded-[2px] text-feed-gold/70 border border-feed-gold/30">
              Pre
            </span>
          )}
          <span className="ml-auto font-feed-mono text-[0.5625rem] text-muted">
            {dateStr}
          </span>
        </div>
        <p className="font-feed-display font-semibold text-lg md:text-xl leading-tight text-foreground-secondary line-clamp-2 mb-3 transition-colors group-hover:text-foreground">
          &ldquo;{release.quip}&rdquo;
        </p>
        <div className="flex items-center justify-between">
          <div className="flex gap-4 font-feed-mono text-[0.5625rem] text-muted">
            <span>
              <strong className="text-foreground-secondary font-semibold">{release.prCount}</strong> PRs
            </span>
            <span>+{linesLabel} lines</span>
          </div>
          <span className="font-feed-mono text-[0.5625rem] text-feed-teal inline-flex items-center gap-1 transition-all group-hover:opacity-80 group-hover:gap-1.5">
            Read <span className="transition-transform group-hover:translate-x-[2px]">&rarr;</span>
          </span>
        </div>
      </article>
    </Link>
  );
}

function getVersionColors(type: string) {
  const m: Record<string, string> = {
    major: 'text-feed-gold border-feed-gold/40',
    minor: 'text-feed-teal border-feed-teal/25',
    patch: 'text-muted border-border-light',
  };
  return m[type] ?? m.patch!;
}

function getBadgeColors(type: string) {
  const m: Record<string, string> = {
    major: 'bg-feed-gold/[0.12] text-feed-gold',
    minor: 'bg-feed-teal/10 text-feed-teal',
    patch: 'bg-muted/[0.12] text-muted',
  };
  return m[type] ?? m.patch!;
}

function getSemverType(tag: string): string {
  const cleaned = tag.replace(/^v/, '');
  const parts = cleaned.split('.');
  if (parts.length < 3) return 'minor';
  const [, minor, patch] = parts;
  if (patch !== '0') return 'patch';
  if (minor !== '0') return 'minor';
  return 'major';
}
