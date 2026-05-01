import Link from 'next/link';

// v1 only has "Latest"; Releases + Stand-up will join later.
const LINKS = [{ href: '/', label: 'Latest', active: true }] as const;

export function SectionNav() {
  return (
    <nav className="border-b border-border-light">
      <div className="max-w-[1200px] mx-auto px-6 flex items-center justify-center gap-6">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`relative py-2.5 font-feed-mono text-[0.625rem] uppercase tracking-[0.15em] no-underline transition-colors duration-200 ${
              link.active
                ? 'text-foreground'
                : 'text-muted hover:text-foreground-secondary'
            }`}
          >
            {link.label}
            {link.active && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-feed-gold" />
            )}
          </Link>
        ))}
      </div>
    </nav>
  );
}
