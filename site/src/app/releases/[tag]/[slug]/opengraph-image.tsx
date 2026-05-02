import { ImageResponse } from 'next/og';
import { loadReleases, loadRelease } from '@/lib/releases-loader';
import { releaseSlug } from '@/lib/urls';

export const dynamic = 'force-static';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'gitpulse release edition';

// Sentinel matching the page's stub when no releases exist yet.
const EMPTY_STUB_TAG = '__no_releases_yet__';

export function generateStaticParams() {
  const releases = loadReleases();
  if (releases.length === 0) {
    return [{ tag: EMPTY_STUB_TAG, slug: 'placeholder' }];
  }
  return releases.map((r) => ({
    tag: encodeURIComponent(r.tag),
    slug: releaseSlug(r),
  }));
}

export default async function OG({
  params,
}: {
  params: Promise<{ tag: string; slug: string }>;
}) {
  const { tag } = await params;
  const release =
    tag === EMPTY_STUB_TAG ? null : loadRelease(decodeURIComponent(tag));
  if (!release) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            backgroundColor: '#0d0d0c',
            color: '#f0ede8',
            fontFamily: 'serif',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 48,
          }}
        >
          Not found
        </div>
      ),
      size,
    );
  }

  const dateStr = new Date(release.publishedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0d0d0c',
          color: '#f0ede8',
          fontFamily: 'serif',
          padding: '80px 100px',
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 18,
            letterSpacing: '0.2em',
            color: '#8a8780',
            textTransform: 'uppercase',
            fontFamily: 'monospace',
          }}
        >
          <div style={{ display: 'flex' }}>Gitpulse</div>
          <div style={{ display: 'flex', gap: 24, color: '#b8860b' }}>
            <span>{release.isPrerelease ? 'PRE-RELEASE' : 'RELEASE EDITION'}</span>
            <span style={{ color: '#8a8780' }}>·</span>
            <span style={{ color: '#8a8780' }}>{release.tag}</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div
            style={{
              fontSize: 56,
              lineHeight: 1.15,
              fontStyle: 'italic',
              letterSpacing: '-0.005em',
              display: 'flex',
            }}
          >
            “{clamp(release.quip || release.name || release.tag, 140)}”
          </div>
          <div
            style={{
              width: 96,
              height: 4,
              backgroundColor: '#b8860b',
              marginTop: 8,
            }}
          />
        </div>

        <div
          style={{
            fontSize: 18,
            letterSpacing: '0.18em',
            color: '#8a8780',
            textTransform: 'uppercase',
            fontFamily: 'monospace',
            display: 'flex',
            gap: 24,
          }}
        >
          <span>{release.prCount} PRs</span>
          <span>·</span>
          <span>{release.contributorCount} contributors</span>
          <span>·</span>
          <span>{dateStr}</span>
        </div>
      </div>
    ),
    size,
  );
}

function clamp(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
