import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { groupByDay } from '@/lib/stories';
import { loadStories } from '@/lib/stories-loader';
import { groupReleasesByDay } from '@/lib/releases';
import { loadReleases } from '@/lib/releases-loader';
import {
  daysPerPage,
  loadRepo,
  publicationName,
  publicationSubtitle,
} from '@/lib/repo';
import { buildHomeMetadata, canonicalUrl } from '@/lib/seo';
import {
  feedPagePath,
  mergedSortedDates,
  paginateFeed,
} from '@/lib/pagination';
import { FeedHeader } from '@/components/FeedHeader';
import { SectionNav } from '@/components/SectionNav';
import { HomepageFeed } from '@/components/HomepageFeed';

interface RouteParams {
  n: string;
}

export function generateStaticParams(): RouteParams[] {
  const repo = loadRepo();
  const days = groupByDay(loadStories());
  const releasesByDay = groupReleasesByDay(loadReleases());
  const dates = mergedSortedDates(days, releasesByDay);
  const total = Math.max(1, Math.ceil(dates.length / daysPerPage(repo)));
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
  const base = buildHomeMetadata();
  if (!Number.isInteger(page) || page < 2) return base;
  return {
    ...base,
    alternates: { canonical: canonicalUrl(feedPagePath(page)) },
  };
}

export default async function HomePageN({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { n } = await params;
  const page = Number(n);
  if (!Number.isInteger(page) || page < 2) notFound();

  const repo = loadRepo();
  const days = groupByDay(loadStories());
  const releasesByDay = groupReleasesByDay(loadReleases());
  const slice = paginateFeed(days, releasesByDay, daysPerPage(repo), page);
  if (slice.page !== page) notFound();

  const olderHref =
    slice.page < slice.totalPages ? feedPagePath(slice.page + 1) : undefined;
  const newerHref = feedPagePath(slice.page - 1);

  return (
    <main className="min-h-screen bg-background">
      <FeedHeader
        feedTitle={publicationName(repo)}
        feedSubtitle={publicationSubtitle(repo)}
      />
      <SectionNav />
      <HomepageFeed
        days={slice.days}
        releasesByDay={slice.releasesByDay}
        olderHref={olderHref}
        newerHref={newerHref}
      />
    </main>
  );
}
