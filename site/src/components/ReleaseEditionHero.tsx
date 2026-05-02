// Lifted from gitsky's apps/web/app/[owner]/[repo]/releases/[tag]/components/
// ReleaseEditionHero.tsx. Drops imageUrl block (deferred for v1) and the
// owner/repo context for the "All Releases" link.

import Link from 'next/link';
import { formatReleaseDate, type Release } from '@/lib/releases';
import { releasesIndexPath } from '@/lib/urls';

export function ReleaseEditionHero({ release }: { release: Release }) {
  const dateStr = formatReleaseDate(release.publishedAt);

  return (
    <section className="min-h-[80vh] flex flex-col items-center justify-center text-center px-6 py-20 relative overflow-hidden">
      <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[radial-gradient(ellipse,rgba(212,165,116,0.03)_0%,transparent_60%)] pointer-events-none" />
      <HeroLabel isPrerelease={release.isPrerelease} />
      <VersionBadge tag={release.tag} />
      <Quip text={release.quip} />
      <ReleaseName name={release.name} date={dateStr} />
      {release.releaseStory && <ReleaseStory text={release.releaseStory} />}
      <Link
        href={releasesIndexPath()}
        className="font-feed-mono text-[0.6875rem] text-muted hover:text-foreground transition-colors mt-8"
      >
        &larr; All Releases
      </Link>
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-feed-gold/50 to-transparent" />
    </section>
  );
}

function HeroLabel({ isPrerelease }: { isPrerelease: boolean }) {
  return (
    <div className="font-feed-mono text-[0.5rem] font-semibold uppercase tracking-[0.35em] text-feed-gold border border-feed-gold/30 px-6 py-[0.45em] mb-10 inline-flex items-center gap-3">
      <span className="w-1 h-1 bg-feed-gold rotate-45 opacity-50" />
      {isPrerelease ? 'Pre-release Edition' : 'Release Edition'}
      <span className="w-1 h-1 bg-feed-gold rotate-45 opacity-50" />
    </div>
  );
}

function VersionBadge({ tag }: { tag: string }) {
  return (
    <div className="font-feed-mono text-[0.6875rem] text-muted bg-background-tertiary px-3 py-1 rounded border border-border-light mb-6">
      {tag}
    </div>
  );
}

function Quip({ text }: { text: string }) {
  if (!text) return null;
  return (
    <h1 className="font-feed-vollkorn text-[clamp(2rem,5vw,3.5rem)] italic font-normal leading-[1.15] text-foreground max-w-[720px] mb-4">
      &ldquo;{text}&rdquo;
    </h1>
  );
}

function ReleaseName({ name, date }: { name: string | null; date: string }) {
  if (!name) {
    return (
      <div className="font-feed-mono text-[0.75rem] uppercase tracking-[0.15em] text-muted mb-6">
        {date}
      </div>
    );
  }
  return (
    <div className="font-feed-mono text-[0.75rem] uppercase tracking-[0.15em] text-muted mb-6">
      {name} <span className="text-feed-gold/40">&middot;</span> {date}
    </div>
  );
}

function ReleaseStory({ text }: { text: string }) {
  return (
    <div className="max-w-[600px] mx-auto text-left font-feed-body text-base leading-[1.8] text-foreground-secondary mt-2">
      {text.split('\n').map((para, i) => (
        <p key={i} className={i > 0 ? 'mt-4' : ''}>
          {para}
        </p>
      ))}
    </div>
  );
}
