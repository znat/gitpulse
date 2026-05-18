'use client';

// Client-side wrappers for the release illustrations. The image is rendered
// inside a decorative vignette+gold-accent container; on load failure we
// hide the whole container rather than leaving a broken-image icon framed
// by ornaments. Kept in its own file (with `use client`) so the parent
// `SpecialEditionCard` and `ReleaseEditionHero` stay server components.

import { useState } from 'react';
import Image from 'next/image';

interface ReleaseImageProps {
  url: string;
  tag: string;
}

// Card-sized illustration (homepage feed). Below the quip block, above the
// stats strip.
export function EditionIllustration({ url, tag }: ReleaseImageProps) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <div className="mb-6 -mx-2">
      <div className="relative overflow-hidden rounded-sm border border-border-light/50">
        <Image
          src={url}
          alt={`Editorial illustration for release ${tag}`}
          width={960}
          height={640}
          className="w-full h-auto object-cover"
          sizes="(max-width: 768px) 100vw, 640px"
          unoptimized
          onError={() => setFailed(true)}
        />
        {/* Vignette overlay for blending into the dark card */}
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_40px_rgba(0,0,0,0.3)]" />
        {/* Bottom gold accent line */}
        <div className="absolute bottom-0 left-[15%] right-[15%] h-px bg-gradient-to-r from-transparent via-feed-gold/30 to-transparent" />
      </div>
    </div>
  );
}

// Hero-sized illustration (release detail page). Eager-loaded — this is the
// LCP candidate on the route.
export function HeroIllustration({ url, tag }: ReleaseImageProps) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <div className="w-full max-w-[680px] mb-2 mt-8 relative">
      <div className="relative overflow-hidden rounded border border-border-light/40">
        <Image
          src={url}
          alt={`Editorial illustration for release ${tag}`}
          width={1536}
          height={1024}
          className="w-full h-auto object-cover"
          sizes="(max-width: 768px) 100vw, 680px"
          priority
          unoptimized
          onError={() => setFailed(true)}
        />
        {/* Soft vignette */}
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_60px_rgba(0,0,0,0.25)]" />
      </div>
      {/* Gold accent line flanking the image */}
      <div className="absolute -bottom-px left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-feed-gold/40 to-transparent" />
    </div>
  );
}
