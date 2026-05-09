import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadReleases } from '@/lib/releases-loader';
import { loadRepo, publicationName, releasesPerPage } from '@/lib/repo';
import {
  buildReleasesListMetadata,
  canonicalUrl,
} from '@/lib/seo';
import { JsonLd, buildReleasesListJsonLd } from '@/lib/json-ld';
import { releasePath } from '@/lib/urls';
import { paginateReleases, releasesPagePath } from '@/lib/pagination';
import { ReleasesListHero } from '@/components/ReleasesListHero';
import { ReleasesListStandardCard } from '@/components/ReleasesListStandardCard';
import { ReleasesListCompactRow } from '@/components/ReleasesListCompactRow';
import { PaginationNav } from '@/components/PaginationNav';

interface RouteParams {
  n: string;
}

export function generateStaticParams(): RouteParams[] {
  const repo = loadRepo();
  const releases = loadReleases();
  const total = Math.max(
    1,
    Math.ceil(releases.length / releasesPerPage(repo)),
  );
  const params: RouteParams[] = [];
  for (let n = 2; n <= total; n++) params.push({ n: String(n) });
  return params;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { n } = await params;
  const page = Number(n);
  const base = buildReleasesListMetadata();
  if (!Number.isInteger(page) || page < 2) return base;
  return {
    ...base,
    alternates: { canonical: canonicalUrl(releasesPagePath(page)) },
  };
}

export default async function ReleasesPageN({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { n } = await params;
  const page = Number(n);
  if (!Number.isInteger(page) || page < 2) notFound();

  const releases = loadReleases();
  const repo = loadRepo();
  const slice = paginateReleases(releases, releasesPerPage(repo), page);
  if (slice.page !== page) notFound();

  const [hero, ...rest] = slice.releases;
  const standard = rest.slice(0, 3);
  const compact = rest.slice(3);

  const listJsonLd = buildReleasesListJsonLd({
    releases: slice.releases,
    canonicalUrl: canonicalUrl(releasesPagePath(slice.page)),
    repo,
    releaseUrl: (r) => canonicalUrl(releasePath(r)),
  });

  const olderHref =
    slice.page < slice.totalPages
      ? releasesPagePath(slice.page + 1)
      : undefined;
  const newerHref = releasesPagePath(slice.page - 1);

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
        <PaginationNav olderHref={olderHref} newerHref={newerHref} />
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
