import { ImageResponse } from 'next/og';
import { notFound } from 'next/navigation';
import { loadStories, loadStoryBySha } from '@/lib/stories-loader';
import {
  primaryCategory,
  categoryDisplayName,
  sizeLabel,
} from '@/lib/stories';
import { storyPathSlug } from '@/lib/urls';

export const dynamic = 'force-static';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'gitpulse story';

// Sentinel matching the page's stub when no stories exist yet.
const EMPTY_STUB_SHA = '__no_stories_yet__';
const EMPTY_STUB_SLUG = 'placeholder';

export function generateStaticParams() {
  // Skip OG generation when the publication is encrypted: the rendered PNGs
  // would be deleted post-build anyway, and AI-generated image features
  // (future) make rendering-then-deleting expensive. The stub satisfies
  // Next's `output: 'export'` requirement of a non-empty params list.
  if (process.env.GITPULSE_PASSWORD) {
    return [{ sha: EMPTY_STUB_SHA, slug: EMPTY_STUB_SLUG }];
  }
  const stories = loadStories().filter((s) => s.kind === 'direct-push');
  if (stories.length === 0) {
    return [{ sha: EMPTY_STUB_SHA, slug: EMPTY_STUB_SLUG }];
  }
  return stories.map((s) => ({ sha: s.sha, slug: storyPathSlug(s.headline) }));
}

export default async function OG({
  params,
}: {
  params: Promise<{ sha: string; slug: string }>;
}) {
  const { sha, slug } = await params;
  if (sha === EMPTY_STUB_SHA) notFound();
  const story = loadStoryBySha(sha);
  if (!story) notFound();
  if (slug !== storyPathSlug(story.headline)) notFound();

  const cat = primaryCategory(story);
  const refLabel = `commit ${story.sha.slice(0, 7)}`;
  const categoryLabel = cat ? categoryDisplayName(cat.key).toUpperCase() : 'STORY';

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
            <span>{categoryLabel}</span>
            <span style={{ color: '#8a8780' }}>·</span>
            <span style={{ color: '#8a8780' }}>{refLabel}</span>
            <span style={{ color: '#8a8780' }}>·</span>
            <span style={{ color: '#8a8780' }}>{sizeLabel(story.sizeAssessment)}</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div
            style={{
              fontSize: 64,
              lineHeight: 1.1,
              fontWeight: 700,
              letterSpacing: '-0.005em',
              display: 'flex',
            }}
          >
            {clamp(story.headline, 110)}
          </div>
          <div
            style={{
              fontSize: 28,
              fontStyle: 'italic',
              color: '#c8c5be',
              lineHeight: 1.45,
              display: 'flex',
            }}
          >
            {clamp(story.standfirst, 200)}
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
          }}
        >
          by @{story.author}
        </div>
      </div>
    ),
    size,
  );
}

function clamp(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
