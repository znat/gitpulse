// /releases/<tag>/<slug>/ — release detail. Lifted shape from gitsky's
// apps/web/app/[owner]/[repo]/releases/[tag]/page.tsx. Single-repo,
// no DB — reads from public/data/{releases,stories}.

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { loadReleases, loadRelease } from '@/lib/releases-loader';
import { loadStories } from '@/lib/stories-loader';
import type { Story } from '@/lib/stories';
import type { Release } from '@/lib/releases';
import { loadRepo } from '@/lib/repo';
import {
  buildReleaseMetadata,
  canonicalUrl,
} from '@/lib/seo';
import { JsonLd, buildReleaseJsonLd } from '@/lib/json-ld';
import { releasePath, releaseSlug, releaseOgImagePath } from '@/lib/urls';
import { ReleaseEditionHero } from '@/components/ReleaseEditionHero';
import { ReleaseEditionStatBar } from '@/components/ReleaseEditionStatBar';
import { ReleaseEditionTopStories } from '@/components/ReleaseEditionTopStories';
import { ReleaseEditionChangelog } from '@/components/ReleaseEditionChangelog';

interface RouteParams {
  tag: string;
  slug: string;
}

interface PageProps {
  params: Promise<RouteParams>;
}

// Sentinel route emitted only when there are no releases yet. Next 16's
// `output: 'export'` errors out on an empty generateStaticParams[] — this
// stub generates one URL that 404s, keeping the route file valid.
const EMPTY_STUB_TAG = '__no_releases_yet__';

// generateStaticParams returns raw segment values — Next.js encodes them
// when emitting the static filesystem path and decodes them back into the
// `params` object. Pre-encoding here would double-encode tags that contain
// special characters (e.g. 'release/v1.0.0').
export function generateStaticParams(): RouteParams[] {
  const releases = loadReleases();
  if (releases.length === 0) {
    return [{ tag: EMPTY_STUB_TAG, slug: 'placeholder' }];
  }
  return releases.map((r) => ({
    tag: r.tag,
    slug: releaseSlug(r),
  }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { tag } = await params;
  if (tag === EMPTY_STUB_TAG) return {};
  const release = loadRelease(tag);
  if (!release) return {};
  return buildReleaseMetadata(release);
}

export default async function ReleaseDetailPage({ params }: PageProps) {
  const { tag } = await params;
  if (tag === EMPTY_STUB_TAG) notFound();
  const release = loadRelease(tag);
  if (!release) notFound();

  const allStories = loadStories();
  const changelogStories = resolveChangelog(release, allStories);
  const repo = loadRepo();

  const url = canonicalUrl(releasePath(release));
  const jsonLd = buildReleaseJsonLd({
    release,
    canonicalUrl: url,
    imageUrl: canonicalUrl(releaseOgImagePath(release)),
    repo,
  });

  return (
    <main className="min-h-screen bg-background">
      <JsonLd data={jsonLd} />
      <ReleaseEditionHero release={release} />
      {release.prCount > 0 && <ReleaseEditionStatBar release={release} />}
      <div className="max-w-[1080px] mx-auto px-6 pb-20">
        <ReleaseEditionTopStories stories={release.topStories} />
        <ReleaseEditionChangelog stories={changelogStories} />
      </div>
    </main>
  );
}

function resolveChangelog(release: Release, allStories: Story[]): Story[] {
  const lookup = new Map(allStories.map((s) => [s.id, s]));
  const out: Story[] = [];
  for (const id of release.changelogStoryIds) {
    const s = lookup.get(id);
    if (s) out.push(s);
  }
  return out;
}
