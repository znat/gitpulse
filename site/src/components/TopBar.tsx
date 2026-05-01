import Link from 'next/link';

export function TopBar() {
  return (
    <header className="sticky top-0 z-50 bg-background">
      <div className="max-w-[1200px] mx-auto px-6 flex justify-between items-center h-12">
        <Link
          href="/"
          className="font-feed-display text-lg tracking-tight text-muted no-underline hover:text-foreground transition-colors duration-300"
        >
          gitpulse
        </Link>
      </div>
      <div className="h-px bg-border-light" />
    </header>
  );
}
