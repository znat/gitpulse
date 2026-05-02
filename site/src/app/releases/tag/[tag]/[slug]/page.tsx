// Legacy redirect: the previous URL shape was /releases/tag/<tag>/<slug>/.
// Now /releases/<tag>/. Server-side `redirect()` doesn't work under
// `output: 'export'`, so emit a static page with a meta refresh. The
// `url=` is relative ("../../../<tag>/") so basePath is preserved
// without us hard-coding it here.

import { loadReleases } from '@/lib/releases-loader';
import { slugify } from '@/lib/utils/slugify';
import type { Release } from '@/lib/releases';

interface RouteParams {
  tag: string;
  slug: string;
}

const EMPTY_STUB_TAG = '__no_releases_yet__';

function legacySlug(release: Release): string {
  return slugify(release.name || release.tag) || release.tag;
}

export function generateStaticParams(): RouteParams[] {
  const releases = loadReleases();
  if (releases.length === 0) {
    return [{ tag: EMPTY_STUB_TAG, slug: 'placeholder' }];
  }
  return releases.map((r) => ({ tag: r.tag, slug: legacySlug(r) }));
}

export default async function LegacyReleasePage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { tag } = await params;
  const target = `../../../${encodeURIComponent(tag)}/`;
  return (
    <>
      <meta httpEquiv="refresh" content={`0; url=${target}`} />
      <main className="min-h-screen flex items-center justify-center bg-background">
        <p className="font-feed-body text-foreground-secondary">
          Redirecting to{' '}
          <a href={target} className="underline">
            {target}
          </a>
          …
        </p>
      </main>
    </>
  );
}
