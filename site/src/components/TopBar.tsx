'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';

interface TopBarProps {
  publicationName?: string;
  scrollThreshold?: number;
}

export function TopBar({ publicationName, scrollThreshold = 150 }: TopBarProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setIsScrolled(window.scrollY > scrollThreshold);
    }
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [scrollThreshold]);

  return (
    <header className="sticky top-0 z-50 bg-background">
      <div className="max-w-[1200px] mx-auto px-6 flex justify-between items-stretch h-12">
        <LeftSection publicationName={publicationName} isScrolled={isScrolled} />
        <RightSection />
      </div>

      <div
        className={`h-px bg-border-light transition-opacity duration-300 ${
          isScrolled ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div
        className={`absolute left-0 right-0 top-full h-4 pointer-events-none bg-gradient-to-b from-background to-transparent transition-opacity duration-300 ${
          isScrolled ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </header>
  );
}

function LeftSection({
  publicationName,
  isScrolled,
}: {
  publicationName?: string;
  isScrolled: boolean;
}) {
  const showPublicationName = isScrolled && !!publicationName;
  return (
    <div className="flex items-center gap-3 min-w-0">
      <Logo isScrolled={showPublicationName} />
      {publicationName && (
        <PublicationTitle name={publicationName} isVisible={showPublicationName} />
      )}
    </div>
  );
}

function RightSection() {
  return (
    <div className="flex items-center gap-3">
      <ThemeToggle />
    </div>
  );
}

function Logo({ isScrolled }: { isScrolled: boolean }) {
  return (
    <Link
      href="/"
      className={`self-center font-display font-bold text-lg tracking-tight text-muted no-underline hover:text-foreground hover:no-underline transition-all duration-300 ${
        isScrolled
          ? 'opacity-0 absolute -translate-y-2 pointer-events-none'
          : 'opacity-100'
      }`}
    >
      Gitpulse
    </Link>
  );
}

function PublicationTitle({ name, isVisible }: { name: string; isVisible: boolean }) {
  return (
    <div
      className={`flex items-baseline gap-3 self-center transition-all duration-300 ${
        isVisible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-2 pointer-events-none absolute'
      }`}
    >
      <Link
        href="/"
        className="font-display font-bold text-lg text-foreground no-underline hover:text-accent hover:no-underline transition-colors truncate"
      >
        {name}
      </Link>
      <span className="font-mono text-[9px] uppercase tracking-wider text-muted opacity-60 hover:opacity-100 transition-opacity hidden sm:inline-block">
        via gitpulse
      </span>
    </div>
  );
}
