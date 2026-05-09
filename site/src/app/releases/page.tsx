// /releases/ — list page. Lifted from gitsky's
// apps/web/app/[owner]/[repo]/releases/page.tsx. Single-repo: no
// owner/repo params, no DB — reads from public/data/releases.

import type { Metadata } from 'next';
import { loadReleases } from '@/lib/releases-loader';
import { loadRepo, publicationName, releasesPerPage } from '@/lib/repo';
import {
  buildReleasesListMetadata,
  canonicalUrl,
} from '@/lib/seo';
import { JsonLd, buildReleasesListJsonLd } from '@/lib/json-ld';
import { releasePath, releasesIndexPath } from '@/lib/urls';
import { paginateReleases, releasesPagePath } from '@/lib/pagination';
import { ReleasesListHero } from '@/components/ReleasesListHero';
import { ReleasesListStandardCard } from '@/components/ReleasesListStandardCard';
import { ReleasesListCompactRow } from '@/components/ReleasesListCompactRow';
import { PaginationNav } from '@/components/PaginationNav';

export function generateMetadata(): Metadata {
  return buildReleasesListMetadata();
}

export default function ReleasesIndexPage() {
  const releases = loadReleases();
  const repo = loadRepo();

  if (releases.length === 0) {
    return (
      <main className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-6 py-20 text-center">
          <div className="font-feed-mono text-[0.6875rem] uppercase tracking-[0.2em] text-feed-gold mb-4">
            Release Editions
          </div>
          <h1 className="font-feed-display text-3xl text-foreground mb-4">
            No editions yet
          </h1>
          <p className="font-feed-body text-foreground-secondary">
            Special editions appear here when you publish a release on GitHub.
          </p>
        </div>
      </main>
    );
  }

  const slice = paginateReleases(releases, releasesPerPage(repo), 1);
  const [hero, ...rest] = slice.releases;
  const standard = rest.slice(0, 3);
  const compact = rest.slice(3);

  const listJsonLd = buildReleasesListJsonLd({
    releases: slice.releases,
    canonicalUrl: canonicalUrl(releasesIndexPath()),
    repo,
    releaseUrl: (r) => canonicalUrl(releasePath(r)),
  });

  const olderHref =
    slice.totalPages > 1 ? releasesPagePath(2) : undefined;

  return (
    <main className="min-h-screen bg-background">
      <JsonLd data={listJsonLd} />
      <div className="max-w-[1200px] mx-auto px-6 pt-10 pb-6 text-center">
        <p className="font-feed-mono text-[13px] tracking-wide text-muted mb-3">
          Release notes &amp; changelog
        </p>
        <h1 className="font-feed-display text-4xl md:text-5xl text-foreground mb-2">
          {publicationName(repo)} Releases
        </h1>
      </div>
      <div className="max-w-3xl mx-auto px-6">
        <EditionsDivider />
        {hero && <ReleasesListHero release={hero} />}
        {standard.map((release) => (
          <ReleasesListStandardCard key={release.tag} release={release} />
        ))}
        {compact.length > 0 && (
          <>
            <EarlierDivider />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
              {compact.map((release) => (
                <ReleasesListCompactRow key={release.tag} release={release} />
              ))}
            </div>
          </>
        )}
        <PaginationNav olderHref={olderHref} />
      </div>
    </main>
  );
}

function EditionsDivider() {
  return (
    <div className="flex items-center gap-4 py-6">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-feed-gold/40 to-transparent" />
      <span className="font-feed-mono text-[0.5625rem] font-semibold uppercase tracking-[0.25em] text-feed-gold flex items-center gap-2">
        <span className="w-1 h-1 bg-feed-gold rotate-45 opacity-50" />
        The Editions
        <span className="w-1 h-1 bg-feed-gold rotate-45 opacity-50" />
      </span>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-feed-gold/40 to-transparent" />
    </div>
  );
}

function EarlierDivider() {
  return (
    <div className="flex items-center gap-4 py-6">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-feed-gold/40 to-transparent" />
      <span className="font-feed-display text-lg text-foreground whitespace-nowrap">
        Earlier Editions
      </span>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-feed-gold/40 to-transparent" />
    </div>
  );
}
