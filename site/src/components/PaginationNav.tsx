import Link from 'next/link';

interface PaginationNavProps {
  olderHref?: string;
  newerHref?: string;
}

export function PaginationNav({ olderHref, newerHref }: PaginationNavProps) {
  if (!olderHref && !newerHref) return null;
  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between py-10 font-feed-mono text-[0.6875rem] uppercase tracking-[0.2em]"
    >
      <span className="flex-1">
        {newerHref && (
          <Link
            href={newerHref}
            rel="prev"
            className="text-feed-gold no-underline hover:underline"
          >
            ← Newer
          </Link>
        )}
      </span>
      <span className="flex-1 text-right">
        {olderHref && (
          <Link
            href={olderHref}
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
