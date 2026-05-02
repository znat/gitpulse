import { ImageResponse } from 'next/og';
import { notFound } from 'next/navigation';
import { loadStories, loadStoryByPrNumber } from '@/lib/stories-loader';
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

export function generateStaticParams() {
  return loadStories()
    .filter((s) => s.kind === 'pr' && typeof s.prNumber === 'number')
    .map((s) => ({
      number: String(s.prNumber),
      slug: storyPathSlug(s.headline),
    }));
}

export default async function OG({
  params,
}: {
  params: Promise<{ number: string; slug: string }>;
}) {
  const { number, slug } = await params;
  const story = loadStoryByPrNumber(Number(number));
  if (!story) notFound();
  if (slug !== storyPathSlug(story.headline)) notFound();

  const cat = primaryCategory(story);
  const refLabel =
    story.kind === 'pr' ? `PR #${story.prNumber}` : `commit ${story.sha.slice(0, 7)}`;
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
