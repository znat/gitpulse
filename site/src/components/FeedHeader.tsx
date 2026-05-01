interface FeedHeaderProps {
  feedTitle: string;
  feedSubtitle: string;
  date?: Date;
}

export function FeedHeader({ feedTitle, feedSubtitle, date }: FeedHeaderProps) {
  const displayDate = (date ?? new Date()).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <header className="pt-6 pb-10 px-6 text-center">
      <div className="font-feed-mono text-[0.625rem] uppercase tracking-[0.2em] text-muted mb-4">
        {displayDate}
      </div>

      <h1 className="font-feed-display font-semibold text-4xl md:text-5xl tracking-tight text-foreground mb-3">
        {feedTitle}
      </h1>

      <div className="font-feed-body text-base italic text-foreground-secondary mb-8">
        {feedSubtitle}
      </div>

      <div className="w-16 h-0.5 bg-feed-gold mx-auto" />
    </header>
  );
}
