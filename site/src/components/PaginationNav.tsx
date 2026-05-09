import Link from 'next/link';

interface PaginationNavProps {
  prevHref?: string;
  nextHref?: string;
}

export function PaginationNav({ prevHref, nextHref }: PaginationNavProps) {
  if (!prevHref && !nextHref) return null;
  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between py-10 font-feed-mono text-[0.6875rem] uppercase tracking-[0.2em]"
    >
      <span className="flex-1">
        {nextHref && (
          <Link
            href={nextHref}
            rel="prev"
            className="text-feed-gold no-underline hover:underline"
          >
            ← Newer
          </Link>
        )}
      </span>
      <span className="flex-1 text-right">
        {prevHref && (
          <Link
            href={prevHref}
            rel="next"
            className="text-feed-gold no-underline hover:underline"
          >
            Older →
          </Link>
        )}
      </span>
    </nav>
  );
}
