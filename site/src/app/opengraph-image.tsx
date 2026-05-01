import { ImageResponse } from 'next/og';
import { loadRepo, publicationName, publicationSubtitle } from '@/lib/repo';

export const dynamic = 'force-static';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Gitpulse';

export default function OG() {
  const repo = loadRepo();
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
            fontSize: 22,
            letterSpacing: '0.32em',
            color: '#8a8780',
            textTransform: 'uppercase',
            display: 'flex',
            fontFamily: 'monospace',
          }}
        >
          Gitpulse
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div
            style={{
              fontSize: 76,
              lineHeight: 1.05,
              fontWeight: 700,
              letterSpacing: '-0.01em',
              display: 'flex',
            }}
          >
            {publicationName(repo)}
          </div>
          <div
            style={{
              fontSize: 32,
              fontStyle: 'italic',
              color: '#c8c5be',
              display: 'flex',
            }}
          >
            {publicationSubtitle(repo)}
          </div>
          <div
            style={{
              width: 96,
              height: 4,
              backgroundColor: '#b8860b',
              marginTop: 16,
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
          Development Activity Intelligence
        </div>
      </div>
    ),
    size,
  );
}
