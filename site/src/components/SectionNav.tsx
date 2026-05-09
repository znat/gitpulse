'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { basePath } from '@/lib/base-path';

const LINKS = [
  { href: '/', label: 'Latest', match: 'latest' as const },
  { href: '/releases/', label: 'Releases', match: 'releases' as const },
];

function activeKey(pathname: string): 'latest' | 'releases' | null {
  const hasBasePath =
    !!basePath &&
    (pathname === basePath || pathname.startsWith(`${basePath}/`));
  const stripped = hasBasePath
    ? pathname.slice(basePath.length) || '/'
    : pathname;
  if (stripped === '/' || stripped.startsWith('/page/')) return 'latest';
  if (stripped === '/releases' || stripped.startsWith('/releases/')) {
    return 'releases';
  }
  return null;
}

export function SectionNav() {
  const pathname = usePathname() ?? '/';
  const active = activeKey(pathname);
  return (
    <nav className="border-b border-border-light">
      <div className="max-w-[1200px] mx-auto px-6 flex items-center justify-center gap-6">
        {LINKS.map((link) => {
          const isActive = active === link.match;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`relative py-2.5 font-feed-mono text-[0.625rem] uppercase tracking-[0.15em] no-underline transition-colors duration-200 ${
                isActive
                  ? 'text-foreground'
                  : 'text-muted hover:text-foreground-secondary'
              }`}
            >
              {link.label}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-feed-gold" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
